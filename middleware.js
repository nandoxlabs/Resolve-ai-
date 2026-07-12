// Vercel Edge Middleware — runs before every request matched below.
// Gates the demo behind SITE_PASSWORD, and /dashboard/admin.html behind ADMIN_PASSWORD.
// Updated to match the actual repo structure: auth pages live under /auth/,
// the admin + complaints views live under /dashboard/.

export const config = {
  matcher: [
    '/((?!api/auth|api/admin-auth|auth/login.html|auth/admin-login.html|favicon.ico).*)',
  ],
};

export default function middleware(req) {
  const url = new URL(req.url);
  const isAdminPath = url.pathname.startsWith('/dashboard/admin');
  const cookieName = isAdminPath ? 'resolveai_admin' : 'resolveai_session';
  const cookieHeader = req.headers.get('cookie') || '';
  const hasCookie = cookieHeader
    .split(';')
    .some((c) => c.trim().startsWith(`${cookieName}=`));

  if (!hasCookie) {
    const loginPage = isAdminPath ? '/auth/admin-login.html' : '/auth/login.html';
    return Response.redirect(new URL(loginPage, req.url));
  }
}
