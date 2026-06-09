// api/analyze.js — Vercel Edge Function (Gemini)
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
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let channel = 'support_ticket';
  let complaint = 'Test fallback concern.';

  try {
    const body = await req.json();
    if (body.channel) channel = String(body.channel).trim();
    if (body.complaint) complaint = String(body.complaint).trim();
  } catch (e) {
    console.log("JSON parsing skipped/failed");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: API key not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_PROMPT}\n\n[DATA TO PROCESS]:\nSource channel: ${channel}\nComplaint: ${complaint}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500,
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: 'Gemini rejection response', detail: errText }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Extract text from Gemini response
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean and parse JSON
    const clean = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Edge connection failed', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
