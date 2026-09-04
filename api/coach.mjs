/**
 * NutriTrack Pro — AI coach (Vercel Function)
 *
 * Lives at /api/coach on your deployed site, so ai.js works unchanged.
 * The API key comes from the ANTHROPIC_API_KEY environment variable set
 * in the Vercel dashboard — it is never sent to the browser.
 */

const MODEL = "claude-sonnet-5";      // cheaper + faster: "claude-haiku-4-5-20251001"
const MAX_TOKENS = 1200;
const MAX_QUESTION_CHARS = 1000;

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

export async function POST(request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return text("The coach isn't configured yet — ANTHROPIC_API_KEY is missing on the server.", 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return text("Bad request", 400);
  }

  const question = String(body.question || "").trim().slice(0, MAX_QUESTION_CHARS);
  if (!question) return text("Ask a question first.", 400);

  const focus = TOPIC_FOCUS[body.topic] || TOPIC_FOCUS.both;
  const stats = summariseStats(body.stats);

  const userContent =
    `${focus}\n\n` +
    (stats ? `Figures they have already worked out on the site:\n${stats}\n\n` : "") +
    `Their question:\n${question}`;

  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
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
  } catch (err) {
    console.error("Network error calling the model:", err);
    return text("The coach is unavailable right now. Try again in a moment.", 502);
  }

  if (!upstream.ok) {
    console.error("Model API error", upstream.status, await upstream.text().catch(() => ""));
    return text("The coach is unavailable right now. Try again in a moment.", 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no"
    }
  });
}

export function GET() {
  return text("The coach endpoint is alive. Ask questions from the website.", 200);
}

function text(message, status) {
  return new Response(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

function summariseStats(stats) {
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
