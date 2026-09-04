/**
 * NutriTrack Pro — AI coach backend (Cloudflare Worker)
 *
 * Deploy this, then point AI_ENDPOINT in ai.js at the Worker URL.
 * The API key lives in a Worker secret, never in the browser.
 *
 *   npm install -g wrangler
 *   wrangler login
 *   wrangler deploy backend/coach-worker.js --name nutritrack-coach --compatibility-date 2025-01-01
 *   wrangler secret put ANTHROPIC_API_KEY --name nutritrack-coach
 */

const MODEL = "claude-sonnet-5";       // cheaper + faster option: "claude-haiku-4-5-20251001"
const MAX_TOKENS = 1200;
const MAX_QUESTION_CHARS = 1000;

// Only these origins may call the Worker. Add your live domain.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://your-site.example"
];

const TOPIC_FOCUS = {
  nutrition: "The visitor is asking about food and nutrition.",
  diet: "The visitor is asking about diet planning and calorie or macro targets.",
  workout: "The visitor is asking about gym training and workout programming.",
  both: "The visitor may be asking about food, diet or training."
};

const SYSTEM_PROMPT = `You are the coach on NutriTrack Pro, a nutrition and fitness site run by the Body Craft gym.

Scope: food, nutrition, diet planning, and gym or home training. If a question falls outside that, say so briefly and point them back to what you can help with.

How to answer:
- Be direct and practical. Lead with the answer, then the reasoning.
- Give real numbers, foods and exercises rather than vague principles. Assume the reader wants something they can act on today.
- Keep it to roughly 250 words unless the question genuinely needs a full plan.
- Use short markdown: a few "##" headings, bullet lists, bold for key numbers. No tables.
- Ask at most one follow-up question, and only when the answer would change completely without it.
- Where the visitor's own figures are supplied, use them and refer to them naturally.
- Write in plain English. No hype, no filler, no motivational speeches.

Boundaries:
- You are not a doctor or a registered dietitian, and you don't diagnose, interpret symptoms or lab results, or advise on medication or supplements beyond ordinary food and basics like protein powder or creatine.
- Never program a calorie target below about 1,500 kcal for men or 1,200 kcal for women, never recommend fasting beyond 24 hours, rapid weight loss, cutting out whole food groups without reason, or "detox" protocols. If asked for any of these, decline briefly and offer a sustainable alternative instead.
- If someone describes restricting, purging, bingeing, compulsive exercise, distress about their body, or an injury or medical condition, drop the coaching, respond with care, and encourage them to talk to a doctor or a qualified professional. Don't supply numbers, targets or plans in that situation.
- Pregnancy, children under 16, and diagnosed conditions like diabetes, kidney disease or heart disease all need a professional, not a website. Say that plainly.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST")    return text("Method not allowed", 405, cors);

    if (ALLOWED_ORIGINS.length && origin && !ALLOWED_ORIGINS.includes(origin)) {
      return text("Origin not allowed", 403, cors);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return text("The coach isn't configured yet — no API key on the server.", 500, cors);
    }

    let body;
    try { body = await request.json(); }
    catch { return text("Bad request", 400, cors); }

    const question = String(body.question || "").trim().slice(0, MAX_QUESTION_CHARS);
    if (!question) return text("Ask a question first.", 400, cors);

    const focus = TOPIC_FOCUS[body.topic] || TOPIC_FOCUS.both;
    const stats = summariseStats(body.stats);

    const userContent =
      `${focus}\n\n` +
      (stats ? `Figures they have already worked out on the site:\n${stats}\n\n` : "") +
      `Their question:\n${question}`;

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }]
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Upstream error", upstream.status, detail);
      return text("The coach is unavailable right now. Try again in a moment.", 502, cors);
    }

    // pass the SSE stream straight through to the browser
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...cors,
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        "connection": "keep-alive"
      }
    });
  }
};

function corsHeaders(origin){
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || "*");
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin"
  };
}

function text(message, status, cors){
  return new Response(message, { status, headers: { ...cors, "content-type": "text/plain; charset=utf-8" } });
}

/* Turn the page's numbers into a short, readable brief for the model. */
function summariseStats(stats){
  if (!stats || typeof stats !== "object") return "";
  const lines = [];

  const d = stats.diet;
  if (d) {
    lines.push(
      `- ${d.gender}, ${d.age}, ${d.heightCm} cm, ${d.weightKg} kg. Goal: ${d.goal}.`,
      `- Daily target ${d.calorieTarget} kcal (BMR ${d.bmr}, TDEE ${d.tdee}).`,
      `- Macros: ${d.proteinG} g protein, ${d.carbG} g carbs, ${d.fatG} g fat. Water ${d.waterL} L, fibre ${d.fibreG} g.`
    );
  }

  const b = stats.bmi;
  if (b) lines.push(`- BMI ${b.value} (${b.status}).`);

  const f = stats.foodLog;
  if (f && f.items && f.items.length) {
    const names = f.items.slice(0, 12).map(i => `${i.name} (${i.qty})`).join(", ");
    const t = f.totals || {};
    lines.push(
      `- Logged so far: ${names}.`,
      `- Log totals: ${t.calories} kcal, ${t.proteinG} g protein, ${t.carbG} g carbs, ${t.fatG} g fat.`
    );
  }

  return lines.join("\n").slice(0, 2000);
}
