# ADR-0002: Knowledge relationships và evidence trong Postgres

**Date:** 2026-10-27

**Status:** Accepted.

**Deciders:** Người dùng và Codex

## Context

Reuse Brief cần tổng hợp nhiều case có nguồn, điều kiện và kết quả khác nhau. Input theo mẫu cho phép tạo concepts/links xác định. MVP có corpus nhỏ, một workspace và cần giữ source sau khi case được chỉnh sửa.

## Decision

Dùng Supabase Postgres với revisions/sections bất biến, typed concepts/links, full-text + pgvector + RRF. Graph expansion là truy vấn quan hệ có giới hạn; citation gắn section/revision và source snapshot trong run.

Publish revision mới chỉ sau indexing hoàn tất; archive/supersede có semantics rõ. Template không khóa retrieval theo domain. Generated brief không tự biến thành historical case đã có outcome.

## Consequences

### Positive
- Một hệ thống persistence, quyền và transactions cho case/index/graph/evidence.
- Tái sử dụng recipe hybrid search chính thức và SQL/RLS.
- Review được nguồn trước/sau sửa case.

### Negative
- Phải quản lý publishing pointer, index status và historical snapshots.
- Graph schema/traversal có giới hạn, không phải graph platform tổng quát.

### Risks
- Shared concept bị hiểu như causal evidence: agent đọc nội dung và điều kiện; evaluation chứa weak matches.
- Semantic claim sai dù citation đúng: validator chỉ bảo đảm contract/provenance; manual/reference evaluation kiểm tra semantic support.
- Model/dimension thay đổi: release config + reindex trước khi chuyển query embedding.

## Alternatives considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Vector search thuần | Ít schema | Bỏ các quan hệ explicit và exact terminology | Dùng làm tín hiệu, không toàn bộ retrieval |
| Graph database riêng | Truy vấn graph chuyên dụng | Thêm service, auth và sync | Đánh giá khi traversal thực tế vượt khả năng SQL |
| QMD/GBrain nguyên stack | Nhiều khả năng đã có | Khác runtime/operation của web MVP | Học tư duy retrieval/provenance, không copy stack |

## Review triggers

Relationship traversal sâu/rộng thành bottleneck; corpus/ngôn ngữ làm hybrid recall không đạt; hoặc source ingestion cần pipeline chuyên dụng như LlamaIndex.
