# ADR-0003: Business harness với bounded AI SDK agent

**Date:** 2026-10-27

**Status:** Accepted.

**Deciders:** Người dùng và Codex

## Context

Người dùng yêu cầu foundation chuẩn hóa input, lập kế hoạch, truy xuất và chuẩn bị evidence trước reasoning. Agent cần nhiều lượt làm việc trên nhiều case, nhưng challenge chưa có workflow dài hoặc nhiều autonomous workers.

## Decision

Dùng một application harness gọi domain services, pre-retrieval và context builder, rồi chạy AI SDK `ToolLoopAgent` với ba typed tools. Services giống nhau cho preflight và tools. Harness sở hữu auth, invariants, deadline, registry, model/tool budgets, output checks và persistence.

Small model chỉ là optional schema-constrained query planner khi measurement chứng minh giá trị; mặc định tắt. Sáu reasoning steps và 90-second total deadline là baseline có thể tuning qua evaluation.

## Consequences

### Positive
- Model có context ban đầu và tools chuyên biệt thay vì tự xử lý plumbing.
- Quan sát được từng stage, nguồn, usage và failure.
- Business rules kiểm thử bằng deterministic tests; dùng SDK loop thay vì agent engine tự chế.

### Negative
- Request-driven execution không tự resume sau process failure.
- Pre-retrieval có thể lấy dư evidence; context budget và ablation cần đo.

### Risks
- Extra planner tăng latency/cost: tắt mặc định, so sánh trước khi bật.
- Loop limits không dừng call bị treo: timer/AbortSignal và server deadline riêng.
- Tool errors bị hiểu như không có dữ liệu: typed error channel và explicit partial/failure states.

## Alternatives considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Gửi request trực tiếp cho model | Ít orchestration | Thiếu chuẩn bị context và policy enforcement | Không chọn |
| Fixed retrieval → một generation | Dễ kiểm soát | Ít khả năng truy xuất bổ sung theo gap | Là baseline evaluation |
| LangGraph/durable multi-step workflow | Stateful checkpoints và resume | Thêm abstraction cho nhu cầu chưa có | Đánh giá lại khi cần durable execution |
| Multi-agent runtime | Chuyên môn hóa workers | Tăng coordination và latency | Chỉ mở khi có use case và lợi ích đo được |

## Review triggers

Nhu cầu resume/checkpoint được xác nhận; run thường xuyên vượt 90 giây; nhiều agent thực sự cải thiện evaluation; hoặc request-driven indexing/analysis không còn đáp ứng vận hành.
