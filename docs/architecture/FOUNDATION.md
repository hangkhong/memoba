# Architecture foundation

**System:** The Memory Bank

**Date:** 2026-10-27

**Status:** Foundation specification for written review; application implementation has not started.

## 1. Foundation principle

Một repo Next.js với module nghiệp vụ rõ ràng, dựa trên framework chính thức ở mỗi lớp. Application harness điều phối domain services, retrieval, context, model/tool budgets và output checks. AI SDK cung cấp agent loop; business logic và evidence contracts là phần riêng của Memory Bank.

Thiết kế sản phẩm, UX và acceptance nằm trong [MVP design spec](../superpowers/specs/2026-10-27-memory-bank-design.md).

Sơ đồ Pele: [deployment/components](diagrams/architecture.svg) và [harness flow](diagrams/harness.svg). Các file `.mmd` cạnh sơ đồ là source để chỉnh sửa/render lại bằng `pele-render`.

## 2. Framework ownership

| Lớp | Dùng sẵn | Memory Bank viết phần gì |
|---|---|---|
| App/backend | Next.js App Router, TypeScript, Node.js 24 | Pages và route handlers mỏng gọi application services |
| UI | shadcn/ui, Tailwind, Lucide | Ghép form, library, activity và brief/source panels |
| Forms/schema | React Hook Form, Zod, resolver chính thức | Hai template cố định và shared contracts |
| Identity | Supabase Auth + `@supabase/ssr` | Membership/workspace authorization theo operation |
| Persistence | `@supabase/supabase-js`, Supabase CLI migrations, generated DB types | Case revisions, SQL RPC và chính sách RLS |
| Retrieval | Postgres full-text, pgvector, Supabase hybrid-search recipe | Scope, ranking merge, graph expansion, provenance |
| Agent runtime | AI SDK 7 `ToolLoopAgent`, tool/schema/stream primitives | Request plan, instructions, allowed tools và budgets |
| Model access | AI Gateway qua AI SDK | Config reasoning/planner/embedding, capability probe và usage tracking |
| Progress/stream | AI SDK UI data streams và React bindings | Typed application events, trạng thái run và final brief |
| Tests | Vitest, AI SDK test helpers, Playwright | Contract, policy, SQL integration và critical E2E tests |
| Delivery | Vercel Git deployments, CLI, runtime logs | Runtime config, smoke check và rollback procedure |

Khởi tạo bằng `create-next-app` chính thức, sau đó thêm components bằng shadcn CLI; dùng hướng dẫn Supabase SSR chính thức cho browser/server clients. Giữ một package manager là npm và commit lockfile. Chọn stable release tương thích, không canary; AI SDK major 7, Node 24; exact versions được pin trong lockfile khi scaffold và kiểm tra build.

Không lắp toàn bộ chatbot starter có sẵn nếu nó kéo thêm database/auth stack khác. Starter chỉ cung cấp plumbing phù hợp; không lấy kiến trúc chat làm trung tâm cho sản phẩm form → analysis → brief.

## 3. Repo boundaries dự kiến

```text
src/
  app/                         # routes, layouts, server-rendered pages
    (auth)/
    (workspace)/cases/
    (workspace)/requests/
    (workspace)/briefs/
    api/analyses/
    api/cases/
    api/briefs/
  components/ui/               # components từ shadcn CLI
  modules/
    cases/                     # template schemas, forms, case service, repository
    knowledge/                 # search, graph expansion, evidence contracts
    analysis/                  # request plan, harness, agent, tools, activity
    briefs/                    # output schema, citation checks, edit/save
  lib/
    auth/                      # verified identity + workspace context
    supabase/                  # official browser/server clients + DB types
    ai/                        # SDK model configuration and embedding adapter
    config/                    # validated environment and limits
supabase/
  migrations/
tests/                         # critical integration and E2E scenarios
evals/                         # curated corpus, reference cases, reports
docs/
```

Đây là bản đồ trách nhiệm, không phải yêu cầu tạo hàng loạt file rỗng. Chỉ tách file khi đã có logic cần tách. Pure schemas và rules không import Next.js hoặc AI SDK. Server services/repositories dùng `server-only`; client không import model credentials hoặc database server clients.

Dependency direction: route/UI → application service → domain contracts/repository. Agent tools là adapters gọi knowledge service; knowledge service không import agent hoặc UI. Business rules không nằm trong prompts, route handlers hoặc components.

## 4. Contracts

### Request và planning

