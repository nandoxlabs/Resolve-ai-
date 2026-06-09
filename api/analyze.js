// api/analyze.js — Vercel Edge Function
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
  // Clear out pre-flight CORS requests
  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let channel = 'support_ticket';
  let complaint = '';
  
  try {
    const body = await req.json();
    channel = body.channel || 'support_ticket';
    complaint = body.complaint || '';
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to parse JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (!complaint.trim()) {
    return new Response(JSON.stringify({ error: 'Missing complaint text' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Look for your Gemini key variable inside Vercel Dashboard Environment
  const apiKey = process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error: Gemini key environment variable missing.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  try {
    // Native Google Gemini Flash compilation router
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\n[DATA TO PROCESS]:\nSource channel: ${channel}\nComplaint: ${complaint.trim()}`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Gemini API operational rejection', detail: resData }),
        { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Remap Gemini response payload shape so your frontend dashboard reads it smoothly
    let textOutput = "";
    try {
      textOutput = resData.candidates[0].content.parts[0].text;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Malformed response layout data structure returned from engine', detail: resData }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Parse text string back into structural JSON object to relay to application UI
    const finalCleanObject = JSON.parse(textOutput);

    return new Response(JSON.stringify(finalCleanObject), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal system gateway exception', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
  
