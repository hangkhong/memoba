# ADR-0001: Framework-first, một app TypeScript

**Date:** 2026-10-27

**Status:** Accepted in discussion; written specification pending review.

**Deciders:** Người dùng và Codex

## Context

Một PM cần hoàn thành challenge trong 7 ngày. UI đã được duyệt về luồng; người dùng yêu cầu dùng shadcn/ui và ưu tiên framework có sẵn để build ổn định. Tự xây auth, component primitives hoặc orchestration framework làm tăng phần việc không trực tiếp tạo giá trị.

## Decision

Dùng Next.js App Router/TypeScript trên Vercel, shadcn/ui, React Hook Form/Zod, Supabase SDK/SSR và AI SDK 7. Một repo/app với domain modules; starter và components từ công cụ chính thức, npm lockfile, stable versions và Node 24.

Framework phụ trách plumbing. Business services giữ logic case, eligibility, evidence, traversal và request budgets. Dùng Supabase CLI migrations/generated types; không thêm ORM hoặc API framework chỉ để bọc các API đã có.

## Consequences

### Positive
- Ít deployment/runtime cần quản lý; cùng TypeScript contracts từ form tới tools.
- UI, auth, forms và agent loop dùng building blocks đã có.
- Module nghiệp vụ có thể kiểm thử độc lập với UI/model.

### Negative
- Phụ thuộc vào conventions của Next.js, Supabase và AI SDK.
- SQL retrieval/publishing policies vẫn cần code riêng và kiểm thử.

### Risks
- Framework APIs thay đổi: dùng installed docs, pin lockfile và chạy production build.
- Starter kéo nhiều stack: chọn starter tối thiểu và kiểm tra dependency ownership trước khi thêm.

## Alternatives considered

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Frontend + Python API riêng | Hợp hệ sinh thái Python | Thêm deploy/config/contracts cho 7 ngày | Chỉ cân nhắc khi có nhu cầu Python thực tế |
| Chatbot starter toàn phần | Có sẵn chat flows | Có thể kéo auth/DB và UX khác đã chọn | Chỉ tái dùng phần phù hợp |
| Tự viết UI/auth/agent runtime | Toàn quyền kiểm soát | Nhiều plumbing và failure modes | Không chọn |

## Review triggers

Một service cần runtime đặc thù; app có bottleneck đo được; hoặc library hiện tại không đáp ứng requirement đã xác nhận.
