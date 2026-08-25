import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/profile",
  "/integrations",
  "/transactions",
  "/payments",
  "/company",
  "/ecommerce",
  "/subscriptions",
  "/docs",
];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("@payvex:token")?.value;

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (request.nextUrl.pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/integrations/:path*",
    "/transactions/:path*",
    "/payments/:path*",
    "/company/:path*",
    "/ecommerce/:path*",
    "/subscriptions/:path*",
    "/docs/:path*",
    "/login",
  ],
};
