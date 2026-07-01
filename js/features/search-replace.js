/* Feature: Find & Replace — in-editor find/replace panel over the CodeMirror editor.
   No external CDN libraries loaded. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "sr";

      MS.injectCSS(
        "" +
          "." + SLUG + "-panel{position:absolute;top:8px;right:12px;z-index:40;" +
          "display:none;flex-direction:column;gap:6px;padding:10px;min-width:250px;" +
          "background:var(--surface);color:var(--text);border:1px solid var(--border);" +
          "border-radius:var(--radius);box-shadow:0 6px 24px rgba(0,0,0,.25);}" +
          "." + SLUG + "-panel." + SLUG + "-open{display:flex;}" +
          "." + SLUG + "-row{display:flex;align-items:center;gap:6px;}" +
          "." + SLUG + "-row ." + SLUG + "-input{flex:1;min-width:0;}" +
          "." + SLUG + "-count{font-size:12px;opacity:.8;min-width:64px;text-align:right;}" +
          "." + SLUG + "-btns{display:flex;flex-wrap:wrap;gap:6px;}" +
          "." + SLUG + "-btn{cursor:pointer;padding:4px 10px;font-size:13px;line-height:1.4;" +
          "background:var(--surface);color:var(--text);border:1px solid var(--border);" +
          "border-radius:var(--radius);}" +
          "." + SLUG + "-btn--primary{background:var(--accent);border-color:var(--accent);color:#fff;}" +
          "." + SLUG + "-close{margin-left:auto;cursor:pointer;background:transparent;border:none;" +
          "color:var(--text);font-size:15px;line-height:1;opacity:.7;padding:2px 4px;}" +
          "." + SLUG + "-close:hover{opacity:1;}",
        "search-replace-css"
      );

      var editor = MS.getEditor();
      if (!editor) {
        console.error("[search-replace] no editor available");
        return;
      }

      // ---- State ----
      var matches = [];      // array of {from:{line,ch}, to:{line,ch}}
      var current = -1;      // index into matches of the active match
      var panel = null;
      var findInput, replaceInput, countEl;

      // ---- Match finding (manual, no addon dependency) ----
      function buildMatches() {
        matches = [];
        try {
          var needle = findInput ? findInput.value : "";
          if (!needle) return;
          var doc = editor.getDoc();
          var value = editor.getValue();
          var lower = value.toLowerCase();
          var nlower = needle.toLowerCase();
          var idx = 0;
          while (true) {
            var found = lower.indexOf(nlower, idx);
            if (found === -1) break;
            var from = doc.posFromIndex(found);
            var to = doc.posFromIndex(found + needle.length);
            matches.push({ from: from, to: to });
            idx = found + (needle.length || 1);
          }
        } catch (e) {
          console.error("[search-replace] buildMatches", e);
        }
      }

      function updateCount() {
        try {
          if (!countEl) return;
          if (!findInput.value) { countEl.textContent = ""; return; }
          if (!matches.length) { countEl.textContent = "0 / 0"; return; }
          countEl.textContent = (current + 1) + " / " + matches.length;
        } catch (e) {
          console.error("[search-replace] updateCount", e);
        }
      }

      function selectMatch(i) {
        try {
          if (!matches.length) { current = -1; updateCount(); return; }
          current = ((i % matches.length) + matches.length) % matches.length;
          var m = matches[current];
          editor.setSelection(m.from, m.to);
          editor.scrollIntoView({ from: m.from, to: m.to }, 40);
          updateCount();
        } catch (e) {
          console.error("[search-replace] selectMatch", e);
        }
      }

      function refresh(preferCursor) {
        buildMatches();
        if (!matches.length) { current = -1; updateCount(); return; }
        var start = 0;
        if (preferCursor) {
          try {
            var doc = editor.getDoc();
            var cur = doc.indexFromPos(editor.getCursor("from"));
            for (var i = 0; i < matches.length; i++) {
              if (doc.indexFromPos(matches[i].from) >= cur) { start = i; break; }
            }
          } catch (e) { start = 0; }
        }
        selectMatch(start);
      }

      function findNext() { if (!matches.length) refresh(true); else selectMatch(current + 1); }
      function findPrev() { if (!matches.length) refresh(true); else selectMatch(current - 1); }

      function replaceOne() {
        try {
          if (!matches.length || current < 0) { findNext(); return; }
          var m = matches[current];
          var repl = replaceInput ? replaceInput.value : "";
          editor.replaceRange(repl, m.from, m.to, "+sr");
          buildMatches();
          if (!matches.length) { current = -1; updateCount(); return; }
          selectMatch(Math.min(current, matches.length - 1));
        } catch (e) {
          console.error("[search-replace] replaceOne", e);
        }
      }

      function replaceAll() {
        try {
          buildMatches();
          if (!matches.length) { MS.toast("No matches"); return; }
          var repl = replaceInput ? replaceInput.value : "";
          var count = matches.length;
          editor.operation(function () {
            // Replace from the end so earlier positions stay valid.
            for (var i = matches.length - 1; i >= 0; i--) {
              editor.replaceRange(repl, matches[i].from, matches[i].to, "+sr");
            }
          });
          matches = [];
          current = -1;
          updateCount();
          MS.toast("Replaced " + count + " match" + (count === 1 ? "" : "es"));
        } catch (e) {
          console.error("[search-replace] replaceAll", e);
        }
      }

      // ---- Panel construction ----
      function buildPanel() {
        var host = MS.els && MS.els.editorPane ? MS.els.editorPane : null;
        if (!host) { console.error("[search-replace] no editor pane host"); return null; }
        if (getComputedStyle(host).position === "static") host.style.position = "relative";

        var p = document.createElement("div");
        p.className = SLUG + "-panel";
        p.id = SLUG + "-panel";

        var findRow = document.createElement("div");
        findRow.className = SLUG + "-row";
        findInput = document.createElement("input");
        findInput.type = "text";
        findInput.className = "ms-input " + SLUG + "-input";
        findInput.id = SLUG + "-find";
        findInput.placeholder = "Find";
        countEl = document.createElement("span");
        countEl.className = SLUG + "-count";
        countEl.id = SLUG + "-count";
        var closeBtn = document.createElement("button");
        closeBtn.className = SLUG + "-close";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Close");
        closeBtn.textContent = "✕";
        findRow.appendChild(findInput);
        findRow.appendChild(countEl);
        findRow.appendChild(closeBtn);

        var replaceRow = document.createElement("div");
        replaceRow.className = SLUG + "-row";
        replaceInput = document.createElement("input");
        replaceInput.type = "text";
        replaceInput.className = "ms-input " + SLUG + "-input";
        replaceInput.id = SLUG + "-replace";
        replaceInput.placeholder = "Replace with";
        replaceRow.appendChild(replaceInput);

        var btns = document.createElement("div");
        btns.className = SLUG + "-btns";
        var bPrev = mkBtn("Prev", false, findPrev);
        var bNext = mkBtn("Next", true, findNext);
        var bRepl = mkBtn("Replace", false, replaceOne);
        var bAll = mkBtn("All", false, replaceAll);
        btns.appendChild(bPrev);
        btns.appendChild(bNext);
        btns.appendChild(bRepl);
        btns.appendChild(bAll);

        p.appendChild(findRow);
        p.appendChild(replaceRow);
        p.appendChild(btns);
        host.appendChild(p);

        // Events
        closeBtn.addEventListener("click", closePanel);
        findInput.addEventListener("input", function () { refresh(true); });
        findInput.addEventListener("keydown", onInputKey);
        replaceInput.addEventListener("keydown", onInputKey);
        p.addEventListener("keydown", function (e) {
          if (e.key === "Escape") { e.preventDefault(); closePanel(); }
        });

        return p;
      }

      function mkBtn(label, primary, handler) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = SLUG + "-btn" + (primary ? " " + SLUG + "-btn--primary" : "");
        b.textContent = label;
        b.addEventListener("click", handler);
        return b;
      }

      function onInputKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) findPrev(); else findNext();
        } else if (e.key === "Escape") {
          e.preventDefault();
          closePanel();
        }
      }

      function ensurePanel() {
        if (!panel) panel = buildPanel();
        return panel;
      }

      function openPanel(showReplace) {
        try {
          if (!ensurePanel()) return;
          panel.classList.add(SLUG + "-open");
          // Seed find field from the current selection when present.
          var sel = editor.getSelection();
          if (sel && sel.indexOf("\n") === -1) findInput.value = sel;
          var replaceRow = panel.children[1];
          if (replaceRow) replaceRow.style.display = showReplace ? "" : "none";
          refresh(true);
          findInput.focus();
          findInput.select();
        } catch (e) {
          console.error("[search-replace] openPanel", e);
        }
      }

      function closePanel() {
        try {
          if (panel) panel.classList.remove(SLUG + "-open");
          MS.focusEditor();
        } catch (e) {
          console.error("[search-replace] closePanel", e);
        }
      }

      // ---- Key bindings on the editor (Ctrl/Cmd+F, Ctrl/Cmd+H) ----
      function bindKeys() {
        try {
          editor.addKeyMap({
            "Ctrl-F": function () { openPanel(false); },
            "Cmd-F": function () { openPanel(false); },
            "Ctrl-H": function () { openPanel(true); },
            "Cmd-H": function () { openPanel(true); }
          });
        } catch (e) {
          console.error("[search-replace] bindKeys", e);
        }
      }

      bindKeys();

      // Commands for the palette.
      MS.registerCommand({
        id: "search-replace.find",
        title: "Find in editor",
        run: function () { openPanel(false); }
      });
      MS.registerCommand({
        id: "search-replace.replace",
        title: "Find & Replace in editor",
        run: function () { openPanel(true); }
      });
    } catch (e) {
      console.error("[search-replace] init failed", e);
    }
  });
})();
