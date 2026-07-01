/* Feature: Insert Snippets — an editor-tools "Insert" button that opens a small
   menu of reusable Mermaid building blocks (subgraph, note, classDef+class,
   style node, click, linkStyle, comment) and inserts them at the cursor via
   MS.replaceSelection. Menu closes on outside click. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "snippets";

      // Reusable Mermaid building blocks. Each `text` is inserted verbatim at
      // the cursor. A leading/trailing newline keeps blocks on their own lines.
      var SNIPPETS = [
        {
          id: "subgraph",
          label: "Subgraph block",
          desc: "Grouped nodes",
          text:
            "\nsubgraph Group [Group title]\n" +
            "  A --> B\n" +
            "end\n",
        },
        {
          id: "note",
          label: "Note",
          desc: "Sequence note",
          text: "\nNote right of A: Some note text\n",
        },
        {
          id: "classdef",
          label: "classDef + class",
          desc: "Reusable style class",
          text:
            "\nclassDef important fill:#fee,stroke:#f66,stroke-width:2px;\n" +
            "class A,B important\n",
        },
        {
          id: "style",
          label: "Style node",
          desc: "Inline node style",
          text: "\nstyle A fill:#eef,stroke:#66f,stroke-width:2px\n",
        },
        {
          id: "click",
          label: "Click callback / link",
          desc: "Interaction on a node",
          text: '\nclick A "https://example.com" "Open link" _blank\n',
        },
        {
          id: "linkstyle",
          label: "linkStyle",
          desc: "Style an edge",
          text: "\nlinkStyle 0 stroke:#f66,stroke-width:2px;\n",
        },
        {
          id: "comment",
          label: "Comment",
          desc: "Non-rendered note",
          text: "\n%% comment: describe this section\n",
        },
      ];

      MS.injectCSS(
        "\n.snip-menu{position:absolute;z-index:60;min-width:230px;" +
          "background:var(--surface);color:var(--text);" +
          "border:1px solid var(--border);border-radius:var(--radius);" +
          "padding:4px;box-shadow:0 8px 28px rgba(0,0,0,.22);}\n" +
          ".snip-item{display:flex;flex-direction:column;gap:1px;width:100%;" +
          "text-align:left;background:transparent;color:var(--text);" +
          "border:1px solid transparent;border-radius:calc(var(--radius) - 2px);" +
          "padding:6px 9px;cursor:pointer;line-height:1.3;}\n" +
          ".snip-item:hover,.snip-item:focus{background:var(--accent);" +
          "color:#fff;border-color:var(--accent);outline:none;}\n" +
          ".snip-item:hover .snip-item__desc,.snip-item:focus .snip-item__desc" +
          "{color:#fff;opacity:.85;}\n" +
          ".snip-item__label{font-size:12px;font-weight:600;}\n" +
          ".snip-item__desc{font-size:10.5px;opacity:.7;}\n",
        "snippets-css"
      );

      var menu = null; // open menu element, or null

      function closeMenu() {
        try {
          if (menu && menu.parentNode) menu.parentNode.removeChild(menu);
        } catch (e) {
          console.error("[snippets] closeMenu", e);
        }
        menu = null;
        document.removeEventListener("mousedown", onDocMouseDown, true);
        document.removeEventListener("keydown", onKeyDown, true);
      }

      function onDocMouseDown(ev) {
        try {
          if (!menu) return;
          var t = ev.target;
          if (menu.contains(t)) return;
          if (btn && (t === btn || (btn.contains && btn.contains(t)))) return;
          closeMenu();
        } catch (e) {
          console.error("[snippets] onDocMouseDown", e);
        }
      }

      function onKeyDown(ev) {
        if (ev.key === "Escape") closeMenu();
      }

      function insert(snip) {
        try {
          MS.replaceSelection(snip.text);
          MS.focusEditor();
          MS.toast("Inserted " + snip.label);
        } catch (e) {
          console.error("[snippets] insert", e);
        }
      }

      function buildMenu() {
        var m = document.createElement("div");
        m.className = "snip-menu";
        m.id = "snip-menu";
        m.setAttribute("role", "menu");
        SNIPPETS.forEach(function (snip) {
          var item = document.createElement("button");
          item.type = "button";
          item.className = "snip-item";
          item.id = "snip-item-" + snip.id;
          item.setAttribute("role", "menuitem");
          item.title = "Insert " + snip.label;

          var label = document.createElement("span");
          label.className = "snip-item__label";
          label.textContent = snip.label;

          var desc = document.createElement("span");
          desc.className = "snip-item__desc";
          desc.textContent = snip.desc;

          item.appendChild(label);
          item.appendChild(desc);
          item.addEventListener("click", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            insert(snip);
            closeMenu();
          });
          m.appendChild(item);
        });
        return m;
      }

      // Position the menu just under the trigger button.
      function positionMenu(m, anchor) {
        try {
          var r = anchor.getBoundingClientRect();
          m.style.top = Math.round(r.bottom + window.scrollY + 4) + "px";
          m.style.left = Math.round(r.left + window.scrollX) + "px";
        } catch (e) {
          console.error("[snippets] positionMenu", e);
        }
      }

      function toggleMenu() {
        try {
          if (menu) {
            closeMenu();
            return;
          }
          menu = buildMenu();
          document.body.appendChild(menu);
          positionMenu(menu, btn);
          document.addEventListener("mousedown", onDocMouseDown, true);
          document.addEventListener("keydown", onKeyDown, true);
        } catch (e) {
          console.error("[snippets] toggleMenu", e);
          closeMenu();
        }
      }

      var btn = null;
      try {
        btn = MS.addEditorButton({
          id: "snip-btn",
          label: "Insert",
          title: "Insert a Mermaid snippet",
          icon:
            '<svg viewBox="0 0 24 24" class="ico" width="14" height="14" ' +
            'fill="none" stroke="currentColor" stroke-width="2" ' +
            'stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 5v14M5 12h14"/></svg>',
          onClick: function (ev) {
            if (ev) {
              ev.preventDefault();
              ev.stopPropagation();
            }
            toggleMenu();
          },
        });
      } catch (e) {
        console.error("[snippets] addEditorButton", e);
      }

      // Command palette entries for each snippet.
      try {
        SNIPPETS.forEach(function (snip) {
          MS.registerCommand({
            id: SLUG + ".insert." + snip.id,
            title: "Insert Snippet: " + snip.label,
            run: function () { insert(snip); },
          });
        });
      } catch (e) {
        console.error("[snippets] registerCommand", e);
      }

      // Close the menu when the document changes underneath it.
      try {
        MS.on("docswitch", closeMenu);
      } catch (e) {
        console.error("[snippets] events", e);
      }
    } catch (e) {
      console.error("[snippets] init", e);
    }
  });
})();
