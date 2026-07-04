// Vercel Edge Middleware — runs before every request matched below.
// Gates the public demo behind SITE_PASSWORD, and /admin behind ADMIN_PASSWORD.
// This is intentionally simple (cookie flag, not JWT/session store) — it is
// meant to stop random internet traffic and give you one admin view, not to
// be enterprise auth. Do not use this pattern once you have real customers
// with real accounts — replace with Supabase Auth or Clerk at that point.

export const config = {
  matcher: [
    '/((?!api/auth|api/admin-auth|login.html|admin-login.html|favicon.ico).*)',
  ],
};

export default function middleware(req) {
  const url = new URL(req.url);
  const isAdminPath = url.pathname.startsWith('/admin');
  const cookieName = isAdminPath ? 'resolveai_admin' : 'resolveai_session';
  const cookieHeader = req.headers.get('cookie') || '';
  const hasCookie = cookieHeader
    .split(';')
    .some((c) => c.trim().startsWith(`${cookieName}=`));

  if (!hasCookie) {
    const loginPage = isAdminPath ? '/admin-login.html' : '/login.html';
    return Response.redirect(new URL(loginPage, req.url));
  }
}
