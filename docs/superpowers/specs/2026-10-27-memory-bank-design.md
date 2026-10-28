# The Memory Bank — MVP design

**Ngày:** 2026-10-27

**Tác giả:** Codex cùng người dùng

**Trạng thái:** Đã duyệt. Plan local v0 đang chờ review sau cập nhật native Supabase.

**Bối cảnh:** Một PM tự build trong 7 ngày; một workspace demo và hai template.

## 1. Problem statement

Đội ngũ giải quyết lại vấn đề đã từng xử lý vì kinh nghiệm nằm rải rác trong tài liệu và trí nhớ cá nhân. Khi nhận việc mới, họ cần biết các tiền lệ liên quan, kết quả trước đây và khác biệt khiến lần này cần xử lý khác.

MVP biến các case có cấu trúc thành knowledge có liên kết. Một application harness chuẩn hóa yêu cầu, truy xuất và chuẩn bị evidence; reasoning agent tổng hợp nhiều nguồn thành Reuse Brief kiểm tra được.

Đơn vị giá trị là kinh nghiệm có thể vận dụng, không phải một kết quả tìm kiếm khớp 100%. Một yêu cầu có thể cần cách làm từ case A, điều kiện từ B và bài học thất bại từ C.

## 2. Users, use cases và success

| Người dùng | Yêu cầu mới | Knowledge cần tái sử dụng |
|---|---|---|
| Product/Delivery | Tính năng, thay đổi, dự án | Giải pháp, quyết định, điều kiện triển khai, kết quả |
| CS/Operations | Vấn đề khách hàng, onboarding, ngoại lệ | Hướng xử lý, ràng buộc, kết quả, bài học |

Agency/consulting có thể dùng cùng cơ chế; không thêm template thứ ba trong MVP.

Người dùng phải xác định được phần có thể tái sử dụng, điều cần điều chỉnh, nguồn hỗ trợ và thông tin còn thiếu. Brief là đề xuất cho yêu cầu hiện tại; không tự trở thành kinh nghiệm đã được xác nhận.

## 3. Scope

### Có trong MVP

- Một workspace demo có đăng nhập, thành viên được thiết lập trước; không có flow tạo tổ chức hoặc mời thành viên.
- Hai template cố định trong code: Product/Delivery và CS/Operations; cùng core schema, có domain fields riêng.
- Nhập, sửa, đọc, lưu trữ case; tìm kiếm, lọc và xem liên kết.
- Nhập yêu cầu mới theo mẫu: objective, context, hard constraints, concepts và unknowns.
- Chat là điểm vào chính, có sidebar và conversation nhiều lượt; Knowledge Hub quản lý case qua hai template.
- Hybrid retrieval, mở rộng quan hệ và một reasoning agent với tools có contract.
- Activity từ sự kiện thực tế; Reuse Brief có trích dẫn section/revision, chỉnh sửa văn bản và lưu.
- Validation, quyền truy cập, provenance, xử lý lỗi và bộ đánh giá demo.

### Để giai đoạn sau

Template builder; connector Drive/Slack; upload/OCR/parse tài liệu; free-prompt intake; agent nhập liệu; graph editor/explorer; workflow nhiều agent; billing; realtime collaboration; tự động thực thi đề xuất.

Nguồn ngoài trong MVP là metadata và URL tham chiếu. Hệ thống không crawl URL hoặc gửi file gốc cho model. Bằng chứng dùng để suy luận là nội dung case đã lưu, có tác giả và thời điểm; tài liệu ngoài chưa được đọc không được coi là đã xác minh.

## 4. Proposed architecture

Một app Next.js/TypeScript trên Vercel, với Supabase Auth/Postgres/pgvector và Gemini API trực tiếp. Các module nghiệp vụ trong cùng app; tools gọi đúng các service mà pre-retrieval sử dụng.

Chi tiết framework, repo structure, contracts, security và deployment ở [FOUNDATION.md](../../architecture/FOUNDATION.md). Sơ đồ [harness](../../architecture/diagrams/harness.svg) được render bằng Pele từ [source](../../architecture/diagrams/harness.mmd).

### Component responsibilities

| Module | Trách nhiệm |
|---|---|
| Auth/workspace | Xác thực, membership, quyền theo operation |
| Case service | Template validation, revisions, publishing/indexing, archive |
| Knowledge service | Search, đọc evidence, traversal có giới hạn |
| Request planner | Giữ nguyên mục tiêu/constraints, tạo các câu hỏi retrieval |
| Context builder | Khử trùng, nguồn/revisions, giới hạn context, ghi nhận coverage |
| Analysis harness | Điều phối stages, deadline, model/tool budgets, activity và lỗi |
| Reasoning agent | Đối chiếu applicability, tổng hợp nhiều nguồn, yêu cầu evidence bổ sung |
| Brief service | Kiểm tra output/citations, lưu bản generated và edited riêng |

