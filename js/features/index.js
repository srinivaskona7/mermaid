/* Mermaid Studio — feature loader.
   Loads each js/features/<slug>.js sequentially. A module that 404s or
   throws is logged and skipped so it can never take down the app.
   Order is not significant: every module self-registers via MS.ready(). */
(function () {
  "use strict";
  var FEATURES = [
    "command-palette",
    "sequence-examples",
    "version-selector",
    "diagram-config",
    "export-pdf",
    "search-replace",
    "shortcuts-help",
    "layout-direction",
    "bg-toggle",
    "minimap",
    "editor-fontsize",
    "word-wrap",
    "import-url",
    "present-mode",
    "diagram-stats",
    "theme-editor",
    "qr-share",
    "split-orientation",
    "auto-theme",
    "gallery",
    "snippets",
    "autocomplete",
    "undo-history",
    "copy-markdown",
    "embed-code",
    "print-diagram",
    "line-numbers-toggle",
    "lint-gutter",
    "more-types",
    "accessibility"
  ];

  var i = 0;
  function next() {
    if (i >= FEATURES.length) return;
    var slug = FEATURES[i++];
    var s = document.createElement("script");
    s.src = "js/features/" + slug + ".js";
    s.async = false;
    s.onload = next;
    s.onerror = function () { console.warn("[MS] feature not loaded: " + slug); next(); };
    document.head.appendChild(s);
  }
  next();
})();
