export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const isAdmin = cookieHeader.split(';').some((c) => c.trim().startsWith('resolveai_admin='));
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)' }), { status: 500 });
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/usage_logs?select=*&order=created_at.desc&limit=1000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (!res.ok) {
      const detail = await res.text();
      return new Response(JSON.stringify({ error: 'Supabase query failed', detail }), { status: 502 });
    }
    const rows = await res.json();
    return new Response(JSON.stringify({ rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch logs', detail: err.message }), { status: 502 });
  }
}