- `NormalizedRequest`: template key/version, title, objective, context, typed hard constraints, concept IDs, unknowns. Không chứa workspace do client tự quyết.
- `RequestContext`: verified user ID, workspace ID, knowledge version, request ID, deadline và limits. Server tạo; model không sửa.
- `RequestPlan`: tối đa ba subqueries, mỗi query có purpose `method`, `conditions` hoặc `exceptions`, cùng relevant concepts. Không sửa constraints gốc.
- Rules tạo default plan từ form. Optional small model chỉ đề xuất plan; validation sai hoặc timeout quay về default plan. Bật planner qua config sau comparison, không xây thêm autonomous planner agent.

### Evidence

`EvidenceItem`: evidence ID, case ID, revision ID, section key, excerpt/text, source kind, source metadata, concepts, retrieval path và knowledge version. Database/repository cấp ID và provenance; model không tạo nguồn mới.

`EvidenceBundle`: deduplicated items, câu hỏi có/thiếu evidence, retrieval warnings và context budget. Retrieval score là tín hiệu xếp hạng; không chuyển thành xác suất đúng của đề xuất.

`ToolResult`: success với items/empty/warnings, hoặc error với code/retryable. Không trả error dưới dạng empty items. Mọi kết quả mới được đăng ký vào run evidence registry.

| Tool | Input được model chọn | Invariants do service thực thi |
|---|---|---|
| `search_knowledge` | query, concept filters, purpose | User/workspace scope, active published revision, result caps, registry |
| `read_case` | Case ID, section keys | Authorization, revision đã pin trong run, explicit missing/archived state |
| `expand_relations` | Seed IDs, relation types | Cùng workspace, active target, 1 expansion step, visited-set và caps |

Không nhận `workspace_id`, SQL, table name hoặc tùy ý depth từ model. Per-run pin revisions cho các case đã thấy; nếu case bị archive trong lúc chạy, không tiếp tục dùng nó để tạo recommendation và ghi warning. Sau khi run hoàn tất, historical citation vẫn hiển thị theo quyền lịch sử đã quy định.

### Brief

`DraftBrief`: reusable approach, adjustments, risks/conflicts, unknowns, next steps và claim-level evidence references. Historical facts yêu cầu nguồn; proposal/inference có nhãn riêng và references hỗ trợ các premises.

`ValidatedBrief`: schema hợp lệ, citations thuộc registry và quyền hợp lệ; không dùng tên gọi này trong UI như bảo đảm semantic truth. Generated JSON được giữ; edits lưu JSON/text riêng và nhãn edited, không ghi đè nguồn ban đầu.

## 5. Harness execution

1. Xác thực, schema validation, idempotency check và admission control.
2. Persist run với deadline; cấp server context.
3. Chuẩn hóa request và tạo plan; optional planner trong giới hạn.
4. Execute initial hybrid search và relation expansion bằng knowledge service.
5. Assemble evidence bundle. Không có candidate sau tìm kiếm thành công thì persist gap report và kết thúc; retrieval failure thành lỗi.
6. Chạy AI SDK agent với request, constraints, bundle và tools. SDK quản lý loop; harness cấu hình context, tool availability và stop conditions.
7. Validate draft; một repair nếu còn ngân sách. Đảm bảo mandatory uncertainty/conflict fields luôn có trong schema.
8. Persist final brief/run usage, giải phóng lease và emit terminal event. Mỗi terminal path phải thực hiện cleanup; stale deadline xử lý worker chết đột ngột.

### Bounded execution

| Limit | Giá trị khởi đầu |
|---|---|
| Tổng server deadline | 90 giây, gồm planner/retry/repair |
| Reasoning model steps | 6 |
| Executed tool calls | 12 toàn lượt, kể cả nhiều calls/step |
| Optional planner / output repair | Mỗi loại tối đa 1 model call |
| Evidence context | Tối đa 12 sections và 8.000 estimated tokens |
| Candidates trong một run | Tối đa 40 section/revision IDs |
| Query plan | Tối đa 3 subqueries |
| Model response limit | Tối đa 2.000 output tokens/call, giới hạn theo model đã xác nhận |
| Graph | 1 expansion qua concept/direct link, có visited-set |
| Concurrent analyses | 2 run/workspace, DB-enforced admission lease |
| Transient tool retry | Tối đa 1/call nếu deadline còn đủ; retry tính trong tool budget |

AbortSignal và timeouts được truyền xuyên provider/repository calls. SDK stop conditions không thay thế timer cho call đang treo. Usage ghi sau từng response; không tuyên bố có hard monetary cap chỉ từ token estimator. Theo dõi credit/billing ở AI Gateway trước demo.

