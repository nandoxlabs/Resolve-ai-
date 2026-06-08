// api/analyze.js — Vercel Edge Function
// ✅ The API key never leaves the server. It is read from an environment
//    variable set in the Vercel Dashboard, not from your source code.

export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are ResolveAI, an expert complaint intelligence engine. Analyze the customer complaint and return ONLY a valid JSON object — no markdown, no backticks, no explanation, just pure JSON.

Return this exact structure:
{
  "customer_name": "string or UNKNOWN",
  "source_channel": "gmail|whatsapp|google_review|support_ticket|other",
  "issue_category": "billing|delivery|product_quality|staff|refund|technical|safety|legal|other",
  "issue_subcategory": "specific detail in 4-6 words",
  "sentiment_score": number between -1.0 and 1.0,
  "urgency_level": "low|medium|high|critical",
  "desired_resolution": "what customer wants in 1 sentence",
  "legal_threat_detected": true or false,
  "viral_risk_detected": true or false,
  "safety_concern_detected": true or false,
  "vip_flag": false,
  "summary": "2-sentence plain English summary",
  "recommended_action": "immediate specific action in 1 sentence",
  "assign_to": "Support Team|Manager|Legal|Finance|CEO",
  "resolve_by_hours": number,
  "draft_response": "A complete, warm, professional, personalized reply. Open by acknowledging the specific problem. Validate frustration without admitting liability. State exact next step and timeline. Close warmly. 80-130 words.",
  "tasks": [
    {"title": "action verb + specific task", "assigned_to": "role", "due_in_hours": number, "priority": "urgent|high|normal"},
    {"title": "...", "assigned_to": "...", "due_in_hours": number, "priority": "..."}
  ],
  "crm_note": "1-sentence CRM record update",
  "sheet_row": "customer | issue_category | urgency | sentiment_score | recommended_action"
}`;

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Parse the incoming request body with safety protections
  let channel = 'support_ticket';
  let complaint = 'Sample customer concern payload testing connection.';
  
  try {
    const body = await req.json();
    if (body.channel && typeof body.channel === 'string' && body.channel.trim() !== '') {
      channel = body.channel.trim();
    }
    if (body.complaint && typeof body.complaint === 'string' && body.complaint.trim() !== '') {
      complaint = body.complaint.trim();
    }
  } catch (e) {
    // Fallback content in case frontend JSON parsing completely fails
    console.log("Request body fallback activated");
  }

  // ✅ API key is read securely from environment — never exposed to the browser
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: API key not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Forward the request to Anthropic
  let anthropicResponse;
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Source channel: ${channel}\n\nComplaint:\n${complaint}`
              }
            ]
          }
        ],
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to reach Anthropic API', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text();
    return new Response(
      JSON.stringify({ error: 'Anthropic API error', detail: errText }),
      { status: anthropicResponse.status, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await anthropicResponse.json();

  // Return the Anthropic response directly to the frontend
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
