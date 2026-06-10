export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are ResolveAI, an expert complaint intelligence engine. Analyze the customer complaint and generate data strictly matching the requested JSON structure schema. Make sure numeric values are returned as real numbers, and flags are boolean true/false.`;

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
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              customer_name: { type: "string" },
              source_channel: { type: "string" },
              issue_category: { type: "string" },
              issue_subcategory: { type: "string" },
              sentiment_score: { type: "number" },
              urgency_level: { type: "string" },
              desired_resolution: { type: "string" },
              legal_threat_detected: { type: "boolean" },
              viral_risk_detected: { type: "boolean" },
              safety_concern_detected: { type: "boolean" },
              vip_flag: { type: "boolean" },
              summary: { type: "string" },
              recommended_action: { type: "string" },
              assign_to: { type: "string" },
              resolve_by_hours: { type: "number" },
              draft_response: { type: "string" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    assigned_to: { type: "string" },
                    due_in_hours: { type: "number" },
                    priority: { type: "string" }
                  },
                  required: ["title", "assigned_to", "due_in_hours", "priority"]
                }
              },
              crm_note: { type: "string" },
              sheet_row: { type: "string" }
            },
            required: [
              "customer_name", "source_channel", "issue_category", "issue_subcategory", 
              "sentiment_score", "urgency_level", "desired_resolution", "legal_threat_detected", 
              "viral_risk_detected", "safety_concern_detected", "vip_flag", "summary", 
              "recommended_action", "assign_to", "resolve_by_hours", "draft_response", 
              "tasks", "crm_note", "sheet_row"
            ]
          }
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
        JSON.stringify({ error: 'No response from Gemini' }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const parsed = JSON.parse(rawText.trim());

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
  