Các calls độc lập được chạy song song có giới hạn. Cache đầu tiên chỉ trong một run, theo workspace, normalized query, knowledge version và quyền đã xác thực; chưa thêm Redis/global response cache. Authenticated pages và analysis responses dùng private/no-store. Content hash giúp tái sử dụng embeddings đúng model/dimension khi nội dung không đổi.

## 6. Data model và SQL

| Entity | Vai trò / ràng buộc chính |
|---|---|
| `workspaces` | Demo workspace, knowledge version |
| `workspace_members` | Workspace + auth user unique; setup trước, không self-enroll |
| `cases` | Stable identity, template key, lifecycle, published revision pointer |
| `case_revisions` | Case snapshot, author/date, template/domain fields, index status; unique case/revision |
| `case_sections` | FK revision, section key/text, full-text, embedding + model metadata; unique revision/section |
| `concepts` | Canonical type/label/aliases trong workspace; danh mục seed |
| `revision_concepts` | Revision → concept, relation type; unique mapping |
| `case_links` | Typed source/target relation + reason; same-workspace integrity |
| `analysis_runs` | Input, state, deadline/lease, events, evidence registry/snapshot, usage, errors, idempotency |
| `briefs` | FK run, original generated output, edited output và save state |

Publish revision, archive/link update và admission control là RPC có transaction; các thao tác ghi không được phân tán thành chuỗi client writes có thể dở dang. Content revisions bất biến; việc cập nhật index status không sửa nội dung source. Dùng generated Supabase DB types, không duy trì ORM schema thứ hai.

SQL có parameterized inputs, scope predicate và RLS. Thường dùng security-invoker; nếu cần definer cho operation riêng, phải có fixed search path, quyền execute tối thiểu và kiểm tra membership bên trong. Chỉ số cho workspace/FKs/status, unique constraints và FTS được tạo cùng migration; vector-index strategy benchmark theo corpus, không bắt buộc HNSW cho 24 cases.

Chọn embedding model và dimension bằng capability probe trước migration/seed. Release config lưu model ID/version/dimension; embedding model mới phải reindex và publish index mới trước khi chuyển query model. Không trộn vectors từ hai không gian embedding.

## 7. HTTP và UI transport

| Endpoint | Contract |
|---|---|
| `POST /api/cases` | Validated case input → case/revision IDs + saved/index status; bounded indexing attempt |
| `PATCH /api/cases/:id` | Tạo revision từ validated update; không ghi đè published content |
| `POST /api/cases/:id/revisions/:revisionId/reindex` | Retry đúng revision; idempotent upsert/index/publish |
| `POST /api/cases/:id/archive` | Archive trong scope, tăng knowledge version |
| `GET /api/cases/:id` | Case detail và authorized revision metadata, kèm concepts/links |
| `POST /api/analyses` | Structured request + idempotency key → AI SDK UI data stream; first event có run ID |
| `GET /api/analyses/:id` | Authorized state, real events, warnings và final result nếu có |
| `GET /api/briefs/:id` | Authorized original/edited brief; source text chỉ trả sau kiểm tra quyền |
| `PATCH /api/briefs/:id` | Validated edit/save action → saved version và edited provenance |

Các page đọc dữ liệu qua server services; không cần thêm GET endpoint trùng lặp cho mọi query. Template catalogue được export từ typed definitions, không tạo schema-builder API.

Duplicate analysis key trả `409` kèm authorized existing run ID để client chuyển sang đọc trạng thái; không chạy model lần hai. Hết concurrent quota trả `429` với retry guidance; payload sai trả `400`; unauthenticated `401`; resource ngoài scope trả `404` nhất quán.

Dùng AI SDK UI custom data stream primitives/React transport theo docs của phiên bản đã cài, không tự tạo SSE engine. Request UI vẫn là form; progress được render như activity timeline. Metadata có event type, stage, timestamp, source IDs và summary ngắn; không stream raw chain-of-thought hoặc secrets.

Không hứa resume generation sau reload. Refresh lấy state đã persist. Khi disconnect được nhận diện thì abort; nếu worker biến mất, deadline giúp xác định expired run và user có thể chủ động retry bằng request ID mới.

## 8. Runtime, security và integrations

