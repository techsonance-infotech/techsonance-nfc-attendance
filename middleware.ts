import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  
  // If no session, redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  
  // Check if user has admin or hr role for protected routes
  const userRole = (session.user as any)?.role;
  
  // Admin-only routes
  const adminOnlyRoutes = [
    "/admin/employees",
    "/admin/enrollments", 
    "/admin/readers",
    "/admin/settings"
  ];
  
  if (adminOnlyRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
    if (userRole !== "admin" && userRole !== "hr") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  
  // All admin routes require at least employee role
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!["admin", "hr", "employee"].includes(userRole)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*"
  ],
};