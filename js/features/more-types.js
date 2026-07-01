/* Feature: More Diagram Types — gallery of one syntax-correct example per Mermaid v11 diagram type */
/* No external CDN libraries are loaded by this module. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      MS.injectCSS(
        [
          ".mt-intro{margin:2px 2px 14px;font-size:13px;line-height:1.5;opacity:.75;color:var(--text)}",
          ".mt-grid{max-height:62vh;overflow:auto;padding:2px}",
          ".mt-card{cursor:pointer;display:flex;flex-direction:column;gap:6px;transition:border-color .12s ease,transform .12s ease}",
          ".mt-card:hover,.mt-card:focus-visible{border-color:var(--accent);transform:translateY(-2px);outline:none}",
          ".mt-card__title{color:var(--text)}",
          ".mt-card__desc{font-size:11px;opacity:.65;color:var(--text)}",
          ".mt-card__tag{align-self:flex-start;margin-top:2px;font-size:10px;letter-spacing:.02em;padding:2px 7px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--accent)}"
        ].join("\n"),
        "more-types-css"
      );

      // Each example verified to parse on Mermaid v11.
      var EXAMPLES = [
        {
          name: "Class Diagram",
          desc: "OOP classes, members and relationships",
          tag: "classDiagram",
          code: [
            "classDiagram",
            "  class Animal {",
            "    +String name",
            "    +int age",
            "    +makeSound() void",
            "  }",
            "  class Dog {",
            "    +String breed",
            "    +fetch() void",
            "  }",
            "  Animal <|-- Dog",
            "  Animal : +eat()"
          ].join("\n")
        },
        {
          name: "State Diagram",
          desc: "States and transitions (v2)",
          tag: "stateDiagram-v2",
          code: [
            "stateDiagram-v2",
            "  [*] --> Idle",
            "  Idle --> Running : start",
            "  Running --> Idle : stop",
            "  Running --> [*] : shutdown"
          ].join("\n")
        },
        {
          name: "Entity Relationship",
          desc: "Entities, attributes and cardinality",
          tag: "erDiagram",
          code: [
            "erDiagram",
            "  CUSTOMER ||--o{ ORDER : places",
            "  ORDER ||--|{ LINE_ITEM : contains",
            "  CUSTOMER {",
            "    string name",
            "    string email",
            "  }",
            "  ORDER {",
            "    int orderNumber",
            "    date created",
            "  }"
          ].join("\n")
        },
        {
          name: "Gantt Chart",
          desc: "Project timeline with sections",
          tag: "gantt",
          code: [
            "gantt",
            "  title Project Plan",
            "  dateFormat YYYY-MM-DD",
            "  section Design",
            "  Research      :a1, 2024-01-01, 7d",
            "  Wireframes    :a2, after a1, 5d",
            "  section Build",
            "  Development   :b1, after a2, 10d",
            "  Testing       :b2, after b1, 4d"
          ].join("\n")
        },
        {
          name: "Pie Chart",
          desc: "Labeled proportional slices",
          tag: "pie",
          code: [
            "pie title Traffic sources",
            '  "Search" : 45',
            '  "Direct" : 30',
            '  "Social" : 15',
            '  "Referral" : 10'
          ].join("\n")
        },
        {
          name: "Mindmap",
          desc: "Hierarchical idea tree",
          tag: "mindmap",
          code: [
            "mindmap",
            "  root((Mermaid))",
            "    Origins",
            "      Long history",
            "      Popularization",
            "    Uses",
            "      Docs",
            "      Diagrams",
            "    Tools",
            "      Editor",
            "      CLI"
          ].join("\n")
        },
        {
          name: "Git Graph",
          desc: "Branches, commits and merges",
          tag: "gitGraph",
          code: [
            "gitGraph",
            "  commit",
            "  branch develop",
            "  checkout develop",
            "  commit",
            "  commit",
            "  checkout main",
            "  merge develop",
            "  commit"
          ].join("\n")
        },
        {
          name: "User Journey",
          desc: "Task satisfaction across actors",
          tag: "journey",
          code: [
            "journey",
            "  title My working day",
            "  section Go to work",
            "    Make tea: 5: Me",
            "    Commute: 3: Me, Cat",
            "  section Work",
            "    Code: 4: Me",
            "    Review: 2: Me"
          ].join("\n")
        },
        {
          name: "Timeline",
          desc: "Chronological events by period",
          tag: "timeline",
          code: [
            "timeline",
            "  title History of Social Media",
            "  2002 : LinkedIn",
            "  2004 : Facebook",
            "  2005 : YouTube",
            "  2006 : Twitter"
          ].join("\n")
        },
        {
          name: "Quadrant Chart",
          desc: "Points across two axes",
          tag: "quadrantChart",
          code: [
            "quadrantChart",
            "  title Reach and engagement",
            "  x-axis Low Reach --> High Reach",
            "  y-axis Low Engagement --> High Engagement",
            "  quadrant-1 We should expand",
            "  quadrant-2 Need to promote",
            "  quadrant-3 Re-evaluate",
            "  quadrant-4 May be improved",
            "  Campaign A: [0.3, 0.6]",
            "  Campaign B: [0.45, 0.23]",
            "  Campaign C: [0.57, 0.69]"
          ].join("\n")
        },
        {
          name: "Sankey Diagram",
          desc: "Weighted flows between nodes",
          tag: "sankey-beta",
          code: [
            "sankey-beta",
            "",
            "Agricultural,Bio-conversion,124.729",
            "Bio-conversion,Liquid,0.597",
            "Bio-conversion,Losses,26.862",
            "Bio-conversion,Solid,280.322",
            "Bio-conversion,Gas,81.144"
          ].join("\n")
        },
        {
          name: "XY Chart",
          desc: "Bar and line series on axes",
          tag: "xychart-beta",
          code: [
            "xychart-beta",
            '  title "Sales Revenue"',
            '  x-axis [jan, feb, mar, apr, may]',
            '  y-axis "Revenue (k)" 0 --> 100',
            "  bar [30, 45, 60, 50, 80]",
            "  line [20, 40, 55, 45, 75]"
          ].join("\n")
        },
        {
          name: "Block Diagram",
          desc: "Composable blocks and arrows",
          tag: "block-beta",
          code: [
            "block-beta",
            "  columns 3",
            "  a[\"Ingest\"] b[\"Process\"] c[\"Store\"]",
            "  a --> b",
            "  b --> c"
          ].join("\n")
        },
        {
          name: "C4 Context",
          desc: "System context diagram (C4)",
          tag: "C4Context",
          code: [
            "C4Context",
            "  title System Context diagram",
            "  Person(customer, \"Customer\", \"A user of the system\")",
            "  System(webapp, \"Web App\", \"Delivers content to users\")",
            "  System_Ext(email, \"Email System\", \"Sends notifications\")",
            "  Rel(customer, webapp, \"Uses\")",
            "  Rel(webapp, email, \"Sends email via\")"
          ].join("\n")
        },
        {
          name: "Requirement Diagram",
          desc: "Requirements linked to elements",
          tag: "requirementDiagram",
          code: [
            "requirementDiagram",
            "  requirement test_req {",
            "    id: 1",
            "    text: the test text.",
            "    risk: high",
            "    verifymethod: test",
            "  }",
            "  element test_entity {",
            "    type: simulation",
            "  }",
            "  test_entity - satisfies -> test_req"
          ].join("\n")
        }
      ];

      function loadExample(ex) {
        try {
          MS.setCode(ex.code || "");
          if (ex.name) MS.setTitle(ex.name);
          MS.closeModal();
          MS.focusEditor();
          MS.toast("Loaded example: " + (ex.name || "Untitled"));
        } catch (e) {
          console.error("[more-types] loadExample failed", e);
        }
      }

      function buildCard(ex) {
        var card = document.createElement("div");
        card.className = "ms-card mt-card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.title = "Load: " + (ex.name || "Untitled");

        var title = document.createElement("div");
        title.className = "ms-card__title mt-card__title";
        title.textContent = ex.name || "Untitled";

        var tag = document.createElement("code");
        tag.className = "mt-card__tag";
        tag.textContent = ex.tag || "";

        var desc = document.createElement("div");
        desc.className = "ms-card__body mt-card__desc";
        desc.textContent = ex.desc || "";

        card.appendChild(title);
        card.appendChild(tag);
        card.appendChild(desc);

        card.addEventListener("click", function () { loadExample(ex); });
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadExample(ex); }
        });
        return card;
      }

      function openMoreTypes() {
        try {
          var node = document.createElement("div");

          var intro = document.createElement("div");
          intro.className = "mt-intro";
          intro.textContent = "One ready-to-use example per Mermaid diagram type. Click a card to load it into the editor.";

          var grid = document.createElement("div");
          grid.className = "ms-grid mt-grid";

          EXAMPLES.forEach(function (ex) {
            try { grid.appendChild(buildCard(ex)); }
            catch (e) { console.error("[more-types] buildCard", e); }
          });

          node.appendChild(intro);
          node.appendChild(grid);

          MS.openModal({
            title: "More Diagram Types",
            width: "920px",
            node: node
          });
        } catch (e) {
          console.error("[more-types] openMoreTypes", e);
        }
      }

      MS.addTopbarButton({
        id: "mt-btn",
        label: "More Types",
        title: "Browse more Mermaid diagram types",
        icon: '<svg viewBox="0 0 24 24" class="ico" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><rect x="3" y="3" width="7" height="7" rx="1"/></svg>',
        onClick: openMoreTypes
      });

      MS.registerCommand({
        id: "more-types.open",
        title: "More Diagram Types: Open",
        run: openMoreTypes
      });
    } catch (e) {
      console.error("[more-types] setup failed", e);
    }
  });
})();