- Node.js 24, ESM, default Node runtime trên Vercel. Platform function duration cho analysis tối thiểu 120 giây để chứa internal 90-second deadline và cleanup.
- Supabase Auth dùng cookie SSR clients chính thức. Verify identity server-side bằng phương thức Supabase hướng dẫn; không tin session object từ client hoặc chỉ dựa vào proxy refresh.
- Mọi operation kiểm tra membership; SQL/RPC cũng áp RLS. Runtime dùng user-scoped client; privileged credentials chỉ dành migration/seed ở môi trường kiểm soát, không gửi vào tools.
- Model không có write tool, arbitrary SQL, shell hoặc external browser access. Case content và source URLs là untrusted data; không fetch URL, không thực thi embedded instructions.
- Same-origin checks cho cookie-authenticated writes; validated inputs và query parameters. Rich text từ model được render qua structured UI/escaped text, không raw HTML.
- Source URL chỉ nhận `https`/`http`; không auto-fetch. Sign-up công khai không cấp membership vào workspace demo; danh sách demo members được setup trước.
- Secrets chỉ server env. Structured logs dùng run IDs, durations, counts, codes và usage; không log toàn case/request/prompt hoặc credentials.
- Không cache authenticated responses công khai. Membership bị thu hồi chặn run events, saved snapshots và source details.

Provision Supabase thật và AI Gateway access trước tích hợp code theo Vercel Marketplace flow. Không tạo runtime mock fallback. Credential/billing/provider access là điều kiện setup bên ngoài; kiến trúc không cần giả định người dùng đã cấp.

Validated env groups: public Supabase URL/publishable key; server AI Gateway credential khi cần cho local; reasoning model ID; optional planner flag/model ID; embedding model ID/dimension; harness limits. App fail clearly khi thiếu required config; không in giá trị secrets. Vercel CLI nên cài bằng `npm i -g vercel`, dùng env pull/deploy/logs khi đến implementation.

## 9. Testing và operations

- Vitest: normalization, immutable constraints, query planning/fallback, deduplication/caps, citation registry, budgets/cleanup và state transitions. AI SDK official test providers cho deterministic orchestration tests.
- Supabase integration: RLS/RPC trên workspace/member khác, publishing atomic, reindex idempotency, active/published filtering, graph caps/cycle checks và leases.
- Playwright: login → create case → analyze → inspect citation; indexed-error/retry và missing-evidence flow. Không viết test cho từng component shadcn được copy nguyên.
- Live-model evaluation: 24-case corpus, 12 requests và so sánh harness theo spec. Mock tests không thay thế evaluation.
- CI foundation: install bằng lockfile, lint, typecheck, meaningful tests và production build; SQL integration cần isolated test environment đã provision.

Deploy bằng Vercel Git integration/CLI; Supabase schema có migration history. Forward-only additive migrations trước app rollout; rollback app về deployment trước, không tự drop dữ liệu/revisions. Breaking schema change yêu cầu một bước tương thích trước khi dọn cột cũ.

Runtime logs và run records đủ cho MVP: duration từng stage, token usage/model IDs, tool calls, candidate/evidence counts, warnings và terminal state. Activity UI dựa vào các records này; success log chỉ sau validate/persist.

## 10. Growth milestones và trade-offs

| Envelope | Nút thắt dự kiến / phản ứng |
|---|---|
| MVP: 1–5 demo users, 24–100 cases | Bounded request-driven work; người dùng retry thủ công nếu run không hoàn tất |
| ~1.000 cases, nhập liệu thường xuyên | Đánh giá durable indexing/jobs từ framework sẵn có nếu không còn vừa request; benchmark indexes và language retrieval |
| ~10.000 cases hoặc nhiều workspace hoạt động | Đo recall/latency/quota; xem xét reranker, incremental graph/index, durable analysis và isolation theo bottleneck |

Các mốc là planning scenarios, không phải capacity guarantee. Chưa thêm distributed job system, graph database, multi-agent runtime hoặc microservices khi chưa có nhu cầu đo được.

Các trade-off được ghi ở [ADR-0001](adr/0001-framework-first-single-app.md), [ADR-0002](adr/0002-postgres-knowledge-evidence.md) và [ADR-0003](adr/0003-bounded-harness-ai-sdk.md).

## 11. References

- [Next.js starter](https://nextjs.org/docs/app/getting-started/installation)
- [shadcn form recipe](https://ui.shadcn.com/docs/forms/react-hook-form)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [hybrid search](https://supabase.com/docs/guides/ai/hybrid-search)
- [AI SDK agent](https://ai-sdk.dev/docs/agents/building-agents), [loop control](https://ai-sdk.dev/docs/agents/loop-control), [testing](https://ai-sdk.dev/docs/ai-sdk-core/testing)
- [Next.js/Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [AI Gateway models](https://vercel.com/docs/ai-gateway/models-and-providers)
