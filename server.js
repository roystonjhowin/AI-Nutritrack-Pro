/**
 * NutriTrack Pro — AI coach backend (Node, no dependencies)
 *
 * Serves the site AND /api/coach from one origin, so ai.js works with
 * the default AI_ENDPOINT of "/api/coach" and there are no CORS issues.
 *
 * Needs Node 18+.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node backend/server.js
 *   open http://localhost:3000
 */

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT      = process.env.PORT || 3000;
const API_KEY   = process.env.ANTHROPIC_API_KEY;
const SITE_DIR  = path.join(__dirname, "..");
const MODEL     = "claude-sonnet-5";   // cheaper + faster: "claude-haiku-4-5-20251001"
const MAX_TOKENS = 1200;

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
- Give real numbers, foods and exercises rather than vague principles.
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

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  if (req.url.split("?")[0] === "/api/coach") return handleCoach(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`NutriTrack Pro running at http://localhost:${PORT}`);
  if (!API_KEY) console.warn("No ANTHROPIC_API_KEY set — the coach section will show an error.");
});

/* ---------------- coach endpoint ---------------- */
async function handleCoach(req, res){
  if (req.method !== "POST") return send(res, 405, "Method not allowed");
  if (!API_KEY) return send(res, 500, "The coach isn't configured yet — no API key on the server.");

  let raw = "";
  req.on("data", c => {
    raw += c;
    if (raw.length > 20000) req.destroy();
  });

  req.on("end", async () => {
    let body;
    try { body = JSON.parse(raw); } catch { return send(res, 400, "Bad request"); }

    const question = String(body.question || "").trim().slice(0, 1000);
    if (!question) return send(res, 400, "Ask a question first.");

    const focus = TOPIC_FOCUS[body.topic] || TOPIC_FOCUS.both;
    const stats = summariseStats(body.stats);
    const userContent =
      `${focus}\n\n` +
      (stats ? `Figures they have already worked out on the site:\n${stats}\n\n` : "") +
      `Their question:\n${question}`;

    try {
      const upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": API_KEY,
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
        console.error("Upstream error", upstream.status, await upstream.text().catch(() => ""));
        return send(res, 502, "The coach is unavailable right now. Try again in a moment.");
      }

      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache",
        "connection": "keep-alive"
      });

      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();

    } catch (err) {
      console.error(err);
      send(res, 502, "The coach is unavailable right now. Try again in a moment.");
    }
  });
}

/* ---------------- static files ---------------- */
function serveStatic(req, res){
  let file = decodeURIComponent(req.url.split("?")[0]);
  if (file === "/") file = "/index.html";

  const full = path.join(SITE_DIR, path.normalize(file));
  if (!full.startsWith(SITE_DIR)) return send(res, 403, "Forbidden");

  fs.readFile(full, (err, data) => {
    if (err) return send(res, 404, "Not found");
    res.writeHead(200, { "content-type": MIME[path.extname(full)] || "application/octet-stream" });
    res.end(data);
  });
}

function send(res, status, message){
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(message);
}

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