### Hai data flows

**Lưu case:** auth → schema validation → lưu revision bất biến → batch embeddings cho sections → kiểm tra đủ index → publish revision bằng transaction. Revision chưa ready không xuất hiện trong retrieval. Khi sửa, revision đang published vẫn hoạt động tới khi bản thay thế ready; UI hiển thị rõ pending update. Lỗi index giữ dữ liệu và cho retry idempotent.

**Xử lý yêu cầu:** auth → normalized request → request plan → initial retrieval → evidence context → reasoning agent/tool loop → output validation → persist result → Reuse Brief. Nếu retrieval thành công nhưng không có candidate, trả gap report. Nếu retrieval lỗi, trả lỗi thay vì giả thành không có evidence.

## 5. Knowledge model

Case core fields: title, problem/objective, context, constraints, approach/reasoning, observed outcome, lessons/applicability, source metadata và concepts. Outcome là `achieved`, `not_achieved` hoặc `unknown`; không suy ra thành công từ trường trống.

Domain fields cố định:

- Product/Delivery: deliverable, change scope, deployment conditions.
- CS/Operations: customer impact, handling conditions, escalation notes.

Sections là đơn vị retrieval/citation; dùng section key ổn định trong mỗi revision. Không bắt buộc tách từng câu thành một graph node. Các giới hạn field và concept nằm trong [system contracts](../../reference/system-contracts.md).

Concept types: `problem_type`, `system`, `approach`, `constraint`. Liên kết case-concept có relation type tương ứng. Direct case links có ba loại: `related_to`, `contrasts_with`, `supersedes`; người nhập khai báo lý do. Không coi liên kết hoặc shared concept là bằng chứng tự thân cho applicability hay quan hệ nhân quả.

Template là hướng dẫn nhập, không phải hard filter domain. Product và CS có thể bổ trợ evidence cho nhau trong cùng workspace.

### Revisions và hiệu lực

- Case có published revision pointer và lifecycle `active`/`archived`.
- Nội dung revision bất biến; trạng thái indexing và pointer cập nhật có kiểm soát.
- Publish một revision mới làm tăng knowledge version của workspace; archive và cập nhật link cũng vậy.
- `supersedes` chỉ thành quan hệ mô tả cho tới khi service xác nhận target cần archive trong cùng transaction; UI cho người dùng chọn rõ hành động này. Source và target phải khác nhau, cùng workspace; không tạo chu trình supersedes.
- Retrieval mới chỉ đọc revisions đã published của active cases, trong scope của người dùng.
- Historical brief giữ section/revision/excerpt snapshot; quyền đọc vẫn được kiểm tra khi mở. Case archived vẫn xem được như lịch sử nếu membership còn hợp lệ, nhưng không được đưa vào lượt tìm kiếm mới.

## 6. Harness và model responsibilities

### Request planning

Form xác định mục tiêu, constraints và unknowns. Harness tạo mặc định ba nhóm retrieval: phương pháp, điều kiện áp dụng và failure/exception. Query kết hợp mô tả vấn đề với concepts đã chọn.

Nếu phần mô tả cần phân tách ngữ nghĩa, optional small-model planner đề xuất tối đa ba subqueries theo schema. Mặc định planner tắt ở cấu hình demo; chỉ bật sau khi comparison cho thấy có lợi. Nó không sửa hard constraints, membership, allowed tools hoặc limits. Plan sai schema được bỏ và dùng kế hoạch từ form; không chặn luồng chỉ vì planner lỗi.

### Retrieval và context

