/* ===== Zeszyt – przełącznik tła, motyw, fiszki ===== */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // ----- tło kartki -----
  const PAPERS = [["kratka", "Kratka"], ["milimetrowy", "Milimetrowy"], ["linie", "Linie + margines"], ["kropki", "Kropki"], ["czysta", "Czysta"]];
  const THEMES = [["auto", "Auto"], ["light", "Jasny"], ["dark", "Ciemny"]];

  function applyPaper(p) {
    document.documentElement.setAttribute("data-paper", p);
    document.querySelectorAll("[data-set-paper]").forEach(b => b.setAttribute("aria-pressed", b.dataset.setPaper === p));
    store.set("zeszyt.paper", p);
  }
  function applyTheme(t) {
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    document.querySelectorAll("[data-set-theme]").forEach(b => b.setAttribute("aria-pressed", b.dataset.setTheme === t));
    store.set("zeszyt.theme", t);
  }
  function buildSwitch(el, items, attr, apply) {
    items.forEach(([v, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.dataset[attr] = v;
      b.addEventListener("click", () => apply(v));
      el.appendChild(b);
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    const ps = document.getElementById("paper-switch");
    const ts = document.getElementById("theme-switch");
    if (ps) buildSwitch(ps, PAPERS, "setPaper", applyPaper);
    if (ts) buildSwitch(ts, THEMES, "setTheme", applyTheme);
    applyPaper(store.get("zeszyt.paper", "kratka"));
    applyTheme(store.get("zeszyt.theme", "auto"));
    if (window.FISZKI) initFlashcards(window.FISZKI);
    if (window.QUIZ) initQuiz(window.QUIZ);
  });

  // ----- mini-test: window.QUIZ = [{ q, o: [4 odpowiedzi], c: indeks poprawnej, w: wyjaśnienie }] -----
  function initQuiz(Q) {
    const root = document.getElementById("quiz"), score = document.getElementById("quiz-score");
    if (!root) return;
    const intro = score ? score.textContent : "";
    let good = 0, done = 0;
    function render() {
      good = done = 0; root.innerHTML = "";
      Q.forEach(item => {
        const d = document.createElement("div"); d.className = "qz";
        d.innerHTML = `<p>${item.q}</p>` + item.o.map((o, i) => `<button type="button" data-i="${i}">${"ABCD"[i]}) ${o}</button>`).join("") + `<div class="why">${item.w}</div>`;
        d.addEventListener("click", e => {
          const b = e.target.closest("button"); if (!b || d.classList.contains("done")) return;
          const i = +b.dataset.i; d.classList.add("done"); done++;
          d.querySelectorAll("button").forEach(x => { x.disabled = true; if (+x.dataset.i === item.c) x.classList.add("ok"); });
          if (i === item.c) good++; else b.classList.add("bad");
          if (score) score.textContent = `Wynik: ${good} / ${done}` + (done === Q.length ? (good === Q.length ? " – komplet! 🎉" : ` (z ${Q.length})`) : "");
        });
        root.appendChild(d);
      });
      if (score) score.textContent = intro;
    }
    const reset = document.getElementById("quiz-reset");
    if (reset) reset.addEventListener("click", render);
    render();
  }

  // ----- fiszki -----
  function initFlashcards(all) {
    const root = document.getElementById("fiszki");
    if (!root) return;
    const key = "zeszyt.known." + location.pathname;
    let known = new Set(store.get(key, []));
    let filter = "wszystkie", deck = [], i = 0;

    const tags = ["wszystkie", ...new Set(all.map(c => c.tag))];
    root.innerHTML = `
      <div class="fc-bar">${tags.map(t => `<button type="button" data-f="${t}">${t}</button>`).join("")}
        <button type="button" data-act="shuffle">🔀 Tasuj</button>
        <button type="button" data-act="hide">Ukryj umiane</button>
        <span class="fc-count"></span></div>
      <div class="flash"><div class="in">
        <div class="side front"><span class="tag"></span><div class="q"></div><span class="hint">kliknij / spacja, żeby odwrócić</span></div>
        <div class="side back"><span class="tag"></span><div class="a"></div></div>
      </div></div>
      <div class="fc-nav"><button type="button" data-act="prev">← Poprzednia</button>
        <button type="button" class="ok" data-act="know">✓ Umiem</button>
        <button type="button" data-act="next">Następna →</button></div>`;

    const card = root.querySelector(".flash"), count = root.querySelector(".fc-count");
    let hideKnown = false;

    function rebuild() {
      deck = all.filter(c => (filter === "wszystkie" || c.tag === filter) && !(hideKnown && known.has(c.q)));
      i = Math.min(i, Math.max(deck.length - 1, 0));
      root.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-pressed", b.dataset.f === filter));
      root.querySelector('[data-act="hide"]').setAttribute("aria-pressed", hideKnown);
      render();
    }
    function render() {
      card.classList.remove("on");
      const c = deck[i];
      count.textContent = deck.length ? `${i + 1} / ${deck.length} · umiesz ${all.filter(x => known.has(x.q)).length} z ${all.length}` : "brak kart – wszystko umiesz 🎉";
      root.querySelectorAll(".tag").forEach(t => t.textContent = c ? c.tag : "");
      root.querySelector(".q").innerHTML = c ? c.q : "—";
      root.querySelector(".a").innerHTML = c ? c.a : "";
      card.classList.toggle("known", !!c && known.has(c.q));
    }
    const step = d => { if (deck.length) { i = (i + d + deck.length) % deck.length; render(); } };

    card.addEventListener("click", () => card.classList.toggle("on"));
    root.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.f) { filter = b.dataset.f; i = 0; rebuild(); }
      const a = b.dataset.act;
      if (a === "next") step(1);
      if (a === "prev") step(-1);
      if (a === "shuffle") { all = all.slice().sort(() => Math.random() - .5); i = 0; rebuild(); }
      if (a === "hide") { hideKnown = !hideKnown; rebuild(); }
      if (a === "know" && deck[i]) {
        const q = deck[i].q;
        known.has(q) ? known.delete(q) : known.add(q);
        store.set(key, [...known]);
        hideKnown ? rebuild() : (render(), step(1));
      }
    });
    document.addEventListener("keydown", e => {
      if (!root.getBoundingClientRect || e.target.closest("input,textarea")) return;
      const r = root.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === " ") { e.preventDefault(); card.classList.toggle("on"); }
    });
    rebuild();
  }
})();
