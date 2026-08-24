import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "./src/lib/supabase-server";

// Configuration for public vs restricted routes
const PUBLIC_AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/api/auth",
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
  "/api/analyze",
  "/api/complaints",
  "/api/tasks",
];

/**
 * Verify Supabase session from auth cookie.
 * Returns { user, orgId, error }
 */
async function verifySupabaseSession(req: NextRequest) {
  try {
    // Get the Supabase session cookie
    const authCookie = req.cookies.get("sb-auth-token")?.value;

    if (!authCookie) {
      return { user: null, orgId: null, error: "No session cookie found" };
    }

    // Verify the session with Supabase Auth
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(authCookie);

    if (authError || !user) {
      return { user: null, orgId: null, error: "Invalid or expired session" };
    }

    // Get the user's organization from the database
    const { data: userData, error: dbError } = await supabaseAdmin
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (dbError || !userData) {
      return { user, orgId: null, error: "User not found in database" };
    }

    return { user, orgId: userData.organization_id, error: null };
  } catch (err) {
    return { user: null, orgId: null, error: (err as Error).message };
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const isProtectedRoute = PROTECTED_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // 1. Allow public auth routes without session check
  if (isPublicAuthRoute) {
    // If already authenticated, redirect to dashboard
    const authCookie = req.cookies.get("sb-auth-token")?.value;
    if (authCookie && pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // 2. For protected routes, verify session server-side
  if (isProtectedRoute) {
    const { user, orgId, error } = await verifySupabaseSession(req);

    if (error || !user) {
      // Unauthenticated or invalid session: redirect to login
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", encodeURIComponent(pathname));
      return NextResponse.redirect(loginUrl);
    }

    // Session is valid. Continue to the route.
    // (We could also attach user/orgId to headers for API routes to use)
    const response = NextResponse.next();
    response.headers.set("X-User-ID", user.id);
    if (orgId) {
      response.headers.set("X-Org-ID", orgId);
    }
    return response;
  }

  // 3. For all other routes, proceed normally
  const response = NextResponse.next();

  // Add security headers
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|logos|images).*)",
  ],
};
