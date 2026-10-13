import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession();

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/clients", request.url));
    }
    return NextResponse.next();
  }

  // The only other public route — readable by a prospect who has no account
  // yet, unlike everything else here. Exact match, not a prefix, so nothing
  // under it (there's nothing under it today) becomes public by accident.
  if (pathname === "/methodologie") {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
