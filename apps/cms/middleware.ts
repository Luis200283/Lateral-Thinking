import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Guard SSR: la sesión vive en localStorage (invisible al servidor), así que
// el login escribe un espejo en la cookie `cms_token` (ver lib/cms-api.ts).
// Este middleware solo comprueba presencia, no validez: la validez la
// verifica la API (401 -> el cliente limpia el token y vuelve a /login).
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login" ||
    // Destino del magic link: necesita obtener el JWT antes de exigir sesión.
    pathname === "/auth/callback"
  ) {
    return NextResponse.next();
  }
  const token = request.cookies.get("cms_token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
