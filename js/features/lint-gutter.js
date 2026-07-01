/* Feature: Live Error Gutter — flags the offending line on mermaid errors */
/* No external CDN libs loaded. Uses only window.MS + CodeMirror 5 (already present). */
(function () {
  "use strict";

  MS.ready(function (MS) {
    var GUTTER_ID = "lint-gutter";
    var LINE_CLASS = "lint-error-line";

    MS.injectCSS(
      "\n" +
      ".CodeMirror .lint-gutter { width: 14px; }\n" +
      ".lint-marker {\n" +
      "  color: var(--accent, #e5484d);\n" +
      "  display: inline-block;\n" +
      "  width: 10px; height: 10px; line-height: 10px;\n" +
      "  margin-left: 2px;\n" +
      "  border-radius: 50%;\n" +
      "  background: var(--accent, #e5484d);\n" +
      "  box-shadow: 0 0 0 2px var(--surface, transparent);\n" +
      "  cursor: help;\n" +
      "}\n" +
      ".CodeMirror .lint-error-line {\n" +
      "  background: color-mix(in srgb, var(--accent, #e5484d) 16%, transparent);\n" +
      "}\n",
      "lint-gutter-css"
    );

    // Register our gutter, preserving any gutters already configured.
    try {
      var editor = MS.getEditor();
      if (!editor) return;
      var existing = editor.getOption("gutters") || [];
      if (existing.indexOf(GUTTER_ID) === -1) {
        // Keep CodeMirror's line-number gutter last so numbers stay aligned.
        var next = existing.slice();
        var lnIdx = next.indexOf("CodeMirror-linenumbers");
        if (lnIdx === -1) next.push(GUTTER_ID);
        else next.splice(lnIdx, 0, GUTTER_ID);
        editor.setOption("gutters", next);
      }
    } catch (e) {
      console.error("[lint-gutter] gutter setup failed", e);
      return;
    }

    // Track what we've marked so we can clear precisely.
    var markedLines = [];

    function clearMarkers() {
      try {
        var editor = MS.getEditor();
        if (!editor) return;
        for (var i = 0; i < markedLines.length; i++) {
          var ln = markedLines[i];
          try {
            editor.setGutterMarker(ln, GUTTER_ID, null);
            editor.removeLineClass(ln, "background", LINE_CLASS);
          } catch (inner) { /* line may no longer exist */ }
        }
        markedLines = [];
      } catch (e) {
        console.error("[lint-gutter] clear failed", e);
      }
    }

    // Pull a 1-based line number out of a mermaid error message, if present.
    function parseLine(message) {
      if (!message) return null;
      try {
        var patterns = [
          /line[\s:#]*?(\d+)/i,      // "line 5", "Line: 5", "line #5"
          /Parse error on line (\d+)/i,
          /at line (\d+)/i,
          /\((\d+):\d+\)/            // "(5:12)" style position
        ];
        for (var i = 0; i < patterns.length; i++) {
          var m = message.match(patterns[i]);
          if (m && m[1]) {
            var n = parseInt(m[1], 10);
            if (!isNaN(n) && n > 0) return n;
          }
        }
      } catch (e) {
        console.error("[lint-gutter] parse failed", e);
      }
      return null;
    }

    function makeMarker(title) {
      var dot = document.createElement("span");
      dot.className = "lint-marker";
      if (title) dot.title = title;
      return dot;
    }

    function onError(data) {
      try {
        var editor = MS.getEditor();
        if (!editor) return;
        clearMarkers();
        var message = data && data.message ? String(data.message) : "";
        var lineNo = parseLine(message);
        if (lineNo == null) return; // no line info — nothing to point at
        var idx = lineNo - 1; // CodeMirror lines are 0-based
        if (idx < 0 || idx >= editor.lineCount()) return;
        editor.setGutterMarker(idx, GUTTER_ID, makeMarker(message));
        editor.addLineClass(idx, "background", LINE_CLASS);
        markedLines.push(idx);
      } catch (e) {
        console.error("[lint-gutter] onError failed", e);
      }
    }

    function onRender() {
      clearMarkers();
    }

    try {
      MS.on("error", onError);
      MS.on("render", onRender);
    } catch (e) {
      console.error("[lint-gutter] subscribe failed", e);
    }
  });
})();
