export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are ResolveAI, an expert complaint intelligence engine. Analyze the customer complaint and generate data strictly matching the requested JSON structure schema.`;

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
          // Force Structured JSON constraints at the schema engine level
          responseSchema: {
            type: "object",
            properties: {
              customer_name: { type: "string" },
              source_channel: { type: "string", enum: ["gmail", "whatsapp", "google_review", "support_ticket", "other"] },
              issue_category: { type: "string", enum: ["billing", "delivery", "product_quality", "staff", "refund", "technical", "safety", "legal", "other"] },
              issue_subcategory: { type: "string", description: "specific detail in 4-6 words" },
              sentiment_score: { type: "number", description: "between -1.0 and 1.0" },
              urgency_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
              desired_resolution: { type: "string", description: "what customer wants in 1 sentence" },
              legal_threat_detected: { type: "boolean" },
              viral_risk_detected: { type: "boolean" },
              safety_concern_detected: { type: "boolean" },
              vip_flag: { type: "boolean" },
              summary: { type: "string", description: "2-sentence plain English summary" },
              recommended_action: { type: "string", description: "immediate specific action in 1 sentence" },
              assign_to: { type: "string", enum: ["Support Team", "Manager", "Legal", "Finance", "CEO"] },
              resolve_by_hours: { type: "number" },
              draft_response: { type: "string", description: "A complete, warm, professional, personalized reply. 80-130 words." },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "action verb + specific task" },
                    assigned_to: { type: "string" },
                    due_in_hours: { type: "number" },
                    priority: { type: "string", enum: ["urgent", "high", "normal"] }
                  },
                  required: ["title", "assigned_to", "due_in_hours", "priority"]
                }
              },
              crm_note: { type: "string", description: "1-sentence CRM record update" },
              sheet_row: { type: "string", description: "customer | issue_category | urgency | sentiment_score | recommended_action" }
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
        JSON.stringify({ error: 'No response from Gemini', raw: resData }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Since responseSchema mathematically guarantees layout adherence, directly parse it.
    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch (parseErr) {
      return new Response(
        JSON.stringify({ error: `JSON Parse Crash: ${parseErr.message}`, raw: rawText }),
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
      
