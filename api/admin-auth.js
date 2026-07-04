export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body.password === 'string' ? body.password : '';
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  const correct = process.env.ADMIN_PASSWORD;
  if (!correct) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: ADMIN_PASSWORD not set in Vercel env vars' }),
      { status: 500 }
    );
  }

  if (password !== correct) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  const maxAge = 60 * 60 * 24 * 7; // 7-day admin session, shorter than public
  headers.append('Set-Cookie', `resolveai_admin=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
  headers.append('Set-Cookie', `resolveai_session=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
