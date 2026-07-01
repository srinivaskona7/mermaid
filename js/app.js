/* ============================================================
   Mermaid Studio — application logic
   No build step. Depends on: CodeMirror 5, mermaid v11,
   svg-pan-zoom (all loaded via CDN in index.html).
   ============================================================ */
(function () {
  "use strict";

  // ---------- Constants ----------
  const LS_DOCS = "mstudio.docs.v1";
  const LS_ACTIVE = "mstudio.active.v1";
  const LS_UI = "mstudio.ui.v1";
  const RENDER_DEBOUNCE = 260;

  const DEFAULT_CODE = `flowchart LR
  A([Start]) --> B{Choose a template}
  B -->|Type code| C[Live preview]
  B -->|Templates menu| C
  C --> D([Export SVG / PNG])`;

  // ---------- State ----------
  let docs = [];        // [{id, title, code, theme, updated}]
  let activeId = null;
  let ui = { dark: false, editorWidth: 42, diagramTheme: "default" };
  let panZoom = null;
  let renderTimer = null;
  let renderSeq = 0;
  let lastGoodSvg = "";

  // ---------- Event bus + plugin readiness ----------
  const bus = Object.create(null);      // event -> [handlers]
  let appReady = false;
  const readyQueue = [];
  function on(evt, fn) { (bus[evt] || (bus[evt] = [])).push(fn); return () => off(evt, fn); }
  function off(evt, fn) { if (bus[evt]) bus[evt] = bus[evt].filter((f) => f !== fn); }
  function emit(evt, data) {
    (bus[evt] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error("[MS event " + evt + "]", e); } });
  }
  function onReady(fn) {
    if (appReady) { try { fn(window.MS); } catch (e) { console.error("[MS ready]", e); } }
    else readyQueue.push(fn);
  }

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    docTitle: $("docTitle"), templateSelect: $("templateSelect"),
    themeSelect: $("themeSelect"), darkToggle: $("darkToggle"), darkIco: $("darkIco"),
    installBtn: $("installBtn"),
    docsBtn: $("docsBtn"), docsPanel: $("docsPanel"),
    exportBtn: $("exportBtn"), exportPanel: $("exportPanel"),
    newBtn: $("newBtn"), formatBtn: $("formatBtn"), uploadBtn: $("uploadBtn"),
    fileInput: $("fileInput"), copyCodeBtn: $("copyCodeBtn"),
    workspace: $("workspace"), editorPane: $("editorPane"), previewPane: $("previewPane"),
    resizer: $("resizer"),
    previewHost: $("previewHost"), previewCanvas: $("previewCanvas"), previewEmpty: $("previewEmpty"),
    errorPanel: $("errorPanel"), errorMsg: $("errorMsg"),
    typeBadge: $("typeBadge"),
    zoomIn: $("zoomIn"), zoomOut: $("zoomOut"), zoomFit: $("zoomFit"), zoomReset: $("zoomReset"),
    zoomVal: $("zoomVal"), fullscreenBtn: $("fullscreenBtn"),
    statusRender: $("statusRender"), statusSaved: $("statusSaved"),
    statusPos: $("statusPos"), statusLines: $("statusLines"),
    toast: $("toast"),
  };

  let cm = null; // CodeMirror instance

  // ============================================================
  // Persistence
  // ============================================================
  function load() {
    try { docs = JSON.parse(localStorage.getItem(LS_DOCS)) || []; } catch { docs = []; }
    try { ui = Object.assign(ui, JSON.parse(localStorage.getItem(LS_UI)) || {}); } catch {}
    activeId = localStorage.getItem(LS_ACTIVE);

    // Shared link takes precedence.
    const shared = decodeShareLink();
    if (shared) {
      const d = newDoc("Shared diagram", shared.code, shared.theme || "default");
      docs.unshift(d); activeId = d.id;
    }
    if (!docs.length) {
      const d = newDoc("Untitled diagram", DEFAULT_CODE, "default");
      docs.push(d); activeId = d.id;
    }
    if (!docs.find((d) => d.id === activeId)) activeId = docs[0].id;
  }

  function persist() {
    localStorage.setItem(LS_DOCS, JSON.stringify(docs));
    localStorage.setItem(LS_ACTIVE, activeId);
    localStorage.setItem(LS_UI, JSON.stringify(ui));
  }

  function newDoc(title, code, theme) {
    return { id: "d" + Date.now() + Math.floor(Math.random() * 1e4), title, code, theme: theme || "default", updated: Date.now() };
  }
  function active() { return docs.find((d) => d.id === activeId); }

  // ============================================================
  // CodeMirror mermaid highlighting (simple mode)
  // ============================================================
  function defineMode() {
    CodeMirror.defineSimpleMode("mermaid", {
      start: [
        { regex: /%%.*/, token: "comment" },
        { regex: /"(?:[^\\"]|\\.)*"?/, token: "string" },
        { regex: /\b(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|gantt|pie|mindmap|gitGraph|journey|timeline|quadrantChart|sankey(?:-beta)?|xychart(?:-beta)?|requirementDiagram|C4Context|block(?:-beta)?)\b/, token: "keyword" },
        { regex: /\b(subgraph|end|participant|actor|class|state|section|note|loop|alt|else|opt|par|and|rect|activate|deactivate|title|dateFormat|axis|autonumber)\b/, token: "def" },
        { regex: /(-->|---|-\.->|==>|===|--x|--o|->>|-->>|\|>|<\||o--|x--|:::)/, token: "arrow" },
        { regex: /\|[^|]*\|/, token: "arrow" },
        { regex: /\b\d+\b/, token: "number" },
      ],
      meta: { lineComment: "%%" },
    });
  }

  function initEditor() {
    defineMode();
    cm = CodeMirror.fromTextArea($("editor"), {
      mode: "mermaid",
      lineNumbers: true,
      lineWrapping: true,
      autoCloseBrackets: true,
      styleActiveLine: true,
      tabSize: 2,
      indentUnit: 2,
      extraKeys: {
        "Cmd-S": (c) => { saveActive(); flashSaved(); },
        "Ctrl-S": (c) => { saveActive(); flashSaved(); },
        "Cmd-N": () => createNew(),
        "Ctrl-N": () => createNew(),
      },
    });
    cm.on("change", onEditorChange);
    cm.on("cursorActivity", updateCursor);
  }

  function onEditorChange() {
    const d = active();
    if (d) { d.code = cm.getValue(); d.updated = Date.now(); }
    setSaved(false);
    scheduleRender();
    debouncedPersist();
    updateLineCount();
    emit("change", cm.getValue());
  }

  let persistTimer = null;
  function debouncedPersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { persist(); setSaved(true); }, 500);
  }

  // ============================================================
  // Rendering
  // ============================================================
  function initMermaid() {
    mermaid.initialize({
      startOnLoad: false,
      theme: ui.diagramTheme,
      securityLevel: "loose",
      fontFamily: "inherit",
      flowchart: { htmlLabels: true, curve: "basis" },
      themeVariables: {},
    });
  }

  function scheduleRender() {
    clearTimeout(renderTimer);
    setStatus("busy", "Rendering…");
    renderTimer = setTimeout(render, RENDER_DEBOUNCE);
  }

  async function render() {
    const code = cm.getValue().trim();
    const seq = ++renderSeq;
    if (!code) {
      el.previewCanvas.innerHTML = "";
      el.previewEmpty.hidden = false;
      hideError(); setStatus("ok", "Ready"); el.typeBadge.textContent = "—";
      destroyPanZoom();
      return;
    }
    el.previewEmpty.hidden = true;
    try {
      // Validate first for a clean error message.
      await mermaid.parse(code);
      const { svg } = await mermaid.render("mstudio-svg-" + seq, code);
      if (seq !== renderSeq) return; // stale
      el.previewCanvas.innerHTML = svg;
      lastGoodSvg = svg;
      hideError();
      setStatus("ok", "Rendered");
      el.typeBadge.textContent = detectType(code);
      setupPanZoom();
      emit("render", { svg, code, type: detectType(code), el: el.previewCanvas.querySelector("svg") });
    } catch (err) {
      if (seq !== renderSeq) return;
      showError(err && err.message ? err.message : String(err));
      setStatus("err", "Error");
      emit("error", { message: err && err.message ? err.message : String(err), code });
    }
  }

  function detectType(code) {
    const first = code.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("%%")) || "";
    const map = [
      [/^flowchart|^graph/, "Flowchart"], [/^sequenceDiagram/, "Sequence"],
      [/^classDiagram/, "Class"], [/^stateDiagram/, "State"], [/^erDiagram/, "ER"],
      [/^gantt/, "Gantt"], [/^pie/, "Pie"], [/^mindmap/, "Mindmap"],
      [/^gitGraph/, "Git"], [/^journey/, "Journey"], [/^timeline/, "Timeline"],
      [/^quadrantChart/, "Quadrant"], [/^sankey/, "Sankey"], [/^xychart/, "XY chart"],
      [/^requirementDiagram/, "Requirement"], [/^C4/, "C4"], [/^block/, "Block"],
    ];
    for (const [re, label] of map) if (re.test(first)) return label;
    return "Diagram";
  }

  function showError(msg) {
    el.errorPanel.hidden = false;
    el.errorMsg.textContent = msg;
  }
  function hideError() { el.errorPanel.hidden = true; el.errorMsg.textContent = ""; }

  // ---------- Pan & Zoom ----------
  function destroyPanZoom() { if (panZoom) { try { panZoom.destroy(); } catch {} panZoom = null; } }
  function setupPanZoom() {
    destroyPanZoom();
    const svg = el.previewCanvas.querySelector("svg");
    if (!svg || typeof svgPanZoom === "undefined") return;
    svg.style.maxWidth = "none"; svg.style.maxHeight = "none";
    svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
    panZoom = svgPanZoom(svg, {
      zoomEnabled: true, controlIconsEnabled: false, fit: true, center: true,
      minZoom: 0.1, maxZoom: 20, zoomScaleSensitivity: 0.3,
      onZoom: (s) => { el.zoomVal.textContent = Math.round(s * 100) + "%"; },
    });
    el.zoomVal.textContent = Math.round(panZoom.getZoom() * 100) + "%";
  }

  // ============================================================
  // Documents
  // ============================================================
  function switchTo(id) {
    saveActive();
    activeId = id;
    const d = active();
    el.docTitle.value = d.title;
    ui.diagramTheme = d.theme || "default";
    el.themeSelect.value = ui.diagramTheme;
    cm.setValue(d.code);
    initMermaid();
    persist();
    render();
    closeMenus();
    updateLineCount();
    emit("docswitch", d);
  }

  function saveActive() {
    const d = active();
    if (!d) return;
    d.code = cm.getValue();
    d.title = el.docTitle.value.trim() || "Untitled diagram";
    d.theme = ui.diagramTheme;
    d.updated = Date.now();
  }

  function createNew() {
    saveActive();
    const d = newDoc("Untitled diagram", "", ui.diagramTheme);
    docs.unshift(d); activeId = d.id;
    el.docTitle.value = d.title;
    cm.setValue("");
    cm.focus();
    persist(); render(); renderDocsPanel();
    toast("New diagram created");
  }

  function deleteDoc(id) {
    const idx = docs.findIndex((d) => d.id === id);
    if (idx === -1) return;
    docs.splice(idx, 1);
    if (!docs.length) { const d = newDoc("Untitled diagram", "", "default"); docs.push(d); }
    if (activeId === id) { activeId = docs[0].id; switchTo(activeId); }
    persist(); renderDocsPanel();
    toast("Diagram deleted");
  }

  function renderDocsPanel() {
    const sorted = [...docs].sort((a, b) => b.updated - a.updated);
    el.docsPanel.innerHTML = "";
    sorted.forEach((d) => {
      const row = document.createElement("button");
      row.className = "menu__item docitem" + (d.id === activeId ? " active" : "");
      const label = document.createElement("span");
      label.textContent = d.title || "Untitled";
      const del = document.createElement("span");
      del.className = "docitem__del"; del.textContent = "✕"; del.title = "Delete";
      del.addEventListener("click", (e) => { e.stopPropagation(); deleteDoc(d.id); });
      row.appendChild(label); row.appendChild(del);
      row.addEventListener("click", () => switchTo(d.id));
      el.docsPanel.appendChild(row);
    });
  }

  // ============================================================
  // Export
  // ============================================================
  function getSvgEl() { return el.previewCanvas.querySelector("svg"); }

  function serializedSvg() {
    const svg = getSvgEl();
    if (!svg) return null;
    const clone = svg.cloneNode(true);
    // Reset pan/zoom transforms for a clean export.
    clone.removeAttribute("style");
    const vp = clone.querySelector(".svg-pan-zoom_viewport");
    if (vp) vp.removeAttribute("transform");
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }

  function downloadBlob(data, mime, filename) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function fileBase() { return (active().title || "diagram").replace(/[^\w\-]+/g, "_").toLowerCase(); }

  async function svgToPng(scale) {
    const svgStr = serializedSvg();
    if (!svgStr) throw new Error("Nothing to export");
    const src = getSvgEl();
    const bbox = src.getBBox ? src.getBBox() : { width: 1200, height: 800 };
    const vb = (src.getAttribute("viewBox") || "").split(/\s+/).map(Number);
    const w = vb.length === 4 ? vb[2] : (bbox.width || 1200);
    const h = vb.length === 4 ? vb[3] : (bbox.height || 800);
    const img = new Image();
    const blobUrl = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml" }));
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = blobUrl; });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (ui.diagramTheme !== "dark") { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(blobUrl);
    return new Promise((res) => canvas.toBlob(res, "image/png"));
  }

  async function doExport(kind) {
    closeMenus();
    try {
      if (kind === "svg") { downloadBlob(serializedSvg(), "image/svg+xml", fileBase() + ".svg"); toast("SVG downloaded"); }
      else if (kind === "png") { downloadBlob(await svgToPng(2), "image/png", fileBase() + ".png"); toast("PNG (2×) downloaded"); }
      else if (kind === "png4") { downloadBlob(await svgToPng(4), "image/png", fileBase() + ".png"); toast("PNG (4×) downloaded"); }
      else if (kind === "clipimg") {
        const blob = await svgToPng(2);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast("Image copied to clipboard");
      }
      else if (kind === "code") { await navigator.clipboard.writeText(cm.getValue()); toast("Code copied"); }
      else if (kind === "mmd") { downloadBlob(cm.getValue(), "text/plain", fileBase() + ".mmd"); toast(".mmd downloaded"); }
      else if (kind === "link") { await navigator.clipboard.writeText(makeShareLink()); toast("Shareable link copied"); }
    } catch (e) {
      toast("Export failed: " + (e.message || e));
    }
  }

  // ---------- Share links (URL hash, base64) ----------
  function makeShareLink() {
    const payload = JSON.stringify({ c: cm.getValue(), t: ui.diagramTheme });
    const b64 = btoa(unescape(encodeURIComponent(payload)));
    return location.origin + location.pathname + "#d=" + b64;
  }
  function decodeShareLink() {
    const m = location.hash.match(/#d=(.+)$/);
    if (!m) return null;
    try {
      const payload = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      history.replaceState(null, "", location.pathname); // clean URL after import
      return { code: payload.c, theme: payload.t };
    } catch { return null; }
  }

  // ============================================================
  // Format (light tidy of indentation)
  // ============================================================
  function formatCode() {
    const lines = cm.getValue().split("\n");
    let depth = 0;
    const out = lines.map((raw) => {
      const line = raw.trim();
      if (!line) return "";
      if (/^(end|})\b/.test(line)) depth = Math.max(0, depth - 1);
      const indented = "  ".repeat(depth) + line;
      if (/^(subgraph|state\s+\w+\s*\{|class\s+\w+\s*\{|loop|alt|opt|par|rect)\b/.test(line) || /\{\s*$/.test(line)) depth++;
      return indented;
    });
    cm.setValue(out.join("\n"));
    toast("Formatted");
  }

  // ============================================================
  // UI helpers
  // ============================================================
  function setStatus(kind, text) {
    el.statusRender.textContent = text;
    el.statusRender.className = "status status--" + kind;
  }
  function setSaved(saved) {
    el.statusSaved.textContent = saved ? "All changes saved" : "Saving…";
  }
  function flashSaved() { saveActive(); persist(); setSaved(true); toast("Saved"); }
  function updateCursor() {
    const c = cm.getCursor();
    el.statusPos.textContent = `Ln ${c.line + 1}, Col ${c.ch + 1}`;
  }
  function updateLineCount() {
    el.statusLines.textContent = cm.lineCount() + " lines";
  }
  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg; el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }
  function closeMenus() {
    el.docsPanel.hidden = true; el.exportPanel.hidden = true;
  }

  function applyDark(dark) {
    ui.dark = dark;
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    el.darkIco.innerHTML = dark
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
      : '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>';
    cm.setOption("theme", dark ? "material-darker" : "default");
    persist();
  }

  // ============================================================
  // Resizer
  // ============================================================
  function initResizer() {
    let dragging = false;
    const start = () => { dragging = true; document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none"; };
    const stop = () => { if (!dragging) return; dragging = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; persist(); };
    const move = (clientX) => {
      if (!dragging) return;
      const rect = el.workspace.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.min(75, Math.max(20, pct));
      ui.editorWidth = pct;
      el.editorPane.style.width = pct + "%";
      if (panZoom) panZoom.resize();
    };
    el.resizer.addEventListener("mousedown", start);
    window.addEventListener("mousemove", (e) => move(e.clientX));
    window.addEventListener("mouseup", stop);
    el.resizer.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", (e) => move(e.touches[0].clientX), { passive: true });
    window.addEventListener("touchend", stop);
    el.resizer.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { ui.editorWidth = Math.max(20, ui.editorWidth - 3); }
      else if (e.key === "ArrowRight") { ui.editorWidth = Math.min(75, ui.editorWidth + 3); }
      else return;
      el.editorPane.style.width = ui.editorWidth + "%";
      if (panZoom) panZoom.resize(); persist();
    });
  }

  // ============================================================
  // Wire up events
  // ============================================================
  function bind() {
    // Templates
    window.MERMAID_TEMPLATES.forEach((t, i) => {
      const o = document.createElement("option");
      o.value = String(i); o.textContent = t.name;
      el.templateSelect.appendChild(o);
    });
    el.templateSelect.addEventListener("change", () => {
      const i = el.templateSelect.value;
      if (i === "") return;
      const t = window.MERMAID_TEMPLATES[+i];
      cm.setValue(t.code);
      if (!el.docTitle.value || el.docTitle.value === "Untitled diagram") {
        el.docTitle.value = t.name; saveActive();
      }
      el.templateSelect.value = "";
      cm.focus();
    });

    // Theme
    el.themeSelect.addEventListener("change", () => {
      ui.diagramTheme = el.themeSelect.value;
      const d = active(); if (d) d.theme = ui.diagramTheme;
      initMermaid(); persist(); render();
      emit("themechange", ui.diagramTheme);
    });

    // Dark mode
    el.darkToggle.addEventListener("click", () => applyDark(!ui.dark));

    // Title
    el.docTitle.addEventListener("input", () => { saveActive(); debouncedPersist(); renderDocsPanel(); });

    // Files menu
    el.docsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willShow = el.docsPanel.hidden;
      closeMenus();
      if (willShow) { renderDocsPanel(); el.docsPanel.hidden = false; }
    });

    // Export menu
    el.exportBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willShow = el.exportPanel.hidden;
      closeMenus();
      el.exportPanel.hidden = !willShow;
    });
    el.exportPanel.querySelectorAll("[data-export]").forEach((b) =>
      b.addEventListener("click", () => doExport(b.dataset.export)));

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".menu")) closeMenus();
    });

    // Editor toolbar
    el.newBtn.addEventListener("click", createNew);
    el.formatBtn.addEventListener("click", formatCode);
    el.copyCodeBtn.addEventListener("click", () => doExport("code"));
    el.uploadBtn.addEventListener("click", () => el.fileInput.click());
    el.fileInput.addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        createNew();
        cm.setValue(String(r.result));
        el.docTitle.value = f.name.replace(/\.[^.]+$/, ""); saveActive();
        toast("Opened " + f.name);
      };
      r.readAsText(f);
      el.fileInput.value = "";
    });

    // Zoom controls
    el.zoomIn.addEventListener("click", () => panZoom && panZoom.zoomBy(1.3));
    el.zoomOut.addEventListener("click", () => panZoom && panZoom.zoomBy(1 / 1.3));
    el.zoomFit.addEventListener("click", () => { if (panZoom) { panZoom.resize(); panZoom.fit(); panZoom.center(); } });
    el.zoomReset.addEventListener("click", () => { if (panZoom) { panZoom.resetZoom(); panZoom.center(); } });
    el.fullscreenBtn.addEventListener("click", toggleFullscreen);

    // Global shortcuts
    window.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); flashSaved(); }
      else if (e.key === "Escape" && el.previewPane.classList.contains("is-fullscreen")) toggleFullscreen();
    });

    window.addEventListener("beforeunload", () => { saveActive(); persist(); });

    // Empty-state actions
    const starterBtn = document.getElementById("emptyStarterBtn");
    if (starterBtn) starterBtn.addEventListener("click", () => { cm.setValue(DEFAULT_CODE); cm.focus(); });
    const tplBtn = document.getElementById("emptyTemplatesBtn");
    if (tplBtn) tplBtn.addEventListener("click", () => { el.templateSelect.focus(); el.templateSelect.click(); });
  }

  function toggleFullscreen() {
    el.previewPane.classList.toggle("is-fullscreen");
    setTimeout(() => { if (panZoom) { panZoom.resize(); panZoom.fit(); panZoom.center(); } }, 60);
  }

  // ============================================================
  // PWA install prompt
  // ============================================================
  function initPWA() {
    let deferred = null;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault(); deferred = e; el.installBtn.hidden = false;
    });
    el.installBtn.addEventListener("click", async () => {
      if (!deferred) return;
      deferred.prompt(); await deferred.userChoice;
      deferred = null; el.installBtn.hidden = true;
    });
    window.addEventListener("appinstalled", () => { el.installBtn.hidden = true; toast("Installed"); });
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
  }

  // ============================================================
  // Boot
  // ============================================================
  function boot() {
    load();
    initEditor();
    const d = active();
    el.docTitle.value = d.title;
    ui.diagramTheme = d.theme || ui.diagramTheme || "default";
    el.themeSelect.value = ui.diagramTheme;
    el.editorPane.style.width = (ui.editorWidth || 42) + "%";
    applyDark(!!ui.dark);
    initMermaid();
    cm.setValue(d.code);
    bind();
    initResizer();
    initPWA();
    updateLineCount();
    render();

    // ---- Plugin API is live; run queued feature initializers ----
    appReady = true;
    emit("ready", window.MS);
    readyQueue.splice(0).forEach((fn) => { try { fn(window.MS); } catch (e) { console.error("[MS ready]", e); } });
    document.dispatchEvent(new CustomEvent("ms:ready", { detail: window.MS }));
  }

  // ============================================================
  // MS — public plugin API (window.MS). Feature modules in
  // js/features/*.js self-register against this surface.
  // ============================================================
  function el$(id) { return document.getElementById(id); }

  function injectCSS(cssText, id) {
    if (id && document.getElementById(id)) return;
    const s = document.createElement("style");
    if (id) s.id = id;
    s.textContent = cssText;
    document.head.appendChild(s);
    return s;
  }

  // Generic modal used by many features.
  function openModal(opts) {
    opts = opts || {};
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "ms-modal-overlay";
    overlay.id = "ms-modal-overlay";
    const box = document.createElement("div");
    box.className = "ms-modal";
    if (opts.width) box.style.maxWidth = opts.width;
    const head = document.createElement("div");
    head.className = "ms-modal__head";
    head.innerHTML = '<span class="ms-modal__title"></span><button class="ms-modal__close" aria-label="Close">✕</button>';
    head.querySelector(".ms-modal__title").textContent = opts.title || "";
    const body = document.createElement("div");
    body.className = "ms-modal__body";
    if (opts.node) body.appendChild(opts.node);
    else if (typeof opts.html === "string") body.innerHTML = opts.html;
    box.appendChild(head); box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    const close = () => { closeModal(); if (opts.onClose) opts.onClose(); };
    head.querySelector(".ms-modal__close").addEventListener("click", close);
    overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) close(); });
    const esc = (e) => { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } };
    document.addEventListener("keydown", esc);
    if (opts.onMount) { try { opts.onMount(body, box); } catch (e) { console.error(e); } }
    return { overlay, box, body, close };
  }
  function closeModal() {
    const ex = document.getElementById("ms-modal-overlay");
    if (ex) ex.remove();
  }

  // Toolbar button registration. where: 'topbar' | 'editor' | 'preview'.
  function addButton(where, cfg) {
    cfg = cfg || {};
    let host;
    if (where === "topbar") host = document.querySelector(".topbar__actions");
    else if (where === "editor") host = el.editorPane.querySelector(".pane__tools");
    else host = el.previewPane.querySelector(".pane__tools");
    if (!host) return null;
    const btn = document.createElement("button");
    btn.className = where === "topbar" ? "control" : "chip";
    if (where === "topbar" && cfg.primary) btn.className = "control control--primary";
    if (cfg.id) btn.id = cfg.id;
    if (cfg.title) btn.title = cfg.title;
    btn.innerHTML = (cfg.icon || "") + (cfg.label ? "<span>" + cfg.label + "</span>" : "");
    if (cfg.onClick) btn.addEventListener("click", cfg.onClick);
    if (where === "topbar" && cfg.before) host.insertBefore(btn, host.firstChild);
    else host.appendChild(btn);
    return btn;
  }

  // Command palette registry (a feature renders these; core just stores them).
  const commands = [];
  function registerCommand(cmd) {
    if (!cmd || !cmd.id || typeof cmd.run !== "function") return;
    const i = commands.findIndex((c) => c.id === cmd.id);
    if (i >= 0) commands[i] = cmd; else commands.push(cmd);
    emit("commands", commands.slice());
  }
  function getCommands() { return commands.slice(); }

  // Persisted per-feature settings (namespaced in ui.features).
  function fset(key, val) { (ui.features || (ui.features = {}))[key] = val; persist(); }
  function fget(key, dflt) { const f = ui.features || {}; return key in f ? f[key] : dflt; }

  window.MS = {
    version: "1.0",
    get MERMAID() { return typeof mermaid !== "undefined" ? mermaid : null; },
    // lifecycle / events
    ready: onReady, on, off, emit,
    // editor
    getCode: () => (cm ? cm.getValue() : ""),
    setCode: (v) => { if (cm) { cm.setValue(v == null ? "" : String(v)); } },
    replaceSelection: (v) => { if (cm) cm.replaceSelection(v); },
    getEditor: () => cm,
    focusEditor: () => { if (cm) cm.focus(); },
    // preview
    getSvgElement: () => el.previewCanvas.querySelector("svg"),
    getSvgString: () => serializedSvg(),
    rerender: () => render(),
    detectType,
    // export helpers (reuse core)
    download: (data, mime, name) => downloadBlob(data, mime, name),
    copyText: (t) => navigator.clipboard.writeText(t),
    svgToPng,
    fileBase,
    doExport,
    makeShareLink,
    // diagram config
    setDiagramTheme: (t) => {
      ui.diagramTheme = t; el.themeSelect.value = t;
      const d = active(); if (d) d.theme = t;
      initMermaid(); persist(); render(); emit("themechange", t);
    },
    getDiagramTheme: () => ui.diagramTheme,
    reinitMermaid: initMermaid,
    // documents
    getDocs: () => docs.map((d) => ({ ...d })),
    getActiveDoc: () => ({ ...active() }),
    createDoc: createNew,
    switchDoc: switchTo,
    setTitle: (t) => { el.docTitle.value = t; saveActive(); persist(); },
    // pan/zoom
    getPanZoom: () => panZoom,
    // ui
    toast, injectCSS, openModal, closeModal,
    addTopbarButton: (cfg) => addButton("topbar", cfg),
    addEditorButton: (cfg) => addButton("editor", cfg),
    addPreviewButton: (cfg) => addButton("preview", cfg),
    el: el$,
    els: el,
    // commands
    registerCommand, getCommands,
    // dark mode
    isDark: () => !!ui.dark,
    setDark: (v) => applyDark(!!v),
    // settings
    set: fset, get: fget,
    // constants
    TEMPLATES: (window.MERMAID_TEMPLATES || []),
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
