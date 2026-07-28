import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Configuration for public vs restricted routes
const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
];

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/complaints",
  "/reports",
  "/analytics",
  "/ai-insights",
  "/automation",
  "/integrations",
  "/users",
  "/settings",
  "/billing",
  "/profile",
  "/admin",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Fetch JWT token from request cookies
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userRole = token?.role as string | undefined;

  // Helper flags
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  
  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  const isAdminRoute = pathname.startsWith("/admin");

  // 2. Redirect unauthenticated users trying to access protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  // 3. Redirect authenticated users away from public auth pages to dashboard
  if (isPublicAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 4. Role-Based Access Control (RBAC): Restrict /admin to ADMIN role only
  if (isAdminRoute && userRole !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 5. Build response and append security headers
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

// Ensure middleware only fires on application routes, bypassing static assets & internals
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public asset folders (/icons, /logos, /images)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|logos|images).*)",
  ],
};
    
