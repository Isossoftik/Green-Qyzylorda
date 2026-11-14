import { NextResponse, type NextRequest } from "next/server";

// DEMO ROLE is freely selectable. Only serve the local demonstration host.
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/i.test(host)) {
    return new Response("Доступ разрешён только на localhost.", { status: 403 });
  }
  return NextResponse.next();
}
