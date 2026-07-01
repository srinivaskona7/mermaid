/* Feature: Command Palette — Ctrl/Cmd+K fuzzy command launcher (no external CDN) */
(function () {
  "use strict";
  MS.ready(function (MS) {
    try {
      var SLUG = "command-palette";
      var CSS_ID = SLUG + "-css";
      var PREFIX = "cmdp"; // short namespaced prefix for ids/classes

      MS.injectCSS(
        "" +
          ".ms-palette__overlay-marker{display:none}" +
          ".ms-palette__wrap{display:flex;flex-direction:column;gap:10px}" +
          ".ms-palette__input{width:100%;box-sizing:border-box}" +
          ".ms-palette__list{list-style:none;margin:0;padding:4px 0;max-height:52vh;" +
          "overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);" +
          "background:var(--surface)}" +
          ".ms-palette__item{display:flex;align-items:center;justify-content:space-between;" +
          "gap:12px;padding:9px 12px;cursor:pointer;color:var(--text);" +
          "border-radius:var(--radius);border:1px solid transparent}" +
          ".ms-palette__item:hover{background:color-mix(in srgb,var(--accent) 12%,transparent)}" +
          ".ms-palette__item.active{background:color-mix(in srgb,var(--accent) 22%,transparent);" +
          "border-color:var(--accent)}" +
          ".ms-palette__title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
          ".ms-palette__keys{opacity:.7;font-size:.8em;font-family:ui-monospace,monospace;flex:none}" +
          ".ms-palette__empty{padding:14px 12px;opacity:.6;color:var(--text)}",
        CSS_ID
      );

      // ---- Built-in actions registered as commands -----------------------
      function safeRun(fn) {
        return function () {
          try {
            fn();
          } catch (e) {
            console.error("[" + SLUG + "] command failed", e);
            try {
              MS.toast("Command failed");
            } catch (e2) {}
          }
        };
      }

      function tidyFormat() {
        // Light indent tidy using only documented editor APIs.
        var code = MS.getCode() || "";
        var out = code
          .split("\n")
          .map(function (line) {
            return line.replace(/\s+$/, "");
          })
          .join("\n")
          .replace(/\n{3,}/g, "\n\n");
        MS.setCode(out);
        MS.toast("Formatted");
      }

      function fitDiagram() {
        var pz = MS.getPanZoom();
        if (pz) {
          pz.resize();
          pz.fit();
          pz.center();
          MS.toast("Fit to view");
        }
      }

      var builtins = [
        { id: SLUG + ".new", title: "New diagram", run: safeRun(function () { MS.createDoc(); }) },
        { id: SLUG + ".export.svg", title: "Export SVG", run: safeRun(function () { MS.doExport("svg"); }) },
        { id: SLUG + ".export.png", title: "Export PNG", run: safeRun(function () { MS.doExport("png"); }) },
        { id: SLUG + ".copy.code", title: "Copy code", run: safeRun(function () { MS.doExport("code"); }) },
        { id: SLUG + ".copy.link", title: "Copy link", run: safeRun(function () { MS.doExport("link"); }) },
        {
          id: SLUG + ".toggle.dark",
          title: "Toggle dark",
          run: safeRun(function () { MS.setDark(!MS.isDark()); }),
        },
        { id: SLUG + ".fit", title: "Fit", run: safeRun(fitDiagram) },
        { id: SLUG + ".format", title: "Format", run: safeRun(tidyFormat) },
      ];

      builtins.forEach(function (c) {
        try {
          MS.registerCommand(c);
        } catch (e) {
          console.error("[" + SLUG + "] registerCommand failed", e);
        }
      });

      // ---- Palette state -------------------------------------------------
      var open = false;
      var handle = null; // result from MS.openModal
      var listEl = null;
      var inputEl = null;
      var items = []; // current filtered [{id,title,run,keys}]
      var sel = 0;

      function allCommands() {
        var cmds = [];
        try {
          cmds = MS.getCommands() || [];
        } catch (e) {
          console.error("[" + SLUG + "] getCommands failed", e);
        }
        return cmds.filter(function (c) {
          return c && c.id && typeof c.run === "function";
        });
      }

      function matches(cmd, q) {
        if (!q) return true;
        var hay = String(cmd.title || cmd.id || "").toLowerCase();
        q = q.toLowerCase();
        if (hay.indexOf(q) !== -1) return true; // substring fast path
        // subsequence fuzzy match
        var i = 0;
        for (var j = 0; j < hay.length && i < q.length; j++) {
          if (hay[j] === q[i]) i++;
        }
        return i === q.length;
      }

      function render() {
        if (!listEl) return;
        var q = inputEl ? inputEl.value.trim() : "";
        items = allCommands().filter(function (c) {
          return matches(c, q);
        });
        if (sel >= items.length) sel = items.length - 1;
        if (sel < 0) sel = 0;

        listEl.innerHTML = "";
        if (!items.length) {
          var empty = document.createElement("li");
          empty.className = "ms-palette__empty";
          empty.textContent = "No matching commands";
          listEl.appendChild(empty);
          return;
        }
        items.forEach(function (cmd, idx) {
          var li = document.createElement("li");
          li.className = "ms-palette__item" + (idx === sel ? " active" : "");
          li.setAttribute("data-idx", String(idx));
          var t = document.createElement("span");
          t.className = "ms-palette__title";
          t.textContent = cmd.title || cmd.id;
          li.appendChild(t);
          if (cmd.keys) {
            var k = document.createElement("span");
            k.className = "ms-palette__keys";
            k.textContent = cmd.keys;
            li.appendChild(k);
          }
          li.addEventListener("mouseenter", function () {
            sel = idx;
            paintActive();
          });
          li.addEventListener("click", function () {
            runIndex(idx);
          });
          listEl.appendChild(li);
        });
      }

      function paintActive() {
        if (!listEl) return;
        var kids = listEl.querySelectorAll(".ms-palette__item");
        for (var i = 0; i < kids.length; i++) {
          if (i === sel) {
            kids[i].classList.add("active");
            if (kids[i].scrollIntoView) kids[i].scrollIntoView({ block: "nearest" });
          } else {
            kids[i].classList.remove("active");
          }
        }
      }

      function move(delta) {
        if (!items.length) return;
        sel = (sel + delta + items.length) % items.length;
        paintActive();
      }

      function runIndex(idx) {
        var cmd = items[idx];
        if (!cmd) return;
        closePalette();
        try {
          cmd.run();
        } catch (e) {
          console.error("[" + SLUG + "] run failed", e);
        }
      }

      function onKey(e) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        } else if (e.key === "Enter") {
          e.preventDefault();
          runIndex(sel);
        }
        // Esc is handled by MS.openModal's own listener.
      }

      function closePalette() {
        if (handle && typeof handle.close === "function") {
          try {
            handle.close();
          } catch (e) {
            console.error("[" + SLUG + "] close failed", e);
          }
        }
      }

      function openPalette() {
        try {
          if (open) return;
          var wrap = document.createElement("div");
          wrap.className = "ms-palette__wrap";
          wrap.id = PREFIX + "-wrap";

          inputEl = document.createElement("input");
          inputEl.type = "text";
          inputEl.className = "ms-input ms-palette__input";
          inputEl.id = PREFIX + "-input";
          inputEl.placeholder = "Type a command…";
          inputEl.autocomplete = "off";
          inputEl.spellcheck = false;

          listEl = document.createElement("ul");
          listEl.className = "ms-palette__list";
          listEl.id = PREFIX + "-list";

          wrap.appendChild(inputEl);
          wrap.appendChild(listEl);

          handle = MS.openModal({
            title: "Command Palette",
            node: wrap,
            width: "560px",
            onMount: function () {
              sel = 0;
              render();
              inputEl.addEventListener("input", function () {
                sel = 0;
                render();
              });
              inputEl.addEventListener("keydown", onKey);
              try {
                inputEl.focus();
              } catch (e) {}
            },
            onClose: function () {
              open = false;
              handle = null;
              listEl = null;
              inputEl = null;
              items = [];
            },
          });
          open = true;
        } catch (e) {
          console.error("[" + SLUG + "] openPalette failed", e);
          open = false;
        }
      }

      function toggle() {
        if (open) closePalette();
        else openPalette();
      }

      // Register the palette open itself as a command.
      MS.registerCommand({
        id: SLUG + ".open",
        title: "Command Palette: Open",
        keys: "⌘K",
        run: safeRun(openPalette),
      });

      // Refresh the visible list whenever the command registry changes.
      MS.on("commands", function () {
        try {
          if (open) render();
        } catch (e) {
          console.error("[" + SLUG + "] commands refresh failed", e);
        }
      });

      // Global Ctrl/Cmd+K shortcut.
      document.addEventListener("keydown", function (e) {
        try {
          if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.key === "k" || e.key === "K")) {
            e.preventDefault();
            toggle();
          }
        } catch (err) {
          console.error("[" + SLUG + "] shortcut failed", err);
        }
      });
    } catch (e) {
      console.error("[command-palette] setup failed", e);
    }
  });
})();
