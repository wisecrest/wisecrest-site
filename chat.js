/* Ask Wisecrest — chat widget.
 * Loaded after the main site script (uses TOOLS, TOOL, GUIDES, doSearch, T, LANG, inr, words, BANKS, SMALL, REPO, AS_OF).
 * The AI only chooses a calculator and the numbers; the site's own calculator does the maths here in the browser.
 * Nothing is stored. Personal details (PAN, Aadhaar, phone, card/account numbers, email) are removed before sending.
 */
(function () {
  if (typeof TOOLS === "undefined" || typeof doSearch !== "function") return;
  const API = "/api/ask";

  /* ---------- text ---------- */
  const W = {
    btn: ["Ask Wisecrest", "Wisecrest से पूछें"],
    title: ["Ask Wisecrest", "Wisecrest से पूछें"],
    beta: ["Beta", "बीटा"],
    shown: ["Here's what the calculator shows for your numbers. Open the full calculator to see every detail or change a number.", "आपके नंबरों पर कैलकुलेटर का नतीजा ऊपर है। पूरा हिसाब देखने या कोई नंबर बदलने के लिए पूरा कैलकुलेटर खोलें।"],
    found: ["Here's what I found on Wisecrest:", "Wisecrest पर यह मिला:"],
    hello: ["Hi! Ask any money question in English, Hindi or Hinglish. I'll open the right Wisecrest calculator with your numbers filled in.", "नमस्ते! पैसे का कोई भी सवाल अंग्रेज़ी, हिंदी या हिंग्लिश में पूछें। मैं सही Wisecrest कैलकुलेटर आपके नंबरों के साथ खोल दूँगा।"],
    ph: ["Type your question…", "अपना सवाल लिखें…"],
    send: ["Send", "भेजें"],
    fine: ["Information only, not financial advice. Answers come from Wisecrest's own pages and calculators. Please don't type PAN, Aadhaar, phone or account numbers.", "सिर्फ़ जानकारी, वित्तीय सलाह नहीं। जवाब Wisecrest के अपने पेज और कैलकुलेटर से आते हैं। PAN, आधार, फ़ोन या खाता नंबर न लिखें।"],
    thinking: ["Thinking…", "सोच रहा हूँ…"],
    calc: ["Calculating…", "हिसाब लगा रहा हूँ…"],
    open: ["Open full calculator", "पूरा कैलकुलेटर खोलें"],
    change: ["You can change any number in the calculator.", "कैलकुलेटर में कोई भी नंबर बदल सकते हैं।"],
    read: ["Read", "पढ़ें"],
    redacted: ["I removed personal details (like PAN, Aadhaar, phone or account numbers) before sending. You never need to share them here.", "भेजने से पहले मैंने निजी जानकारी (जैसे PAN, आधार, फ़ोन या खाता नंबर) हटा दी। यहाँ इन्हें कभी साझा करने की ज़रूरत नहीं।"],
    fallback: ["The AI helper is resting right now (busy or daily free limit reached). Here's what our search found:", "AI सहायक अभी आराम कर रहा है (व्यस्त है या आज की मुफ़्त सीमा पूरी हो गई)। हमारी खोज में यह मिला:"],
    nothing: ["I couldn't find a matching page. Try different words, or browse all calculators.", "मिलता-जुलता पेज नहीं मिला। दूसरे शब्दों में पूछें, या सभी कैलकुलेटर देखें।"],
    all: ["All calculators", "सभी कैलकुलेटर"],
    close: ["Close", "बंद करें"],
    clear: ["New chat", "नई बातचीत"],
    tries: [
      [["FD of 5 lakh for 3 years", "5 लाख की FD 3 साल के लिए"], ["FD of 5 lakh for 3 years", "5 लाख की FD 3 साल के लिए"]],
      [["EMI on ₹50 lakh home loan, 8.5%, 20 years", "₹50 लाख होम लोन की EMI, 8.5%, 20 साल"], ["EMI on 50 lakh home loan at 8.5% for 20 years", "50 लाख होम लोन की EMI 8.5% पर 20 साल"]],
      [["15 lakh salary: old or new regime?", "15 लाख सैलरी: पुरानी या नई व्यवस्था?"], ["15 lakh salary old ya new regime better?", "15 लाख सैलरी पर पुरानी या नई टैक्स व्यवस्था बेहतर?"]],
      [["Is my money safe if a bank fails?", "बैंक डूबे तो मेरा पैसा सुरक्षित है?"], ["Is my money safe if a bank fails?", "बैंक डूबे तो क्या मेरा पैसा सुरक्षित है?"]]
    ]
  };
  const w = k => T(W[k]);
  const esc = x => String(x == null ? "" : x).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const strip = h => String(h == null ? "" : h).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const en = x => (Array.isArray(x) ? x[0] : String(x == null ? "" : x));

  /* ---------- privacy: remove personal identifiers before anything leaves the browser ---------- */
  function scrub(q) {
    const before = q;
    q = q.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/gi, "[removed]")                 // PAN
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[removed]")                        // email
      .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}(?:[ -]?\d{1,7})?\b/g, "[removed]") // Aadhaar / card
      .replace(/(?:\+?91[\s-]?)?\b[6-9]\d{9}\b/g, "[removed]")                  // mobile
      .replace(/\b\d{11,18}\b/g, "[removed]")                                   // account numbers
      .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, "[removed]");                       // IFSC
    return { q, changed: q !== before };
  }

  /* ---------- turn Indian amounts into plain rupees in code (the AI is not trusted with lakh/crore) ---------- */
  const UNIT = { lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, l: 1e5, "लाख": 1e5, crore: 1e7, crores: 1e7, cr: 1e7, "करोड़": 1e7, "करोड": 1e7, k: 1e3, thousand: 1e3, hazar: 1e3, hazaar: 1e3, hajar: 1e3, "हज़ार": 1e3, "हजार": 1e3 };
  function normQ(q) {
    q = q.replace(/(\d),(?=\d)/g, "$1");
    q = q.replace(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|cr|k|thousand|haza+r|hajar|l|लाख|करोड़|करोड|हज़ार|हजार)(?![a-zऀ-ॿ])/gi,
      (m, n, u) => { const f = UNIT[u.toLowerCase()] || (/^haza+r$/i.test(u) ? 1e3 : 1); return String(Math.round(parseFloat(n) * f)); });
    return q;
  }
  const numsIn = q => (q.match(/\d+(?:\.\d+)?/g) || []).map(Number);
  const HINGLISH = /\b(kya|kaise|kitna|kitni|kitne|hai|hain|ka|ki|ke|ko|mein|mai|pe|aur|ya|nahi|nahin|mera|meri|mere|mujhe|aap|saal|mahina|mahine|karu|karna|karein|milega|milegi|milta|lagega|hoga|hogi|chahiye|batao|bataye|wala|wali|kab|kyun|agar|toh|bhi|abhi|kaun|konsa|kaunsa|kitne|paisa|paise|byaj|kar)\b/gi;
  const langOf = q => /[ऀ-ॿ]/.test(q) ? "hi" : ((q.match(HINGLISH) || []).length >= 2 ? "hinglish" : "en");
  // Every number the AI writes must come from the site's own data; otherwise its text is not shown.
  function numbersOk(text, sources) {
    const norm = t => normQ(String(t).replace(/[₹%]/g, " "));
    const allowed = numsIn(norm(sources.join(" ")));
    return numsIn(norm(text)).every(n => allowed.some(a => n < 1000 ? a === n : Math.abs(a - n) <= Math.max(1, a * 0.005)));
  }

  /* ---------- context sent to the AI (all from this page's own data) ---------- */
  function facts() {
    const best = (ten, who) => BANKS.filter(b => (who === "s" ? b.sr : b.r)[ten] != null).sort((a, b) => (who === "s" ? b.sr : b.r)[ten] - (who === "s" ? a.sr : a.r)[ten])[0];
    const fd = [1, 2, 3, 5].map(n => { const g = best(n, "g"), s = best(n, "s"); return `${n}-yr best ${g.s} ${g.r[n]}% (senior: ${s.s} ${s.sr[n]}%)`; }).join("; ");
    return `checked ${AS_OF}. RBI repo ${REPO.rate}% (changed ${en(REPO.date)}; next decision ${en(REPO.nextL)}). Govt small savings Oct–Dec 2026: PPF ${SMALL.ppf}%, Sukanya ${SMALL.ssy}%, SCSS ${SMALL.scss}%, NSC ${SMALL.nsc}%, KVP ${SMALL.kvp}%, PO MIS ${SMALL.mis}%, PO savings ${SMALL.sb}%, RD ${SMALL.rd}%, EPF ${SMALL.epf}%. Bank FD (below ₹3 crore, from banks' own sites): ${fd}. Full table on the Rates page.`;
  }
  const TYPE = { money: "rupees", pct: "percent", num: "number", sel: "choice", txt: "text", area: "text" };
  function spec(t, current) {
    return {
      id: t.id, name: en(t.n), about: en(t.d),
      inputs: t.in.map(i => ({ id: i.id, type: TYPE[i.t] || i.t, label: en(i.l), def: i.t === "money" ? Math.round(i.v) : i.v, options: i.t === "sel" ? i.o.map(([v, l]) => ({ v, l: en(l) })) : undefined })),
      current: current ? Object.entries(current).map(([k, v]) => k + "=" + v).join(", ") : undefined
    };
  }
  const catalog = () => TOOLS.map(t => t.id + " = " + en(t.n)).join("; ");
  function guideCtx(g, withText) {
    return { id: g.id, title: en(g.t), summary: en(g.s), text: withText ? strip(T(g.b)).slice(0, 900) : undefined };
  }

  /* ---------- state ---------- */
  let hist = [];          // [{r:"u"|"a", t}]
  let last = null;        // { id, vals }
  let busy = false;

  /* ---------- UI ---------- */
  const css = `
.wc-fab{position:fixed;right:18px;bottom:18px;z-index:55;background:var(--teal);color:#fff;border:0;border-radius:999px;padding:12px 18px 12px 14px;font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;box-shadow:0 10px 28px rgba(14,124,107,.35)}
.wc-fab:hover{background:#0b6a5b}
.wc-fab svg{flex:none}
@media(max-width:940px){.wc-fab{bottom:calc(76px + env(safe-area-inset-bottom));right:12px;padding:11px 14px}.wc-fab span{display:none}}
.wc-panel{position:fixed;right:18px;bottom:18px;width:400px;max-width:calc(100vw - 24px);height:min(640px,calc(100vh - 36px));z-index:72;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 24px 60px rgba(20,40,75,.28);display:none;flex-direction:column;overflow:hidden}
.wc-panel.on{display:flex}
@media(max-width:940px){.wc-panel{right:0;left:0;bottom:0;top:0;width:auto;max-width:none;height:auto;border-radius:0;border:0}}
.wc-hd{display:flex;align-items:center;gap:8px;padding:13px 14px;background:var(--navy);color:#fff}
.wc-hd b{font-size:16px}
.wc-hd .wc-beta{font-size:11px;background:var(--saffron);color:#3b2400;border-radius:6px;padding:1px 6px;font-weight:700}
.wc-hd .wc-sp{flex:1}
.wc-hd button{background:transparent;border:0;color:#dfe8f7;font-size:13px;padding:4px 6px;border-radius:8px}
.wc-hd button:hover{background:rgba(255,255,255,.12);color:#fff}
.wc-log{flex:1;overflow-y:auto;padding:14px;background:var(--bg);display:flex;flex-direction:column;gap:10px}
.wc-m{max-width:88%;padding:10px 13px;border-radius:14px;font-size:14.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}
.wc-m.u{align-self:flex-end;background:var(--teal);color:#fff;border-bottom-right-radius:4px}
.wc-m.a{align-self:flex-start;background:#fff;border:1px solid var(--line);border-bottom-left-radius:4px}
.wc-m.note{align-self:stretch;max-width:none;background:#fff7e6;color:#8a5300;border:1px solid #f5d9a8;font-size:13px}
.wc-m.wait{color:var(--muted);font-style:italic}
.wc-card{align-self:stretch;background:linear-gradient(135deg,#0e7c6b,#0f5f73);color:#fff;border-radius:14px;padding:14px}
.wc-card .wc-bl{font-size:12.5px;opacity:.85}
.wc-card .wc-big{font-size:24px;font-weight:800;line-height:1.2}
.wc-card .wc-bw{font-size:12.5px;opacity:.88;margin-top:2px}
.wc-card .wc-rows{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
.wc-card .wc-rows div{background:rgba(255,255,255,.12);border-radius:9px;padding:6px 8px;font-size:12px}
.wc-card .wc-rows b{display:block;font-size:13.5px}
.wc-card a{display:inline-block;margin-top:11px;background:#fff;color:var(--teal);font-weight:700;border-radius:10px;padding:8px 12px;font-size:13.5px}
.wc-links{align-self:stretch;display:flex;flex-direction:column;gap:6px}
.wc-links a{background:#fff;border:1px solid var(--line);border-radius:11px;padding:9px 12px;font-size:14px;display:flex;justify-content:space-between;gap:8px}
.wc-links a:hover{border-color:var(--teal);color:var(--teal)}
.wc-links small{color:var(--muted)}
.wc-tries{display:flex;flex-wrap:wrap;gap:6px}
.wc-tries button{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 11px;font-size:13px;color:#334561;text-align:left}
.wc-tries button:hover{border-color:var(--teal);color:var(--teal)}
.wc-ft{border-top:1px solid var(--line);padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:#fff}
.wc-row{display:flex;gap:8px}
.wc-row textarea{flex:1;resize:none;border:1.5px solid var(--line);border-radius:11px;padding:10px 12px;font:inherit;font-size:16px;max-height:110px;outline:none}
.wc-row textarea:focus{border-color:var(--teal)}
.wc-row button{border:0;background:var(--teal);color:#fff;font-weight:700;border-radius:11px;padding:0 16px}
.wc-row button:disabled{opacity:.5}
.wc-fine{font-size:11.5px;color:var(--muted);margin-top:7px;line-height:1.4}
@media print{.wc-fab,.wc-panel{display:none!important}}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const fab = document.createElement("button");
  fab.className = "wc-fab"; fab.type = "button";
  const panel = document.createElement("div");
  panel.className = "wc-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "false");
  document.body.appendChild(fab); document.body.appendChild(panel);

  function frame() {
    fab.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/></svg><span>${esc(w("btn"))}</span>`;
    fab.setAttribute("aria-label", w("btn"));
    panel.setAttribute("aria-label", w("title"));
    const keep = panel.querySelector(".wc-log");
    const draft = panel.querySelector("textarea") ? panel.querySelector("textarea").value : "";
    panel.innerHTML = `<div class="wc-hd"><b>${esc(w("title"))}</b><span class="wc-beta">${esc(w("beta"))}</span><span class="wc-sp"></span><button type="button" data-x="new">${esc(w("clear"))}</button><button type="button" data-x="close" aria-label="${esc(w("close"))}">✕</button></div>
      <div class="wc-log" aria-live="polite"></div>
      <div class="wc-ft"><form class="wc-row"><textarea rows="1" maxlength="500" placeholder="${esc(w("ph"))}" aria-label="${esc(w("ph"))}"></textarea><button type="submit">${esc(w("send"))}</button></form><div class="wc-fine">${esc(w("fine"))}</div></div>`;
    const log = panel.querySelector(".wc-log");
    if (keep && keep.children.length) { while (keep.firstChild) log.appendChild(keep.firstChild); } else welcome(log);
    const ta = panel.querySelector("textarea"); ta.value = draft;
    ta.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } });
    ta.addEventListener("input", () => { ta.style.height = "auto"; ta.style.height = Math.min(110, ta.scrollHeight) + "px"; });
    panel.querySelector("form").addEventListener("submit", e => { e.preventDefault(); submit(); });
    panel.querySelector('[data-x="close"]').onclick = close;
    panel.querySelector('[data-x="new"]').onclick = () => { hist = []; last = null; log.innerHTML = ""; welcome(log); };
  }
  function welcome(log) {
    add("a", w("hello"), log);
    const d = document.createElement("div"); d.className = "wc-tries";
    W.tries.forEach(([label, q]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = T(label); b.onclick = () => ask(T(q)); d.appendChild(b); });
    log.appendChild(d);
  }
  const logEl = () => panel.querySelector(".wc-log");
  function add(cls, text, log) {
    const d = document.createElement("div"); d.className = "wc-m " + cls; d.textContent = text;
    (log || logEl()).appendChild(d); scroll(); return d;
  }
  function addNode(node) { logEl().appendChild(node); scroll(); return node; }
  const scroll = () => { const l = logEl(); if (l) l.scrollTop = l.scrollHeight; };

  function open() { panel.classList.add("on"); fab.style.display = "none"; setTimeout(() => panel.querySelector("textarea").focus(), 30); }
  function close() { panel.classList.remove("on"); fab.style.display = ""; }
  fab.onclick = open;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("on")) close(); });
  // close the full-screen panel on phones when a link inside it is followed
  panel.addEventListener("click", e => { const a = e.target.closest("a[href^='#']"); if (a && window.matchMedia("(max-width:940px)").matches) close(); });

  /* ---------- network ---------- */
  async function post(body) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 20000);
    try {
      const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
      if (!r.ok) return { fallback: true };
      return await r.json();
    } catch (e) { return { fallback: true }; } finally { clearTimeout(tm); }
  }

  /* ---------- rendering helpers ---------- */
  function linkList(items) {
    const d = document.createElement("div"); d.className = "wc-links";
    items.forEach(x => { const a = document.createElement("a"); a.href = x.h; a.innerHTML = `<span>${esc(x.ic || "")} ${esc(T(x.t))}</span><small>${esc(T(x.s))}</small>`; d.appendChild(a); });
    return d;
  }
  function searchLinks(q) {
    const hits = doSearch(q).slice(0, 5);
    if (hits.length) return linkList(hits);
    return linkList([{ ic: "🧮", t: W.all, s: ["Page", "पेज"], h: "#calculate" }]);
  }
  function cleanVals(t, raw, allowed) {
    const vals = {}, used = {};
    t.in.forEach(i => { vals[i.id] = i.v; });
    Object.entries(raw || {}).forEach(([k, v]) => {
      const i = t.in.find(x => x.id === k); if (!i) return;
      if (i.t === "sel") { const ok = i.o.find(([ov]) => String(ov) === String(v)); if (ok) { vals[k] = ok[0]; used[k] = ok[0]; } }
      else if (i.t === "txt" || i.t === "area") { vals[k] = String(v).slice(0, 200); used[k] = vals[k]; }
      else { const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[₹,\s]/g, "")); if (isFinite(n) && n >= 0 && n < 1e12 && allowed.some(a => Math.abs(a - n) < 1e-9)) { vals[k] = n; used[k] = n; } }
    });
    return { vals, used };
  }
  function fmtIn(i, v) {
    if (i.t === "money") return inr(v);
    if (i.t === "pct") return v + "%";
    if (i.t === "sel") { const o = i.o.find(([ov]) => String(ov) === String(v)); return o ? T(o[1]) : v; }
    return String(v);
  }
  function resultCard(t, vals, r) {
    const q = t.in.filter(i => i.t !== "txt" && i.t !== "area").map(i => i.id + "=" + encodeURIComponent(vals[i.id])).join("&");
    const href = "#t-" + t.id + (q ? "?" + q : "");
    const d = document.createElement("div"); d.className = "wc-card";
    const rows = (r.rows || []).slice(0, 4);
    d.innerHTML = `<div class="wc-bl">${esc(t.ic)} ${esc(T(t.n))}${r.bl ? " · " + esc(strip(T(r.bl))) : ""}</div>
      <div class="wc-big">${esc(strip(r.big))}</div>${r.bw ? `<div class="wc-bw">${esc(strip(r.bw))}</div>` : ""}
      ${rows.length ? `<div class="wc-rows">${rows.map(([l, v]) => `<div>${esc(strip(T(l)))}<b>${esc(strip(v))}</b></div>`).join("")}</div>` : ""}
      <a href="${esc(href)}">${esc(w("open"))} →</a>`;
    return d;
  }
  function resultText(r) {
    const parts = [];
    if (r.bl) parts.push(strip(en(r.bl)) + ": " + strip(r.big)); else if (r.big) parts.push(strip(r.big));
    if (r.bw) parts.push(strip(r.bw));
    (r.rows || []).slice(0, 8).forEach(([l, v]) => parts.push(strip(en(l)) + ": " + strip(v)));
    if (r.verdict) parts.push(strip(r.verdict));
    return parts.join("; ").slice(0, 900);
  }

  /* ---------- main flow ---------- */
  function submit() { const ta = panel.querySelector("textarea"); const q = ta.value.trim(); if (!q || busy) return; ta.value = ""; ta.style.height = "auto"; ask(q); }

  async function ask(original) {
    if (busy) return; busy = true;
    if (!panel.classList.contains("on")) open();
    const sendBtn = panel.querySelector(".wc-row button"); sendBtn.disabled = true;
    add("u", original);
    const sc = scrub(original.slice(0, 500)), changed = sc.changed, q = normQ(sc.q), lang = langOf(sc.q);
    if (changed) add("note", w("redacted"));
    const wait = add("a wait", w("thinking"));

    try {
      const hits = doSearch(sc.q);
      const toolIds = [...new Set(hits.filter(h => h.h.startsWith("#t-")).map(h => h.h.slice(3).split("?")[0]))].filter(id => TOOL[id]).slice(0, 4);
      if (last && TOOL[last.id] && !toolIds.includes(last.id)) toolIds.unshift(last.id);
      const guideIds = hits.filter(h => h.h.startsWith("#g-")).map(h => h.h.slice(3)).slice(0, 3);
      const body = {
        q, ui: LANG, lang, facts: facts(), catalog: catalog(),
        tools: toolIds.slice(0, 5).map(id => spec(TOOL[id], last && last.id === id ? last.vals : null)),
        guides: guideIds.map((id, n) => GUIDES.find(g => g.id === id)).filter(Boolean).map((g, n) => guideCtx(g, n === 0)),
        history: hist.slice(-4)
      };
      let res = await post(body);

      // AI picked a calculator we didn't describe in detail → ask once more with its inputs.
      if (!res.fallback && res.tool && TOOL[res.tool] && !toolIds.includes(res.tool)) {
        body.tools = [spec(TOOL[res.tool])].concat(body.tools.slice(0, 3));
        const again = await post(body);
        if (!again.fallback) res = again;
      }

      if (res.fallback || res.error) {
        wait.remove(); add("a", w("fallback")); addNode(searchLinks(sc.q));
        hist.push({ r: "u", t: q });
        return;
      }

      const t = res.tool && TOOL[res.tool];
      if (t) {
        const { vals, used } = cleanVals(t, res.values, numsIn(q).concat(last && last.id === t.id ? Object.values(last.vals).filter(v => typeof v === "number") : []));
        let r;
        try { r = t.run(vals); } catch (e) { r = null; }
        if (!r) { wait.remove(); add("a", res.say || ""); addNode(linkList([{ ic: t.ic, t: t.n, s: ["Calculator", "कैलकुलेटर"], h: "#t-" + t.id }])); return; }
        addNode(resultCard(t, vals, r));
        wait.textContent = w("calc"); addNode(wait);
        const inputsTxt = t.in.filter(i => i.t !== "txt" && i.t !== "area").map(i => en(i.l) + ": " + fmtIn(i, vals[i.id]) + (i.id in used ? "" : " (default)")).join("; ");
        const ex = await post({ mode: "explain", q, ui: LANG, lang, tool: en(t.n), inputs: inputsTxt, result: resultText(r) });
        wait.remove();
        const srcs = [q, inputsTxt, resultText(r), (r.rows || []).map(x => strip(T(x[0])) + " " + strip(x[1])).join(" "), strip(r.bw), strip(r.big)];
        let text = (!ex.fallback && ex.text && numbersOk(ex.text, srcs)) ? ex.text : "";
        if (!text) text = lang === "hi" ? W.shown[1] : W.shown[0];
        const missing = t.in.some(i => (i.t === "money" || i.t === "pct" || i.t === "num") && !(i.id in used));
        add("a", text + (missing ? "\n\n" + w("change") : ""));
        last = { id: t.id, vals: Object.fromEntries(t.in.filter(i => i.t !== "txt" && i.t !== "area").map(i => [i.id, vals[i.id]])) };
        hist.push({ r: "u", t: q }, { r: "a", t: `[opened ${t.id} calculator with ${Object.entries(used).map(([k, v]) => k + "=" + v).join(", ") || "default values"}] ${text}`.slice(0, 300) });
      } else {
        wait.remove();
        const gsrc = [q, facts()].concat((res.guides || []).map(id => GUIDES.find(g => g.id === id)).filter(Boolean).map(g => strip(T(g.b)) + " " + strip(g.b[0]) + " " + en(g.s) + " " + en(g.t)));
        let text = res.ask || res.say || "";
        if (!text || !numbersOk(text, gsrc)) text = res.offtopic ? w("nothing") : (lang === "hi" ? W.found[1] : W.found[0]);
        add("a", text);
        const gs = (res.guides || []).map(id => GUIDES.find(g => g.id === id)).filter(Boolean);
        if (gs.length) addNode(linkList(gs.map(g => ({ ic: g.ic, t: g.t, s: W.read, h: "#g-" + g.id }))));
        else if (!res.ask && !res.offtopic) addNode(searchLinks(sc.q));
        hist.push({ r: "u", t: q }, { r: "a", t: text.slice(0, 300) });
      }
    } finally {
      if (wait.isConnected) wait.remove();
      busy = false; const sb = panel.querySelector(".wc-row button"); if (sb) sb.disabled = false;
      hist = hist.slice(-6);
    }
  }

  /* ---------- language switch ---------- */
  frame();
  document.querySelectorAll(".lang button").forEach(b => b.addEventListener("click", () => setTimeout(frame, 0)));
})();
