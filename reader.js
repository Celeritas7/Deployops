/* reader.js — Observatory chapter reader.
   Loads files/<nb>.ipynb, presents cells one at a time with a section rail,
   runs Python via Pyodide (one shared session). */
(function () {
  const qs = new URLSearchParams(location.search);
  const CHAPTERS = window.AI_CHAPTERS || [];
  const file = qs.get("nb") || (CHAPTERS[0] && CHAPTERS[0].file) || "";
  const ch = CHAPTERS.find((c) => c.file === file) || { id: "—", title: file.replace(".ipynb", "").replace(/_/g, " "), tag: "", blurb: "" };
  const ACC = (window.AI_ACCENTS || {})[ch.id] || "#5fd0e6";
  document.documentElement.style.setProperty("--acc", ACC);
  document.title = ch.title + " · Classical ML";
  document.getElementById("crumbCh").textContent = (ch.id + " · " + ch.title).toUpperCase();
  document.getElementById("jlink").href = "notebooks/index.html?path=" + encodeURIComponent(file);

  const app = document.getElementById("app");
  const store = {
    key: "aistudy.reader." + file,
    load() { try { return JSON.parse(localStorage.getItem(this.key)) || {}; } catch { return {}; } },
    save(s) { localStorage.setItem(this.key, JSON.stringify(s)); },
  };
  let saved = store.load();

  let cells = [], idx = Math.max(0, saved.idx || 0), cm = null, sections = [], mode = saved.mode || "focus";
  const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

  fetch("files/" + file).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(init)
    .catch((e) => { app.innerHTML = '<div class="loading">Could not load files/' + file + " — " + e.message + "</div>"; });

  function src(c) { return Array.isArray(c.source) ? c.source.join("") : c.source || ""; }

  function init(nb) {
    let sec = -1;
    nb.cells.forEach((c) => {
      const s = src(c).trim();
      if (!s) return;
      if (c.cell_type === "markdown" && /^#{1,2}[^#]/.test(s)) {
        sec++;
        sections.push(s.split("\n")[0].replace(/^#+\s*/, "").replace(/[*`]/g, ""));
      }
      cells.push({ type: c.cell_type, src: s, orig: s, sec: Math.max(sec, 0), ran: false, outs: c.outputs || [], live: null });
    });
    if (!sections.length) sections.push(ch.title);
    (saved.ran || []).forEach((i) => { if (cells[i]) cells[i].ran = true; });
    if (idx >= cells.length) idx = 0;
    const nCode = cells.filter((c) => c.type === "code").length;
    app.innerHTML =
      '<div class="hero"><div class="kick">' + (ch.group || "Chapter") + " · <em>" + (ch.tag || "notebook") + '</em></div>' +
      '<h1>' + ch.title + '<span class="chip mono">' + ch.id + "</span></h1>" +
      (ch.lead ? '<p class="blurb">' + ch.lead + "</p>" : "") +
      '<div class="meta">generated from <b>' + file + "</b> · <b>" + nCode + "</b> runnable cells · one shared Python session</div></div>" +
      '<div class="rail"><div class="railin" id="rail"></div></div>' +
      '<div class="stage"><button class="navb" id="prev">‹ Prev</button><div class="where" id="where"></div><div class="stgr"><button class="navb" id="next">Next ›</button><button class="navb" id="view"></button></div></div>' +
      '<div id="cell"></div>' +
      '<div class="note">First run downloads Python (~15 MB) from a CDN, so it needs internet. All cells share one session — run them top-to-bottom (<b>run all above</b> catches you up). Edits are temporary — a <b>refresh restores the original code</b>. <kbd>Shift+Enter</kbd> runs, <kbd>←</kbd> <kbd>→</kbd> navigate.</div>';
    document.getElementById("prev").onclick = () => go(idx - 1);
    document.getElementById("next").onclick = () => go(idx + 1);
    document.getElementById("view").onclick = () => { mode = mode === "focus" ? "page" : "focus"; saved.mode = mode; store.save(saved); render(); };
    document.addEventListener("keydown", (e) => {
      if (e.target.closest && e.target.closest(".CodeMirror")) return;
      if (e.key === "ArrowLeft") go(idx - 1);
      if (e.key === "ArrowRight") go(idx + 1);
    });
    buildRail(); render();
  }

  function buildRail() {
    const rail = document.getElementById("rail");
    rail.innerHTML = "";
    let lastSec = -1, codeN = 0;
    cells.forEach((c, i) => {
      if (c.sec !== lastSec) { lastSec = c.sec; const s = document.createElement("span"); s.className = "sec"; s.textContent = "§ " + (ROMAN[c.sec] || c.sec + 1); rail.appendChild(s); }
      const t = document.createElement("span");
      const first = c.src.split("\n").find((l) => l.trim() && !l.trim().startsWith("#")) || c.src.split("\n")[0];
      if (c.type === "code") { codeN++; c.n = codeN; t.textContent = String(codeN).padStart(2, "0") + " " + first.trim(); }
      else { t.textContent = "¶ " + c.src.split("\n")[0].replace(/^#+\s*/, "").replace(/[*`]/g, ""); }
      t.className = "tick" + (c.type === "markdown" ? " is-md" : "");
      t.title = first.trim(); t.onclick = () => go(i);
      c.el = t; rail.appendChild(t);
    });
  }

  function go(i) {
    if (i < 0 || i >= cells.length) return;
    idx = i; saved.idx = i; store.save(saved);
    if (mode === "page") {
      render();
      const el = document.querySelector('.pgcell[data-i="' + i + '"]');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: "smooth" });
    } else render();
  }

  function render() {
    cells.forEach((c, i) => { c.el.classList.toggle("is-cur", i === idx && mode === "focus"); c.el.classList.toggle("is-ran", !!c.ran); });
    const vbtn = document.getElementById("view");
    vbtn.textContent = mode === "focus" ? "☰ page" : "▦ focus";
    vbtn.title = mode === "focus" ? "See the whole chapter as one scrolling page" : "Back to one cell at a time";
    const prev = document.getElementById("prev"), next = document.getElementById("next"), where = document.getElementById("where");
    if (mode === "page") {
      prev.style.display = next.style.display = "none";
      where.innerHTML = "<b>" + sections.length + "</b> sections · <b>" + cells.length + "</b> cells — click a code cell's <b>▸ focus</b> to run it";
      renderPage(); cm = null; return;
    }
    prev.style.display = next.style.display = "";
    const c = cells[idx];
    c.el.scrollIntoViewIfNeeded ? c.el.scrollIntoViewIfNeeded() : 0;
    document.getElementById("where").innerHTML = "§ " + (ROMAN[c.sec] || c.sec + 1) + " · <b>" + (sections[c.sec] || "") + "</b> · " + (idx + 1) + " / " + cells.length;
    document.getElementById("prev").disabled = idx === 0;
    document.getElementById("next").disabled = idx === cells.length - 1;
    const host = document.getElementById("cell");
    if (c.type === "markdown") {
      host.innerHTML = '<div class="plate-md">' + marked.parse(c.src) + "</div>";
      cm = null; return;
    }
    const first = c.src.split("\n").find((l) => l.trim() && !l.trim().startsWith("#")) || "";
    host.innerHTML =
      '<div class="cellhead"><div class="cno">' + String(c.n).padStart(2, "0") + '</div><div><div class="ctag">' + (c.ran ? '<span class="ran">● ran</span> · ' : "") + 'code</div><div class="cfirst">' + esc(first.trim()) + "</div></div></div>" +
      '<div class="plate-code"><div class="codebar"><span class="dots"><i></i><i></i><i></i></span><span class="fname">cell_' + c.n + '.py</span>' +
      '<button class="btn" id="runAbove" title="Run every code cell before this one">⇤ run above</button>' +
      '<button class="btn" id="reset">Reset</button><button class="btn btn-run" id="run">▶ Run</button></div>' +
      '<div id="ed"></div><div class="out" id="out"></div></div>';
    cm = CodeMirror(document.getElementById("ed"), { value: c.src, mode: "python", theme: "obs", lineNumbers: true, indentUnit: 4, viewportMargin: Infinity });
    cm.on("change", () => { c.src = cm.getValue(); });
    cm.setOption("extraKeys", { "Shift-Enter": () => runCell(idx) });
    document.getElementById("run").onclick = () => runCell(idx);
    document.getElementById("reset").onclick = () => { c.src = c.orig; cm.setValue(c.orig); };
    document.getElementById("runAbove").onclick = () => runAbove(idx);
    paintOut(c);
  }

  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function renderPage() {
    const host = document.getElementById("cell");
    host.innerHTML = cells.map((c, i) => {
      if (c.type === "markdown") return '<div class="pgcell" data-i="' + i + '"><div class="plate-md">' + marked.parse(c.src) + "</div></div>";
      return '<div class="pgcell" data-i="' + i + '"><div class="plate-code"><div class="codebar"><span class="dots"><i></i><i></i><i></i></span><span class="fname">cell_' + c.n + ".py" + (c.ran ? ' · <span style="color:var(--green)">● ran</span>' : "") + '</span><button class="btn" data-focus="' + i + '">▸ focus</button></div><pre class="static">' + esc(c.src) + '</pre><div class="out" id="out-' + i + '"></div></div></div>';
    }).join("");
    cells.forEach((c, i) => { if (c.type === "code") paintOutInto(document.getElementById("out-" + i), c); });
    host.querySelectorAll("[data-focus]").forEach((b) => { b.onclick = () => { mode = "focus"; saved.mode = mode; idx = +b.dataset.focus; saved.idx = idx; store.save(saved); render(); window.scrollTo({ top: 0 }); }; });
  }

  /* ---- output painting: live result wins, else saved .ipynb outputs ---- */
  function paintOut(c) { paintOutInto(document.getElementById("out"), c); }
  function paintOutInto(out, c) {
    if (!out) return;
    let h = "";
    if (c.live) {
      h += '<div class="olabel">output</div>';
      if (c.live.stdout) h += '<pre>' + esc(c.live.stdout) + "</pre>";
      if (c.live.result) h += '<pre class="res">' + esc(c.live.result) + "</pre>";
      (c.live.imgs || []).forEach((b) => { h += '<img src="data:image/png;base64,' + b + '" alt="figure" />'; });
      if (c.live.err) h += '<pre class="err">' + esc(c.live.err) + "</pre>";
    } else if (c.outs && c.outs.length) {
      h += '<div class="olabel"><span class="saved">saved output</span> — run to refresh</div>';
      c.outs.forEach((o) => {
        if (o.output_type === "stream") h += "<pre>" + esc(join(o.text)) + "</pre>";
        else if (o.output_type === "error") h += '<pre class="err">' + esc((o.ename || "") + ": " + (o.evalue || "")) + "</pre>";
        else if (o.data) {
          if (o.data["image/png"]) h += '<img src="data:image/png;base64,' + join(o.data["image/png"]).replace(/\n/g, "") + '" alt="figure" />';
          else if (o.data["text/plain"]) h += '<pre class="res">' + esc(join(o.data["text/plain"])) + "</pre>";
        }
      });
    }
    out.innerHTML = h; out.classList.toggle("has", !!h);
  }
  function join(t) { return Array.isArray(t) ? t.join("") : t || ""; }

  /* ---- pyodide ---- */
  let pyodide = null, booting = null;
  const kpill = document.getElementById("kpill"), ktext = document.getElementById("ktext");
  function kstate(cls, txt) { kpill.className = "kpill " + cls; ktext.textContent = txt; }
  function boot() {
    if (pyodide) return Promise.resolve(pyodide);
    if (booting) return booting;
    kstate("is-boot", "booting python…");
    booting = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
      s.onload = async () => {
        try {
          pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
          await pyodide.runPythonAsync("import os\nos.environ['MPLBACKEND']='AGG'");
          kstate("is-ready", "python ready");
          resolve(pyodide);
        } catch (e) { kstate("is-err", "boot failed"); reject(e); }
      };
      s.onerror = () => { kstate("is-err", "no internet?"); reject(new Error("pyodide load failed")); };
      document.head.appendChild(s);
    });
    return booting;
  }

  async function exec(c) {
    const py = await boot();
    kstate("is-busy", "running…");
    let stdout = "";
    py.setStdout({ batched: (t) => { stdout += t + "\n"; } });
    py.setStderr({ batched: (t) => { stdout += t + "\n"; } });
    const live = { stdout: "", result: "", err: "", imgs: [] };
    try {
      await py.loadPackagesFromImports(c.src);
      let r = await py.runPythonAsync(c.src);
      if (r !== undefined && r !== null) {
        try { live.result = py.globals.get("repr")(r).toString(); } catch { live.result = String(r); }
        if (r && r.destroy) try { r.destroy(); } catch {}
      }
      if (py.loadedPackages && py.loadedPackages["matplotlib"]) {
        const figs = await py.runPythonAsync(
          "import base64,io\nimport matplotlib.pyplot as _plt\n_l=[]\nfor _n in _plt.get_fignums():\n    _b=io.BytesIO();_plt.figure(_n).savefig(_b,format='png',dpi=110,bbox_inches='tight',facecolor='#0e1422',edgecolor='none')\n    _l.append(base64.b64encode(_b.getvalue()).decode())\n_plt.close('all')\n_l");
        if (figs) { live.imgs = figs.toJs ? figs.toJs() : []; if (figs.destroy) figs.destroy(); }
      }
      c.ran = true;
      saved.ran = cells.map((x, i) => (x.ran ? i : -1)).filter((i) => i >= 0);
      store.save(saved);
      kstate("is-ready", "python ready");
    } catch (e) {
      live.err = String(e.message || e).split("\n").filter((l) => !l.includes('File "/lib/python')).join("\n");
      kstate("is-ready", "python ready");
    }
    live.stdout = stdout.replace(/\n$/, "");
    c.live = live;
    return live;
  }

  async function runCell(i) {
    const c = cells[i]; if (c.type !== "code") return;
    const btn = document.getElementById("run"); if (btn) btn.disabled = true;
    await exec(c);
    if (btn) btn.disabled = false;
    if (i === idx) { paintOut(c); render(); }
  }

  async function runAbove(i) {
    const btns = ["run", "runAbove", "reset"].map((id) => document.getElementById(id));
    btns.forEach((b) => b && (b.disabled = true));
    for (let j = 0; j < i; j++) if (cells[j].type === "code") await exec(cells[j]);
    btns.forEach((b) => b && (b.disabled = false));
    render();
  }
})();
