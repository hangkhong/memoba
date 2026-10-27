# Architecture review

**Date:** 2026-10-27

**Scope:** MVP design spec, architecture foundation, ADR-0001–0003 và sơ đồ Pele.

**Type:** Design self-review; không phải kết quả kiểm thử hoặc code review ứng dụng.

## Critical

Không còn critical finding trong bản thiết kế đã rà soát. Kết luận này chỉ áp dụng tài liệu; implementation phải thực thi và kiểm chứng các invariants.

## Warning — trade-offs accepted

1. **Request-driven analysis/indexing:** model/provider I/O nằm trên đường xử lý tương tác và không có durable resume. Chấp nhận cho corpus demo nhỏ; timeout/AbortSignal, lease deadline, lưu trạng thái và retry thủ công. Chuyển sang durable framework khi đo thấy thường xuyên vượt budget hoặc cần resume.
2. **Semantic support không được chứng minh bằng citation IDs:** validator giữ contract/provenance, không chứng minh suy luận đúng. Acceptance có reference evidence và review material claims; không quảng bá validation như confidence score.
3. **Optional planner là chi phí bổ sung:** mặc định tắt, schema-constrained fallback và comparison trước khi bật. Deadline/usage tính cả planner, không chỉ agent loop.
4. **Một DB/provider là điểm phụ thuộc:** không thêm multi-region/provider orchestration cho 7 ngày. Fail rõ ràng, bounded retries và app rollback; không cam kết SLA hoặc runtime mock fallback.
5. **Cấu hình model khi release:** IDs và embedding dimensions phải qua live capability probe, migration/index phải khớp. Đây là setup gate khi tích hợp, không phải giả định model bất kỳ đều hoạt động.

## Checklist results

| Nhóm | Kết quả thiết kế |
|---|---|
| Modularity | App adapters → application services → domain/repository; tools không sở hữu bản sao business logic |
| Contracts | RequestPlan, EvidenceItem/Bundle, ToolResult và DraftBrief; provenance/caps/errors rõ |
| Data integrity | Immutable content revisions, atomic publish pointer, idempotent indexing, graph integrity |
| Security | Server identity/membership + RLS/RPC; no model-controlled workspace/SQL; snapshots và logs có scope |
| Failure handling | Empty vs error, pending index, one repair, retry budget, timeout/disconnect/stale lease |
| Performance | Write-time embeddings, bounded batch retrieval, per-run cache, context limits và đo stage latency |
| Scalability | Planning envelopes MVP/~1.000/~10.000 cases; durable jobs được thêm theo nhu cầu đo được |
| Maintainability | Framework ownership rõ; không thêm ORM/graph DB/multi-agent layer chưa cần |
| Testing | Unit contracts, SQL/RLS integration, critical E2E và live-model evaluation tách biệt |
| Operations | Provision thật, fail rõ khi thiếu config, lockfile/build CI, migrations và rollback tương thích |

## Spec self-review

- Không có placeholder hoặc mục chưa định nghĩa bị dùng làm requirement implementation.
- Giữ input theo mẫu và hai template; ví dụ free prompt không làm mở scope.
- Domain không bị dùng làm hard boundary cho retrieval; workspace/access mới là boundary.
- Revisions đang pending không thay nội dung published; historical citations giữ source version.
- Historical archived sources có thể đọc theo quyền, nhưng không được dùng trong retrieval mới.
- Trạng thái output validation và semantic quality được phân biệt; edits giữ provenance riêng.
- Tất cả run budgets gồm planner/tool retries/repair và cleanup; mọi terminal path có trạng thái.
- Prototype chỉ minh họa, mocks chỉ dùng trong tests; không có tuyên bố đã provision hoặc đã chạy app.
- Scope đủ gọn cho một implementation plan; chỉ có một app/runtime và một managed DB.

## Follow-through

Written review của design spec là bước tiếp theo theo skill brainstorming đã được người dùng yêu cầu. Sau đó viết implementation plan, provision dịch vụ và triển khai theo foundation. Không cần mở lại lựa chọn UX hoặc phỏng vấn lại các yêu cầu đã chốt.
