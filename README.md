# The Memory Bank

MVP cho challenge 7 ngày: giúp đội Product/Delivery và CS/Operations tái sử dụng kinh nghiệm từ nhiều case, có bằng chứng và điều kiện áp dụng rõ ràng.

Repo hiện chứa thiết kế đã thảo luận và architecture foundation để review trước implementation.

- [Design spec](docs/superpowers/specs/2026-10-27-memory-bank-design.md)
- [Architecture foundation](docs/architecture/FOUNDATION.md)
- [Architecture review](docs/architecture/REVIEW.md)
- [Architecture decisions](docs/architecture/adr/0001-framework-first-single-app.md)

Foundation: Next.js App Router, TypeScript, shadcn/ui, React Hook Form, Zod, Vercel AI SDK 7, Supabase Auth/Postgres/pgvector, Vitest và Playwright. Deploy trên Vercel; dùng Node.js 24 LTS.

Ứng dụng, tích hợp dịch vụ và các bài kiểm thử sản phẩm chưa được triển khai. Các sơ đồ được render bằng Pele; prototype UX dùng dữ liệu giả định và được lưu ngoài Git trong `.superpowers/`.
