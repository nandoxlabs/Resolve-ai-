export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are ResolveAI, an expert complaint intelligence engine. Analyze the customer complaint and return a structured JSON object according to the exact schema. Do not include conversational text outside the JSON.

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
    {"title": "action verb + specific task", "assigned_to": "role", "due_in_hours": number, "priority": "urgent|high|normal"}
  ],
  "crm_note": "1-sentence CRM record update",
  "sheet_row": "customer | issue_category | urgency | sentiment_score | recommended_action"
}`;

export default async function handler(req) {
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
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  if (!complaint.trim()) {
    return new Response(JSON.stringify({ error: 'Complaint text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Server error: GEMINI_API_KEY missing in Vercel Environment.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }

  try {
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}\n\n[DATA TO PROCESS]:\nSource channel: ${channel}\nComplaint: ${complaint.trim()}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      const googleErrorReason = resData.error?.message || JSON.stringify(resData);
      return new Response(
        JSON.stringify({ error: `API Error: ${googleErrorReason}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: 'No response from Gemini', raw: resData }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    let cleanText = rawText.trim();
    
    // 1. Remove markdown syntax if it accidentally managed to clip through
    if (cleanText.startsWith('```')) {
      cleanText = cleanText
        .replace(/^```json/, '')
        .replace(/^```/, '')
        .replace(/```$/, '')
        .trim();
    }

    // 2. ✅ FIX: Sanitize control characters (unescaped line breaks, tabs) that crash JSON.parse
    cleanText = cleanText
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
        if (match === '\n') return '\\n';
        if (match === '\r') return '\\r';
        if (match === '\t') return '\\t';
        return '';
      });

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      // If it still fails, send the raw text to your frontend to see exactly what Gemini returned
      return new Response(
        JSON.stringify({ error: `JSON Parse Crash: ${parseErr.message}`, raw: cleanText }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Edge exception', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
  