- Keyword search theo PostgreSQL full-text kết hợp pgvector và RRF; dùng recipe chính thức Supabase, không triển khai search engine riêng.
- Với corpus Việt/Anh, bắt đầu bằng cấu hình text-search `simple`, concept labels/aliases chuẩn hóa và multilingual embeddings. Không giả định stemming tiếng Anh phù hợp tiếng Việt; đo retrieval trên ngôn ngữ demo.
- Initial retrieval và agent tools dùng chung service. Bắt đầu từ tối đa 12 candidate sections, mở rộng một lượt qua shared concept hoặc direct case link; khử trùng và giới hạn toàn lượt 40 candidates.
- Evidence context tuân theo [execution limits](../../reference/system-contracts.md#limits). Gắn excerpt, section/revision ID, source type và retrieval reason. Tối đa một bản full section cho mỗi ID/revision trong bundle.
- Chừa chỗ cho counterexamples nếu truy xuất được; coverage ghi lại nhóm câu hỏi nào có/thiếu evidence, không xuất confidence percentage chưa hiệu chỉnh.
- Tool trả kết quả mới phải được đăng ký vào evidence registry của run trước khi model có thể trích dẫn.

### Agent/tool execution

Một AI SDK `ToolLoopAgent` có ba tools `search_knowledge`, `read_case`, `expand_relations`. [System contracts](../../reference/system-contracts.md#limits) quy định giới hạn model, tools, planner, repair và deadline. Harness thực thi giới hạn trên toàn lượt, kể cả retry; các call cũng nhận timeout và response limits.

Model output là draft theo schema: đề xuất, phần tái sử dụng, adjustments, risks/conflicts, unknowns, next steps và evidence references. Dữ kiện quá khứ phải có sources; phương án kết hợp được đánh dấu inference/proposal. Text trong case được coi là dữ liệu, không phải chỉ dẫn để đổi tools, quyền hoặc quy trình.

### Output validation

Validator kiểm tra schema, evidence registry, section/revision IDs, quyền truy cập và sự hiện diện của references cho historical claims. Ràng buộc có cấu trúc được giữ riêng khỏi text sinh ra; chỉ những vi phạm có thể so sánh máy móc mới được phát hiện bằng code. Semantic support và tính phù hợp của đề xuất cần bộ evaluation; ID hợp lệ không chứng minh kết luận đúng.

Nếu invalid: sửa tối đa một lần trong ngân sách còn lại, sau đó fail rõ ràng. User edits lưu riêng và có nhãn đã chỉnh sửa; không kế thừa ngầm nhãn validated của bản generated. Chỉ có outcome do người dùng ghi nhận mới được đưa vào lịch sử case.

## 7. UX

1. Sidebar: New chat, conversations, Knowledge Hub và tài khoản. Mobile dùng drawer; Chat là trang mặc định.
2. Chat composer: câu hỏi cùng Request details chứa context, template, constraints, concepts và unknowns. Structured intake được giữ ngay trong chat.
3. Conversation: lưu các lượt và request snapshots. Follow-up dùng context người dùng xác nhận; mỗi attempt có run và brief riêng. Diễn giải tham chiếu tới đề xuất trước để feature branch sau.
4. Knowledge Hub: search/filter, outcome và index status; nhập/dán case theo hai template, xem nguồn, revisions, concepts và links. Saved chưa đồng nghĩa với published ready.
5. Activity: intake, planning, retrieval, context, reasoning, validation và completion/failure. Sự kiện từ backend; không dựng narrative suy nghĩ giả.
6. Brief xuất hiện trong assistant turn, với reusable approach, adjustments, conflicts, unknowns, next steps và citations theo lượt. Bản edited lưu riêng.

Visual prototype chỉ minh họa UX bằng dữ liệu giả định. App implementation dùng shadcn/ui và React Hook Form; không sao chép HTML prototype thành component framework tự chế.

## 8. Failure handling

| Tình huống | Hành vi |
|---|---|
| Form sai hoặc thiếu required fields | Chỉ rõ field, không chạy model |
| Index pending/failed | Giữ case; báo published revision nào còn hiệu lực; retry revision idempotent |
| Không có candidates sau retrieval thành công | Gap report và đề nghị dữ kiện/knowledge cần bổ sung |
| Evidence yếu hoặc thiếu facts | Brief có điều kiện, unknowns rõ ràng |
| Evidence mâu thuẫn | Trình bày cả hai phía và điều kiện; không tự chọn nguồn mới nhất là đúng |
| Transient tool error | Một retry nếu deadline cho phép; sau đó lỗi/partial rõ ràng |
| Deadline/budget exhausted | Terminal status, không đánh dấu incomplete brief là hoàn tất |
| Output invalid | Một repair có giới hạn, rồi fail rõ ràng |
| Mất kết nối client | Abort khi nhận disconnect; refresh đọc trạng thái run đã lưu, không hứa tự resume workflow |
| Worker kết thúc đột ngột | Run quá deadline được coi là timed out khi đọc/reconcile; không giữ trạng thái running vĩnh viễn |
| User mất membership | Chặn đọc brief, events và snapshot; không lộ source text qua cache |

## 9. Testing và acceptance

Corpus: 24 case giả định được ghi nhãn, 12 Product/Delivery và 12 CS/Operations, gồm success/failure/unknown, weak matches, conflicting và superseded/archived cases. Evidence reference set được biên tập/review, không dùng model tự sinh làm ground truth duy nhất.

12 yêu cầu: 4 Product, 4 CS, 2 cross-domain/relation expansion, 1 conflicting precedents và 1 no-precedent. Mỗi yêu cầu có required facets, expected/acceptable sources, hard constraints, expected gaps và forbidden conclusions.

Acceptance targets:

- Tất cả deterministic checks về RLS, schema, citations/revisions, limits, unpublished/archived exclusion và idempotent retry phải pass.
- Ít nhất 10/12 yêu cầu đáp ứng các facets cần thiết với sources phù hợp; no-precedent pass bằng gap report chính xác.
- Không có material historical claim không được nguồn hỗ trợ hoặc outcome/metric bị bịa trong bản demo được duyệt. Tất cả hard constraints và các conflict/missing facts cài trong bộ kiểm chứng được giữ/nhận diện.
- Mỗi yêu cầu chạy hai lần: ít nhất 20/24 run hoàn tất trong 60 giây; các run khác kết thúc rõ ràng trong 90 giây. Đây là mục tiêu của suite nhỏ, không phải production SLO.
- Source inspection vẫn có ý nghĩa sau sửa case, không lộ snapshot khi quyền bị thu hồi.

Vitest kiểm tra business logic và AI SDK test helpers; integration tests kiểm tra SQL/RLS trên Supabase test environment; Playwright kiểm tra một số luồng end-to-end trọng yếu. Model mocks chỉ dùng trong tests, không làm runtime fallback cho app thiếu tích hợp thật.

So sánh 4 yêu cầu đại diện với cùng model và context budget: basic hybrid retrieval vs thêm relationship expansion/context assembly. Ghi useful evidence, unsupported claims, latency và token usage. Nếu bật planner, so sánh thêm enabled/disabled. Kết quả chỉ mô tả bộ mẫu đã đo.

## 10. Scale, operations và accepted trade-offs

MVP là demo có thể vận hành với dịch vụ thật; không cam kết SLA doanh nghiệp. Planned envelope: 1 workspace, 1–5 người dùng demo, 24–100 cases và tối đa 2 analysis run đồng thời/workspace. DB lease/admission control thực thi hạn mức; client không tự quyết.

| Mốc | Thay đổi dựa trên đo thực tế |
|---|---|
| MVP, tới 100 cases | Một app, managed DB, bounded request-driven indexing/analysis |
| Khoảng 1.000 cases hoặc indexing không còn vừa request | Đưa indexing sang durable jobs theo framework đã có; batch/retry/lease, benchmark vector indexes |
| Khoảng 10.000 cases hoặc nhiều workspace hoạt động đồng thời | Đánh giá durable analysis, incremental indexing, reranking, quota và partition/index tuning; chỉ tách service khi có bottleneck đo được |

Framework-first không loại bỏ business logic. Dùng framework cho agent loop, forms, auth, persistence và testing; chỉ viết logic domain cần thiết trong modules rõ trách nhiệm. Dùng Supabase SDK/SQL migrations, không thêm ORM thứ hai; dùng Postgres relationships, không thêm graph database.

Provision Supabase và Gemini API thật trước implementation tích hợp. Các model IDs và embedding dimension là cấu hình release phải được xác nhận bằng capability probe trước khi seed; migration và embedding config phải khớp, không thay dimension/model mà không reindex. Missing config khiến feature unavailable với lỗi rõ, không trả mock response.

Vercel Hobby chỉ dùng nếu phù hợp điều kiện personal/non-commercial của challenge. Supabase Free có giới hạn dung lượng và inactivity; chi phí LLM/embedding tách riêng. Không provision paid resource hoặc công bố production-ready chỉ từ kết quả suite demo.

## 11. Delivery sequence

Ngày 1: scaffold framework chính thức, config, auth, migrations và case validation. Ngày 2: revisions, publishing/indexing và case forms. Ngày 3: hybrid search, graph expansion, evidence contracts. Ngày 4: harness, initial context, tools và validation. Ngày 5: brief/source UX và actual activity. Ngày 6: corpus, evaluation và failure paths. Ngày 7: sửa lỗi, deploy, chạy demo và ghi measured results.

Đây là thứ tự ưu tiên. [Plan local v0](../plans/2026-10-27-local-v0.md) chia implementation thành các bước kiểm chứng, dùng Supabase native trước khi tích hợp hosted deployment.

## 12. Sources và design decisions

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [shadcn/ui + React Hook Form + Zod](https://ui.shadcn.com/docs/forms/react-hook-form)
- [AI SDK agents](https://ai-sdk.dev/docs/agents/building-agents), [loop control](https://ai-sdk.dev/docs/agents/loop-control), [testing](https://ai-sdk.dev/docs/ai-sdk-core/testing)
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [hybrid search](https://supabase.com/docs/guides/ai/hybrid-search)
- [QMD](https://github.com/tobi/qmd): tham khảo hybrid retrieval và context; không sao chép local inference stack.
- [GBrain](https://github.com/garrytan/gbrain): tham khảo provenance, corrections và connected knowledge; không sao chép daemon/maintenance stack.
- [Anthropic: workflows và agents](https://www.anthropic.com/research/building-effective-agents)
- [Supabase pricing](https://supabase.com/pricing), [Vercel Hobby](https://vercel.com/docs/plans/hobby)

Những lựa chọn về schema, budgets, UX và acceptance là quyết định thiết kế cho challenge này, không phải bảo đảm chất lượng do các framework cung cấp.
