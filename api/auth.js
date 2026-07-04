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

  const correct = process.env.SITE_PASSWORD;
  if (!correct) {
    return new Response(
      JSON.stringify({ error: 'Server misconfigured: SITE_PASSWORD not set in Vercel env vars' }),
      { status: 500 }
    );
  }

  if (password !== correct) {
    return new Response(JSON.stringify({ error: 'Incorrect password' }), { status: 401 });
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  // 30-day session cookie. HttpOnly so it can't be read/stolen via JS.
  headers.append(
    'Set-Cookie',
    `resolveai_session=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
