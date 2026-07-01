/* Feature: Flowchart Direction Toggle — editor chips (TB/LR/RL/BT) that rewrite
   the direction token on the first flowchart/graph line via MS.getCode/setCode. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "layout-direction";
      var DIRS = ["TB", "LR", "RL", "BT"];
      var chips = {}; // dir -> button el

      MS.injectCSS(
        "\n.ld-wrap{display:inline-flex;align-items:center;gap:2px;" +
          "border:1px solid var(--border);border-radius:var(--radius);" +
          "padding:2px;background:var(--surface);}\n" +
          ".ld-chip{min-width:30px;font-size:11px;font-weight:600;" +
          "border:1px solid transparent;background:transparent;color:var(--text);" +
          "border-radius:calc(var(--radius) - 2px);padding:2px 6px;cursor:pointer;" +
          "line-height:1.4;opacity:.75;}\n" +
          ".ld-chip:hover{opacity:1;border-color:var(--border);}\n" +
          ".ld-chip.ld-active{background:var(--accent);color:#fff;opacity:1;" +
          "border-color:var(--accent);}\n",
        "layout-direction-css"
      );

      // Match the first non-comment code line and, if it's a flowchart/graph
      // declaration, capture its keyword + optional direction token.
      // e.g. "flowchart LR", "graph TD", "flowchart" (no dir).
      var LINE_RE = /^(\s*)(flowchart|graph)([ \t]+([A-Za-z]{2}))?\b(.*)$/;

      // Normalize legacy synonyms Mermaid accepts so highlighting is accurate.
      function normalizeDir(tok) {
        if (!tok) return null;
        var t = tok.toUpperCase();
        if (t === "TD") return "TB"; // TD is an alias of TB
        return DIRS.indexOf(t) >= 0 ? t : null;
      }

      // Find the index of the first non-blank, non-comment line.
      function firstCodeLineIndex(lines) {
        for (var i = 0; i < lines.length; i++) {
          var t = lines[i].trim();
          if (t && t.indexOf("%%") !== 0) return i;
        }
        return -1;
      }

      // Return the current direction of the diagram, or null if not detectable.
      function currentDir() {
        try {
          var code = MS.getCode();
          var lines = code.split("\n");
          var idx = firstCodeLineIndex(lines);
          if (idx < 0) return null;
          var m = LINE_RE.exec(lines[idx]);
          if (!m) return null;
          return normalizeDir(m[4]) || "TB"; // flowchart with no dir defaults to TB
        } catch (e) {
          console.error("[layout-direction] currentDir", e);
          return null;
        }
      }

      function isFlowchart() {
        try {
          return MS.detectType(MS.getCode()) === "Flowchart";
        } catch (e) {
          console.error("[layout-direction] isFlowchart", e);
          return false;
        }
      }

      // Rewrite the direction token on the first flowchart/graph line.
      function applyDir(dir) {
        try {
          if (DIRS.indexOf(dir) < 0) return;
          if (!isFlowchart()) {
            MS.toast("Direction applies to flowcharts");
            return;
          }
          var code = MS.getCode();
          var lines = code.split("\n");
          var idx = firstCodeLineIndex(lines);
          if (idx < 0) return;
          var m = LINE_RE.exec(lines[idx]);
          if (!m) {
            MS.toast("Direction applies to flowcharts");
            return;
          }
          // m[1]=leading ws, m[2]=keyword, m[5]=trailing remainder
          lines[idx] = m[1] + m[2] + " " + dir + (m[5] || "");
          MS.setCode(lines.join("\n"));
          highlight(dir);
        } catch (e) {
          console.error("[layout-direction] applyDir", e);
        }
      }

      function highlight(dir) {
        try {
          DIRS.forEach(function (d) {
            if (chips[d]) chips[d].classList.toggle("ld-active", d === dir);
          });
        } catch (e) {
          console.error("[layout-direction] highlight", e);
        }
      }

      function refresh() {
        try {
          var flow = isFlowchart();
          var dir = flow ? currentDir() : null;
          DIRS.forEach(function (d) {
            if (!chips[d]) return;
            chips[d].disabled = !flow;
            chips[d].style.opacity = flow ? "" : ".4";
            chips[d].style.cursor = flow ? "pointer" : "not-allowed";
          });
          highlight(dir);
        } catch (e) {
          console.error("[layout-direction] refresh", e);
        }
      }

      // Build the chip group inside an editor toolbar button host.
      try {
        var host = MS.addEditorButton({
          id: "ld-host",
          title: "Flowchart direction",
        });
        if (host) {
          // Repurpose the chip host as a container for the direction group.
          host.innerHTML = "";
          host.classList.remove("chip");
          host.style.padding = "0";
          host.style.border = "0";
          host.style.background = "transparent";
          host.setAttribute("aria-label", "Flowchart direction");

          var wrap = document.createElement("span");
          wrap.className = "ld-wrap";

          DIRS.forEach(function (d) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "ld-chip";
            b.id = "ld-chip-" + d;
            b.textContent = d;
            b.title = "Flowchart direction " + d;
            b.addEventListener("click", function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              applyDir(d);
            });
            chips[d] = b;
            wrap.appendChild(b);
          });

          host.appendChild(wrap);
        }
      } catch (e) {
        console.error("[layout-direction] build UI", e);
      }

      // Command palette entries for each direction.
      try {
        DIRS.forEach(function (d) {
          MS.registerCommand({
            id: SLUG + ".set." + d.toLowerCase(),
            title: "Flowchart Direction: " + d,
            run: function () { applyDir(d); },
          });
        });
      } catch (e) {
        console.error("[layout-direction] registerCommand", e);
      }

      // Keep highlight/enabled-state in sync with editor + render events.
      try {
        MS.on("change", refresh);
        MS.on("render", refresh);
        MS.on("docswitch", refresh);
      } catch (e) {
        console.error("[layout-direction] events", e);
      }

      refresh();
    } catch (e) {
      console.error("[layout-direction] init", e);
    }
  });
})();
