/* Feature: Auto-Fix — detect and repair common Mermaid syntax errors.
 *
 * CDN: NONE. Uses the already-loaded mermaid (via MS.MERMAID) to VALIDATE each
 * candidate repair with mermaid.parse before committing, so a fix is only applied
 * when it turns invalid code into valid code (or is a pure-safe normalization).
 */
(function () {
  "use strict";
  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        ".autofix-chip.autofix-alert{border-color:var(--danger);color:var(--danger);animation:autofix-pulse 1.1s ease-in-out infinite}" +
        "@keyframes autofix-pulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 0 3px color-mix(in srgb,var(--danger) 22%,transparent)}}",
        "auto-fix-css"
      );

      var DIAGRAM_HEADERS = /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|mindmap|gitGraph|journey|timeline|quadrantChart|sankey(-beta)?|xychart(-beta)?|requirementDiagram|C4Context|block(-beta)?)\b/;

      function firstMeaningfulLine(code) {
        var lines = code.split("\n");
        for (var i = 0; i < lines.length; i++) {
          var t = lines[i].trim();
          if (t && t.indexOf("%%") !== 0) return t;
        }
        return "";
      }
      function hasHeader(code) { return DIAGRAM_HEADERS.test(firstMeaningfulLine(code)); }
      function isFlowchart(code) { return /^(flowchart|graph)\b/.test(firstMeaningfulLine(code)); }

      // ---- Individual safe transforms; each returns {code, changed, note} ----
      function normalizeText(code) {
        var out = code
          .replace(/^﻿/, "")                       // strip BOM
          .replace(/[“”]/g, '"')              // smart double quotes
          .replace(/[‘’]/g, "'")              // smart single quotes
          .replace(/ /g, " ")                      // non-breaking space
          .replace(/–|—/g, "-")               // en/em dash -> hyphen
          .replace(/\t/g, "  ")                          // tabs -> 2 spaces
          .replace(/[ \t]+$/gm, "");                     // trailing whitespace
        return { code: out, changed: out !== code, note: "normalized quotes/spacing" };
      }
      function fixBreaks(code) {
        // Mermaid needs self-closing <br/>. Normalize <br> and <br /> variants.
        var out = code.replace(/<br\s*\/?\s*>/gi, "<br/>");
        return { code: out, changed: out !== code, note: "fixed <br/> tags" };
      }
      function fixArrows(code) {
        if (!isFlowchart(code)) return { code: code, changed: false, note: "" };
        var out = code
          // single-dash arrow "->" (not part of "-->" or "->>") to "-->"
          .replace(/(^|[^\-<>])-\s*>(?![>-])/g, "$1-->")
          // fat arrow "=>" (not "==>") to "==>"
          .replace(/(^|[^=])=\s*>(?!=)/g, "$1==>");
        return { code: out, changed: out !== code, note: "fixed flowchart arrows" };
      }

      function applySafe(code, notes) {
        [normalizeText, fixBreaks, fixArrows].forEach(function (fn) {
          var r = fn(code);
          if (r.changed) { code = r.code; notes.push(r.note); }
        });
        return code;
      }

      function tryParse(code) {
        try {
          var m = MS.MERMAID;
          if (!m || !m.parse) return Promise.resolve(false);
          return Promise.resolve(m.parse(code)).then(function () { return true; }).catch(function () { return false; });
        } catch (e) { return Promise.resolve(false); }
      }

      // Progressive candidates, least-invasive first.
      function buildCandidates(original) {
        var notesA = [];
        var safe = applySafe(original, notesA);
        var list = [{ code: safe, notes: notesA.slice() }];
        if (!hasHeader(safe)) {
          list.push({ code: "flowchart TD\n" + safe, notes: notesA.concat(["added missing diagram header (flowchart TD)"]) });
        }
        // de-dupe by code, drop ones identical to original
        var seen = {};
        return list.filter(function (c) {
          if (c.code === original || seen[c.code]) return false;
          seen[c.code] = 1; return true;
        });
      }

      function runAutoFix() {
        var original = MS.getCode();
        if (!original || !original.trim()) { MS.toast("Nothing to fix — the editor is empty"); return; }

        tryParse(original).then(function (origValid) {
          var candidates = buildCandidates(original);

          // Walk candidates; apply the first that PARSES cleanly.
          (function walk(i) {
            if (i >= candidates.length) {
              // No structural fix parsed. If a safe normalization changed things
              // and the original was already valid, still tidy it.
              if (candidates.length && origValid) {
                MS.setCode(candidates[0].code);
                MS.toast("Tidied: " + candidates[0].notes.join(", "));
              } else if (origValid) {
                MS.toast("Looks valid already — nothing to fix");
              } else {
                MS.toast("Couldn't auto-fix — see the error panel for details");
              }
              return;
            }
            tryParse(candidates[i].code).then(function (ok) {
              if (ok) {
                MS.setCode(candidates[i].code);
                var n = candidates[i].notes;
                MS.toast(n.length ? "Fixed: " + n.join(", ") : "Fixed syntax");
              } else {
                walk(i + 1);
              }
            });
          })(0);
        });
      }

      // Editor toolbar button + command.
      var chip = MS.addEditorButton({
        id: "autofixBtn",
        label: "Fix",
        title: "Auto-fix common Mermaid syntax errors",
        onClick: runAutoFix,
      });
      if (chip) chip.classList.add("autofix-chip");

      MS.registerCommand({ id: "auto-fix.run", title: "Auto-fix: repair syntax errors", run: runAutoFix });

      // Draw attention to the Fix button while the diagram is in an error state.
      MS.on("error", function () { if (chip) chip.classList.add("autofix-alert"); });
      MS.on("render", function () { if (chip) chip.classList.remove("autofix-alert"); });
    } catch (e) {
      console.error("[auto-fix]", e);
    }
  });
})();
