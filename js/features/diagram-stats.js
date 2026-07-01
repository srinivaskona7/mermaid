/* Feature: Diagram Statistics — a preview-tools "Stats" button that opens a
   small popover with live stats for the current diagram: detected type, line
   count, and code-derived counts (flowchart nodes/edges, sequence messages).
   Updates on MS.on("render") and MS.on("change"). No external CDN libs. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        [
          "#dstats-pop{",
          "  position:absolute; right:12px; bottom:56px; z-index:6;",
          "  min-width:180px; max-width:240px;",
          "  padding:10px 12px; box-sizing:border-box;",
          "  background:var(--surface); color:var(--text);",
          "  border:1px solid var(--border); border-radius:var(--radius);",
          "  box-shadow:0 6px 20px rgba(0,0,0,.22);",
          "  font:12px/1.4 system-ui,sans-serif;",
          "}",
          "#dstats-pop[hidden]{display:none;}",
          "#dstats-pop .dstats-head{",
          "  font-weight:600; margin:0 0 6px; opacity:.7;",
          "  text-transform:uppercase; letter-spacing:.04em; font-size:10px;",
          "}",
          ".dstats-row{",
          "  display:flex; align-items:baseline; justify-content:space-between;",
          "  gap:10px; padding:2px 0;",
          "}",
          ".dstats-row .dstats-k{opacity:.75;}",
          ".dstats-row .dstats-v{",
          "  font-weight:600; color:var(--accent);",
          "  font-variant-numeric:tabular-nums;",
          "}",
          "#dstatsBtn.chip.dstats-on{color:var(--accent); border-color:var(--accent);}",
        ].join("\n"),
        "diagram-stats-css"
      );

      var open = false;
      var pop = null;
      var btn = null;

      // --- mount the popover inside the preview host (positioned) ---
      var host = null;
      try {
        host = (MS.els && MS.els.previewHost) || MS.el("previewHost");
      } catch (e) {
        console.error("[diagram-stats] locate host", e);
      }

      pop = document.createElement("div");
      pop.id = "dstats-pop";
      pop.setAttribute("role", "status");
      pop.setAttribute("aria-live", "polite");
      pop.hidden = true;
      if (host) {
        try {
          var cs = window.getComputedStyle(host);
          if (cs && cs.position === "static") host.style.position = "relative";
        } catch (e) {
          console.error("[diagram-stats] host position", e);
        }
        host.appendChild(pop);
      }

      // --- count occurrences of any of a set of tokens in code ---
      function countTokens(code, tokens) {
        var n = 0;
        try {
          var lines = code.split("\n");
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var t = line.trim();
            if (!t || t.indexOf("%%") === 0) continue; // skip blank + comments
            for (var j = 0; j < tokens.length; j++) {
              var tok = tokens[j];
              var idx = 0;
              while ((idx = line.indexOf(tok, idx)) !== -1) {
                n++;
                idx += tok.length;
              }
            }
          }
        } catch (e) {
          console.error("[diagram-stats] countTokens", e);
        }
        return n;
      }

      // --- non-blank, non-comment lines ---
      function contentLines(code) {
        var n = 0;
        try {
          var lines = code.split("\n");
          for (var i = 0; i < lines.length; i++) {
            var t = lines[i].trim();
            if (t && t.indexOf("%%") !== 0) n++;
          }
        } catch (e) {
          console.error("[diagram-stats] contentLines", e);
        }
        return n;
      }

      // --- compute stat rows for the current code ---
      function computeStats() {
        var rows = [];
        try {
          var code = MS.getCode() || "";
          var type = "Diagram";
          try {
            type = MS.detectType(code);
          } catch (e) {
            console.error("[diagram-stats] detectType", e);
          }
          var lineCount = code === "" ? 0 : code.split("\n").length;

          rows.push(["Type", type]);
          rows.push(["Lines", String(lineCount)]);
          rows.push(["Content lines", String(contentLines(code))]);

          if (type === "Flowchart") {
            // Edge operators (order matters: longer/compound arrows counted as one).
            var edges = countTokens(code, [
              "-->", "---", "-.->", "==>", "===", "--x", "--o",
            ]);
            rows.push(["Edges", String(edges)]);
          } else if (type === "Sequence") {
            // Message arrows in sequence diagrams. Counted with a
            // longest-token-first scan so "-->>" isn't double counted as "->>".
            rows.push(["Messages", String(countSequenceMessages(code))]);
          }
        } catch (e) {
          console.error("[diagram-stats] computeStats", e);
        }
        return rows;
      }

      // --- sequence message counter that avoids double counting -->> vs ->> ---
      function countSequenceMessages(code) {
        var n = 0;
        try {
          var lines = code.split("\n");
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var t = line.trim();
            if (!t || t.indexOf("%%") === 0) continue;
            // Match sequence message operators: ->>, -->>, ->, -->, -x, --x, ) , etc.
            // Scan character positions, longest-token-first, non-overlapping.
            var pos = 0;
            var TOKS = ["-->>", "->>", "-->", "->", "--x", "-x", "--)", "-)"];
            while (pos < line.length) {
              var matched = false;
              for (var j = 0; j < TOKS.length; j++) {
                var tok = TOKS[j];
                if (line.substr(pos, tok.length) === tok) {
                  n++;
                  pos += tok.length;
                  matched = true;
                  break;
                }
              }
              if (!matched) pos++;
            }
          }
        } catch (e) {
          console.error("[diagram-stats] countSequenceMessages", e);
        }
        return n;
      }

      // --- render the popover contents ---
      function renderPop() {
        if (!pop || !open) return;
        try {
          while (pop.firstChild) pop.removeChild(pop.firstChild);
          var head = document.createElement("div");
          head.className = "dstats-head";
          head.textContent = "Diagram stats";
          pop.appendChild(head);

          var rows = computeStats();
          for (var i = 0; i < rows.length; i++) {
            var row = document.createElement("div");
            row.className = "dstats-row";
            var k = document.createElement("span");
            k.className = "dstats-k";
            k.textContent = rows[i][0];
            var v = document.createElement("span");
            v.className = "dstats-v";
            v.textContent = rows[i][1];
            row.appendChild(k);
            row.appendChild(v);
            pop.appendChild(row);
          }
        } catch (e) {
          console.error("[diagram-stats] renderPop", e);
        }
      }

      function apply() {
        if (!pop) return;
        pop.hidden = !open;
        if (btn) btn.classList.toggle("dstats-on", open);
        if (open) renderPop();
      }

      function toggle() {
        open = !open;
        apply();
      }

      // --- preview toolbar toggle button ---
      try {
        btn = MS.addPreviewButton({
          id: "dstatsBtn",
          label: "Stats",
          title: "Toggle diagram statistics",
          icon:
            '<svg viewBox="0 0 24 24" class="ico" width="16" height="16" ' +
            'fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="18" y1="20" x2="18" y2="10"/>' +
            '<line x1="12" y1="20" x2="12" y2="4"/>' +
            '<line x1="6" y1="20" x2="6" y2="14"/></svg>',
          onClick: toggle,
        });
      } catch (e) {
        console.error("[diagram-stats] addPreviewButton", e);
      }

      // --- keep stats live ---
      try {
        MS.on("render", function () {
          if (open) renderPop();
        });
      } catch (e) {
        console.error("[diagram-stats] on render", e);
      }
      try {
        MS.on("change", function () {
          if (open) renderPop();
        });
      } catch (e) {
        console.error("[diagram-stats] on change", e);
      }

      // --- command palette entry (optional convenience) ---
      try {
        MS.registerCommand({
          id: "diagram-stats.toggle",
          title: "Diagram Stats: Toggle popover",
          run: toggle,
        });
      } catch (e) {
        console.error("[diagram-stats] registerCommand", e);
      }
    } catch (e) {
      console.error("[diagram-stats] init", e);
    }
  });
})();
