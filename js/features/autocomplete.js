/* Feature: Keyword Autocomplete — Ctrl/Cmd+Space keyword & arrow hints in the editor.
   No external CDN libraries loaded. Uses a lightweight custom popup positioned via
   editor.cursorCoords when the CodeMirror show-hint addon is unavailable. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var NS = "ac-";

      // ---- Suggestion vocabulary ----------------------------------------
      var KEYWORDS = [
        "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram-v2",
        "erDiagram", "gantt", "pie", "mindmap", "gitGraph", "journey",
        "subgraph", "participant", "note", "loop", "alt", "opt", "par",
        "activate", "end"
      ];
      var ARROWS = ["-->", "---", "-.->", "==>", "->>", "-->>"];

      // ---- Styling (theme vars only, namespaced) ------------------------
      MS.injectCSS(
        "." + NS + "pop{position:fixed;z-index:9999;min-width:180px;max-width:280px;" +
        "max-height:220px;overflow-y:auto;background:var(--surface);color:var(--text);" +
        "border:1px solid var(--border);border-radius:var(--radius);" +
        "box-shadow:0 8px 24px rgba(0,0,0,.25);padding:4px;font-size:13px;" +
        "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}" +
        "." + NS + "item{display:flex;align-items:center;gap:8px;padding:5px 8px;" +
        "border-radius:calc(var(--radius) - 2px);cursor:pointer;white-space:nowrap;}" +
        "." + NS + "item.is-active{background:var(--accent);color:#fff;}" +
        "." + NS + "kind{opacity:.6;font-size:11px;margin-left:auto;}" +
        "." + NS + "item.is-active ." + NS + "kind{opacity:.85;color:#fff;}",
        "autocomplete-css"
      );

      // ---- State --------------------------------------------------------
      var popEl = null;
      var items = [];      // [{text, kind}]
      var activeIdx = 0;
      var tokenStart = null;

      function closePopup() {
        if (popEl && popEl.parentNode) popEl.parentNode.removeChild(popEl);
        popEl = null;
        items = [];
        activeIdx = 0;
        tokenStart = null;
        document.removeEventListener("mousedown", onDocDown, true);
        window.removeEventListener("resize", closePopup);
        window.removeEventListener("scroll", closePopup, true);
      }

      function onDocDown(e) {
        if (popEl && !popEl.contains(e.target)) closePopup();
      }

      // Word token immediately before the cursor.
      function currentWord(cm) {
        try {
          var cur = cm.getCursor();
          var line = cm.getLine(cur.line) || "";
          var i = cur.ch;
          while (i > 0 && /[A-Za-z0-9_-]/.test(line.charAt(i - 1))) i--;
          return {
            text: line.slice(i, cur.ch),
            start: { line: cur.line, ch: i },
            end: cur
          };
        } catch (err) {
          console.error("[autocomplete] currentWord", err);
          return { text: "", start: cm.getCursor(), end: cm.getCursor() };
        }
      }

      function buildList(prefix) {
        var out = [];
        var p = (prefix || "").toLowerCase();
        KEYWORDS.forEach(function (k) {
          if (!p || k.toLowerCase().indexOf(p) === 0) out.push({ text: k, kind: "keyword" });
        });
        // Arrows only match when the prefix looks arrow-ish (or empty).
        var arrowish = !p || /^[-.=>]+$/.test(p);
        if (arrowish) {
          ARROWS.forEach(function (a) {
            if (!p || a.indexOf(p) === 0) out.push({ text: a, kind: "arrow" });
          });
        }
        return out;
      }

      function renderPopup(cm) {
        var frag = document.createDocumentFragment();
        items.forEach(function (it, idx) {
          var row = document.createElement("div");
          row.className = NS + "item" + (idx === activeIdx ? " is-active" : "");
          var label = document.createElement("span");
          label.textContent = it.text;
          var kind = document.createElement("span");
          kind.className = NS + "kind";
          kind.textContent = it.kind;
          row.appendChild(label);
          row.appendChild(kind);
          row.addEventListener("mousedown", function (e) {
            e.preventDefault();
            activeIdx = idx;
            applyActive(cm);
          });
          frag.appendChild(row);
        });
        popEl.innerHTML = "";
        popEl.appendChild(frag);
      }

      function scrollActiveIntoView() {
        try {
          var active = popEl.children[activeIdx];
          if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
        } catch (err) { /* non-fatal */ }
      }

      function applyActive(cm) {
        try {
          var it = items[activeIdx];
          if (!it || !tokenStart) { closePopup(); return; }
          cm.replaceRange(it.text, tokenStart, cm.getCursor());
          closePopup();
          cm.focus();
        } catch (err) {
          console.error("[autocomplete] applyActive", err);
          closePopup();
        }
      }

      function openPopup(cm) {
        try {
          var word = currentWord(cm);
          var list = buildList(word.text);
          if (!list.length) { closePopup(); return; }

          items = list;
          activeIdx = 0;
          tokenStart = word.start;

          if (!popEl) {
            popEl = document.createElement("div");
            popEl.className = NS + "pop";
            popEl.setAttribute("role", "listbox");
            document.body.appendChild(popEl);
            document.addEventListener("mousedown", onDocDown, true);
            window.addEventListener("resize", closePopup);
            window.addEventListener("scroll", closePopup, true);
          }
          renderPopup(cm);

          // Position at cursor (fixed coords).
          var co = cm.cursorCoords(true, "window");
          popEl.style.left = Math.round(co.left) + "px";
          popEl.style.top = Math.round(co.bottom + 2) + "px";
        } catch (err) {
          console.error("[autocomplete] openPopup", err);
          closePopup();
        }
      }

      function move(delta) {
        if (!items.length) return;
        activeIdx = (activeIdx + delta + items.length) % items.length;
        for (var i = 0; i < popEl.children.length; i++) {
          popEl.children[i].classList.toggle("is-active", i === activeIdx);
        }
        scrollActiveIntoView();
      }

      // ---- Editor key handling ------------------------------------------
      var cm = MS.getEditor();
      if (!cm || typeof cm.cursorCoords !== "function") {
        console.error("[autocomplete] editor unavailable");
        return;
      }

      // Trigger: Ctrl/Cmd+Space
      cm.addKeyMap({
        "Ctrl-Space": function (editor) { openPopup(editor); },
        "Cmd-Space": function (editor) { openPopup(editor); }
      });

      // Navigation while the popup is open (capture before CodeMirror acts).
      cm.on("keydown", function (editor, e) {
        if (!popEl) return;
        var key = e.key;
        if (key === "ArrowDown") { e.preventDefault(); move(1); }
        else if (key === "ArrowUp") { e.preventDefault(); move(-1); }
        else if (key === "Enter" || key === "Tab") { e.preventDefault(); applyActive(editor); }
        else if (key === "Escape") { e.preventDefault(); closePopup(); }
      });

      // As-you-type: refresh/close the popup after edits.
      cm.on("change", function (editor, chg) {
        if (!popEl) return;
        // If the change was our own insertion, closePopup already ran; guard anyway.
        try {
          var word = currentWord(editor);
          if (!word.text) { closePopup(); return; }
          openPopup(editor);
        } catch (err) {
          console.error("[autocomplete] change", err);
          closePopup();
        }
      });

      cm.on("cursorActivity", function () {
        // Cursor moved via click/arrows without a matching change; keep it simple.
        if (popEl && !items.length) closePopup();
      });

      // Command palette entry.
      MS.registerCommand({
        id: "autocomplete.trigger",
        title: "Autocomplete: Suggest keywords",
        run: function () {
          try {
            var ed = MS.getEditor();
            if (ed) { ed.focus(); openPopup(ed); }
          } catch (err) { console.error("[autocomplete] command", err); }
        }
      });
    } catch (err) {
      console.error("[autocomplete] init failed", err);
    }
  });
})();
