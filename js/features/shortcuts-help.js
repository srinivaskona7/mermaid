/* Feature: Keyboard Shortcuts Help — topbar "?" button + Shift+/ opens a modal
   listing all keyboard shortcuts in a two-column table. No external CDN libs. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "shortcuts-help";

      // Mac vs others: show ⌘ vs Ctrl.
      var IS_MAC = false;
      try {
        var plat = (navigator.platform || "") + " " + (navigator.userAgent || "");
        IS_MAC = /Mac|iPhone|iPad|iPod/i.test(plat);
      } catch (e) { IS_MAC = false; }
      var MOD = IS_MAC ? "⌘" : "Ctrl";

      // Shortcut definitions. keys is an array of key tokens rendered as <kbd>.
      var SHORTCUTS = [
        { keys: [MOD, "S"], desc: "Save" },
        { keys: [MOD, "N"], desc: "New diagram" },
        { keys: [MOD, "K"], desc: "Command palette" },
        { keys: [MOD, "F"], desc: "Find" },
        { keys: ["Esc"], desc: "Exit fullscreen / close dialog" },
        { keys: ["Shift", "/"], desc: "Show this help" },
      ];

      MS.injectCSS(
        "" +
        ".shortcuts-help-modal { }" +
        ".shortcuts-help-table { width: 100%; border-collapse: collapse; font-size: 14px; }" +
        ".shortcuts-help-table tr { border-bottom: 1px solid var(--border); }" +
        ".shortcuts-help-table tr:last-child { border-bottom: 0; }" +
        ".shortcuts-help-table td { padding: 10px 8px; vertical-align: middle; color: var(--text); }" +
        ".shortcuts-help-table td.shortcuts-help-keys { white-space: nowrap; width: 42%; }" +
        ".shortcuts-help-table td.shortcuts-help-desc { color: var(--text); opacity: .9; }" +
        ".shortcuts-help-kbd { display: inline-block; min-width: 20px; text-align: center;" +
        "  padding: 3px 8px; margin-right: 4px; font-size: 12px; font-weight: 600;" +
        "  color: var(--text); background: var(--surface);" +
        "  border: 1px solid var(--border); border-radius: var(--radius);" +
        "  box-shadow: 0 1px 0 var(--border); }" +
        ".shortcuts-help-plus { margin-right: 4px; opacity: .6; }" +
        ".shortcuts-help-note { margin-top: 14px; font-size: 12.5px; opacity: .7;" +
        "  color: var(--text); border-top: 1px solid var(--border); padding-top: 10px; }" +
        ".shortcuts-help-note b { color: var(--accent); }",
        SLUG + "-css"
      );

      function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
      }

      function rowHtml(item) {
        var keysHtml = item.keys.map(function (k, i) {
          var kbd = '<kbd class="shortcuts-help-kbd">' + esc(k) + "</kbd>";
          return i < item.keys.length - 1 ? kbd + '<span class="shortcuts-help-plus">+</span>' : kbd;
        }).join("");
        return "<tr><td class=\"shortcuts-help-keys\">" + keysHtml + "</td>" +
               "<td class=\"shortcuts-help-desc\">" + esc(item.desc) + "</td></tr>";
      }

      function buildHtml() {
        var rows = SHORTCUTS.map(rowHtml).join("");
        return '<div class="shortcuts-help-modal">' +
          '<table class="shortcuts-help-table">' + rows + "</table>" +
          '<div class="shortcuts-help-note">Some features add their own shortcuts — ' +
          "open the <b>Command palette</b> to discover more.</div>" +
          "</div>";
      }

      function openHelp() {
        try {
          MS.openModal({
            title: "Keyboard Shortcuts",
            html: buildHtml(),
            width: "460px",
          });
        } catch (e) {
          console.error("[" + SLUG + "] openHelp failed", e);
        }
      }

      // Topbar "?" button.
      try {
        MS.addTopbarButton({
          id: "shortcuts-help-btn",
          title: "Keyboard shortcuts (Shift+/)",
          label: "?",
          onClick: openHelp,
        });
      } catch (e) {
        console.error("[" + SLUG + "] addTopbarButton failed", e);
      }

      // Command palette entry.
      try {
        MS.registerCommand({
          id: "shortcuts-help.open",
          title: "Help: Keyboard Shortcuts",
          run: openHelp,
        });
      } catch (e) {
        console.error("[" + SLUG + "] registerCommand failed", e);
      }

      // Global Shift+/ binding (i.e. "?"). Ignore when typing in a field.
      try {
        window.addEventListener("keydown", function (e) {
          try {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            var isQuestion = e.key === "?" || (e.shiftKey && e.key === "/");
            if (!isQuestion) return;
            var t = e.target;
            var tag = t && t.tagName ? t.tagName.toLowerCase() : "";
            if (tag === "input" || tag === "textarea" || tag === "select" ||
                (t && t.isContentEditable) ||
                (t && t.closest && t.closest(".CodeMirror"))) return;
            e.preventDefault();
            openHelp();
          } catch (err) {
            console.error("[" + SLUG + "] keydown handler failed", err);
          }
        });
      } catch (e) {
        console.error("[" + SLUG + "] keydown binding failed", e);
      }
    } catch (e) {
      console.error("[shortcuts-help] init failed", e);
    }
  });
})();
