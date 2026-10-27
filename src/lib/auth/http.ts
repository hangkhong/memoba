import { NextResponse } from "next/server";
import { AccessError } from "./workspace";

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
export function accessResponse(error: unknown) {
  return error instanceof AccessError
    ? privateJson({ error: error.message }, error.status)
    : privateJson({ error: "Service unavailable." }, 503);
}
export function isSameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
