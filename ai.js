/* ============================================================
   AI COACH
   ------------------------------------------------------------
   Talks to your own small backend (see AI-SETUP.md), never
   straight to the model provider — that would put your API key
   in the browser where anyone can read it.
   ============================================================ */

const AI_ENDPOINT = "/api/coach";   // <- change to your Worker URL if the backend is on another domain

(function aiCoachInit(){
  const form     = document.getElementById("aiForm");
  const promptEl = document.getElementById("aiPrompt");
  const topicEl  = document.getElementById("aiTopic");
  const statsEl  = document.getElementById("aiUseStats");
  const answerEl = document.getElementById("aiAnswer");
  const submitEl = document.getElementById("aiSubmit");
  const countEl  = document.getElementById("aiCount");
  const chipsEl  = document.getElementById("aiChips");
  if (!form) return;

  let controller = null;   // lets the user stop a running answer

  /* ---------- quick-ask chips ---------- */
  chipsEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    promptEl.value = chip.dataset.fill;
    promptEl.focus();
    updateCount();
  });

  /* ---------- character count ---------- */
  function updateCount(){ countEl.textContent = promptEl.value.length; }
  promptEl.addEventListener("input", updateCount);
  updateCount();

  /* ---------- Ctrl/Cmd + Enter sends ---------- */
  promptEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  /* ---------- submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // second click while streaming = stop
    if (controller) {
      controller.abort();
      return;
    }

    const question = promptEl.value.trim();
    if (!question) {
      showError("Nothing to answer yet", "Type a question — the more detail, the better the answer.");
      promptEl.focus();
      return;
    }

    setBusy(true);
    showThinking();

    controller = new AbortController();
    let text = "";

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          question,
          topic: topicEl.value,
          stats: statsEl.checked ? collectStats() : null
        })
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Request failed (${res.status})`);
      }

      const type = res.headers.get("content-type") || "";

      if (type.includes("text/event-stream") && res.body) {
        // stream the answer in as it is written
        for await (const chunk of readStream(res.body)) {
          text += chunk;
          renderAnswer(text, true);
        }
      } else {
        const data = await res.json();
        text = extractText(data);
      }

      if (!text.trim()) throw new Error("The coach came back empty. Try rephrasing the question.");
      renderAnswer(text, false);

    } catch (err) {
      if (err.name === "AbortError") {
        if (text.trim()) renderAnswer(text + "\n\n*Stopped.*", false);
        else showError("Stopped", "Ask again whenever you're ready.");
      } else {
        console.error(err);
        showError("Couldn't get an answer", err.message || "Check your connection and try again.");
      }
    } finally {
      controller = null;
      setBusy(false);
    }
  });

  /* ---------- SSE reader ---------- */
  async function* readStream(body){
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        for (const line of part.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              yield evt.delta.text;
            } else if (evt.type === "error") {
              throw new Error(evt.error?.message || "Stream error");
            }
          } catch (_) { /* ignore keep-alives and partial frames */ }
        }
      }
    }
  }

  function extractText(data){
    if (typeof data.text === "string") return data.text;           // simple backend
    if (Array.isArray(data.content)) {                              // raw Messages API shape
      return data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    }
    return "";
  }

  /* ---------- page context ---------- */
  function collectStats(){
    const ctx = window.NT || {};
    const out = {};
    if (ctx.diet) out.diet = ctx.diet;
    if (ctx.bmi)  out.bmi  = ctx.bmi;
    if (ctx.food && ctx.food.items && ctx.food.items.length) out.foodLog = ctx.food;
    return Object.keys(out).length ? out : null;
  }

  /* ---------- view states ---------- */
  function setBusy(busy){
    submitEl.textContent = busy ? "Stop" : "Ask the coach";
    submitEl.classList.toggle("is-busy", busy);
    promptEl.disabled = busy;
  }

  function showThinking(){
    answerEl.classList.remove("is-filled");
    answerEl.innerHTML = `<div class="ai__thinking"><i></i><i></i><i></i><span>Working on it</span></div>`;
  }

  function showError(title, body){
    answerEl.classList.remove("is-filled");
    answerEl.innerHTML = `<div class="ai__error"><strong>${escapeHtml(title)}</strong>${escapeHtml(body)}</div>`;
  }

  function renderAnswer(text, streaming){
    answerEl.classList.add("is-filled");
    answerEl.innerHTML =
      toHtml(text) +
      (streaming ? '<span class="ai__cursor"></span>' : '') +
      (streaming ? '' : '<p class="ai__note">General guidance, not medical advice. If you have a health condition, are pregnant, or are recovering from injury, check with a doctor or a registered dietitian first.</p>');
  }

  /* ---------- tiny markdown renderer (escapes first, so no HTML injection) ---------- */
  function escapeHtml(str){
    return str.replace(/[&<>"']/g, c => (
      { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
    ));
  }

  function inline(str){
    return escapeHtml(str)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }

  function toHtml(md){
    const lines = md.replace(/\r/g, "").split("\n");
    let html = "", list = null, para = [];

    const flushPara = () => {
      if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; }
    };
    const flushList = () => {
      if (list) { html += `</${list}>`; list = null; }
    };

    for (const raw of lines) {
      const line = raw.trim();

      if (!line) { flushPara(); flushList(); continue; }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara(); flushList();
        html += h[1].length <= 3 ? `<h3>${inline(h[2])}</h3>` : `<h4>${inline(h[2])}</h4>`;
        continue;
      }

      if (/^([-*_])\1{2,}$/.test(line)) { flushPara(); flushList(); html += "<hr>"; continue; }

      const ul = line.match(/^[-*•]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (list !== "ul") { flushList(); html += "<ul>"; list = "ul"; }
        html += `<li>${inline(ul[1])}</li>`;
        continue;
      }

      const ol = line.match(/^\d+[.)]\s+(.*)$/);
      if (ol) {
        flushPara();
        if (list !== "ol") { flushList(); html += "<ol>"; list = "ol"; }
        html += `<li>${inline(ol[1])}</li>`;
        continue;
      }

      flushList();
      para.push(line);
    }

    flushPara(); flushList();
    return html;
  }
})();
