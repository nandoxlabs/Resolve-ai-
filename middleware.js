// Vercel Edge Middleware — runs securely on the server before the page loads.
// This gates the /dashboard behind a user session, and /admin behind an admin session.

export const config = {
  // OPTIMIZATION: Instead of blocking everything and making exceptions, 
  // we ONLY run this middleware on the folders that actually need protection.
  // This makes your public landing page (index.html) load much faster.
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};

export default function middleware(req) {
  const url = new URL(req.url);
  
  // 1. Determine which restricted zone the user is trying to access
  const isDashboardPath = url.pathname.startsWith('/dashboard');
  const isAdminPath = url.pathname.startsWith('/admin');

  // 2. Identify which security badge (cookie) is required for that zone
  const cookieName = isAdminPath ? 'resolveai_admin' : 'resolveai_session';
  const cookieHeader = req.headers.get('cookie') || '';
  
  // 3. Check if the user has the required cookie
  const hasCookie = cookieHeader
    .split(';')
    .some((c) => c.trim().startsWith(`${cookieName}=`));

  // 4. If they don't have the cookie, redirect them to the correct auth folder
  if (!hasCookie) {
    const loginPage = isAdminPath ? '/auth/admin-login.html' : '/auth/login.html';
    return Response.redirect(new URL(loginPage, req.url));
  }
}
