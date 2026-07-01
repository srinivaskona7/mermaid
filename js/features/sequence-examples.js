/* Feature: Sequence Diagram Pack — a gallery of ready-to-load mermaid
   sequenceDiagram examples covering every major syntax feature.
   No external CDN libraries are loaded by this module. */
(function () {
  "use strict";

  MS.ready(function (MS) {
    try {
      var SLUG = "sequence-examples";
      var PREFIX = "seqex"; // short namespace prefix for ids/classes

      // --------------------------------------------------------
      // Example library — every entry MUST parse on mermaid v11.
      // --------------------------------------------------------
      var EXAMPLES = [
        {
          title: "Basic request / response",
          desc: "Solid + dashed arrows between two participants.",
          code:
            "sequenceDiagram\n" +
            "    participant Client\n" +
            "    participant Server\n" +
            "    Client->>Server: GET /users\n" +
            "    Server-->>Client: 200 OK (JSON)"
        },
        {
          title: "Autonumber",
          desc: "Automatically number every message.",
          code:
            "sequenceDiagram\n" +
            "    autonumber\n" +
            "    Alice->>Bob: Authentication request\n" +
            "    Bob-->>Alice: Authentication response\n" +
            "    Alice->>Bob: Another request\n" +
            "    Bob-->>Alice: Another response"
        },
        {
          title: "Activations",
          desc: "Explicit activate / deactivate lifelines.",
          code:
            "sequenceDiagram\n" +
            "    Alice->>John: Hello John, how are you?\n" +
            "    activate John\n" +
            "    John-->>Alice: Great!\n" +
            "    deactivate John\n" +
            "    Alice->>+John: Do you have a minute?\n" +
            "    John-->>-Alice: Sure, go ahead."
        },
        {
          title: "Loop",
          desc: "Repeat a block of messages.",
          code:
            "sequenceDiagram\n" +
            "    Alice->>Bob: Hello Bob\n" +
            "    loop Every minute\n" +
            "        Bob->>Alice: I am still here\n" +
            "    end\n" +
            "    Bob-->>Alice: Goodbye"
        },
        {
          title: "Alt / else",
          desc: "Conditional alternative paths.",
          code:
            "sequenceDiagram\n" +
            "    Client->>Server: Login(user, pass)\n" +
            "    alt credentials valid\n" +
            "        Server-->>Client: 200 token\n" +
            "    else credentials invalid\n" +
            "        Server-->>Client: 401 unauthorized\n" +
            "    end"
        },
        {
          title: "Optional (opt)",
          desc: "A block that only sometimes runs.",
          code:
            "sequenceDiagram\n" +
            "    Customer->>Shop: Place order\n" +
            "    opt Gift wrap requested\n" +
            "        Shop->>Shop: Wrap the item\n" +
            "    end\n" +
            "    Shop-->>Customer: Order confirmed"
        },
        {
          title: "Parallel (par / and)",
          desc: "Run interactions concurrently.",
          code:
            "sequenceDiagram\n" +
            "    par Notify user\n" +
            "        Service->>Email: Send email\n" +
            "    and Notify admin\n" +
            "        Service->>Slack: Post message\n" +
            "    and Write metrics\n" +
            "        Service->>Metrics: Increment counter\n" +
            "    end\n" +
            "    Service-->>Caller: Done"
        },
        {
          title: "Notes (over / left / right)",
          desc: "Annotate lifelines with notes.",
          code:
            "sequenceDiagram\n" +
            "    participant Alice\n" +
            "    participant Bob\n" +
            "    Note left of Alice: Alice starts.\n" +
            "    Alice->>Bob: Hi Bob\n" +
            "    Note right of Bob: Bob thinks.\n" +
            "    Bob-->>Alice: Hi Alice\n" +
            "    Note over Alice,Bob: Shared context."
        },
        {
          title: "Background highlight (rect)",
          desc: "Draw a colored region behind messages.",
          code:
            "sequenceDiagram\n" +
            "    Alice->>Bob: Start transaction\n" +
            "    rect rgb(200, 220, 255)\n" +
            "        Bob->>DB: BEGIN\n" +
            "        Bob->>DB: INSERT row\n" +
            "        Bob->>DB: COMMIT\n" +
            "    end\n" +
            "    Bob-->>Alice: Transaction complete"
        },
        {
          title: "Actor participants",
          desc: "Use actor stick-figures instead of boxes.",
          code:
            "sequenceDiagram\n" +
            "    actor User\n" +
            "    participant App\n" +
            "    actor Admin\n" +
            "    User->>App: Submit form\n" +
            "    App->>Admin: Notify for review\n" +
            "    Admin-->>App: Approve\n" +
            "    App-->>User: Success"
        },
        {
          title: "Create / destroy participant",
          desc: "Add and remove a lifeline mid-diagram.",
          code:
            "sequenceDiagram\n" +
            "    Alice->>Bob: Hello Bob\n" +
            "    create participant Carl\n" +
            "    Bob->>Carl: Spawn worker\n" +
            "    Carl-->>Bob: Ready\n" +
            "    destroy Carl\n" +
            "    Bob->>Carl: Terminate\n" +
            "    Bob-->>Alice: Worker finished"
        },
        {
          title: "Aliased participants",
          desc: "Short ids with readable display labels.",
          code:
            "sequenceDiagram\n" +
            "    participant A as Web App\n" +
            "    participant B as API Gateway\n" +
            "    participant C as Database\n" +
            "    A->>B: POST /order\n" +
            "    B->>C: INSERT order\n" +
            "    C-->>B: order_id\n" +
            "    B-->>A: 201 Created"
        },
        {
          title: "Numbered arrow types",
          desc: "Showcase the different arrow styles.",
          code:
            "sequenceDiagram\n" +
            "    A->>B: Solid arrowhead\n" +
            "    B-->>A: Dashed arrowhead\n" +
            "    A-)B: Solid open (async)\n" +
            "    B--)A: Dashed open (async)\n" +
            "    A-xB: Solid with cross\n" +
            "    B--xA: Dashed with cross"
        },
        {
          title: "Nested combo (loop + alt + opt)",
          desc: "Fragments nested inside each other.",
          code:
            "sequenceDiagram\n" +
            "    autonumber\n" +
            "    participant U as User\n" +
            "    participant S as Service\n" +
            "    U->>S: Start job\n" +
            "    loop Poll for status\n" +
            "        U->>S: GET /status\n" +
            "        alt still running\n" +
            "            S-->>U: 202 processing\n" +
            "        else finished\n" +
            "            S-->>U: 200 result\n" +
            "            opt Notify\n" +
            "                S->>U: Push notification\n" +
            "            end\n" +
            "        end\n" +
            "    end"
        },
        {
          title: "Critical / option",
          desc: "A critical region with optional handlers.",
          code:
            "sequenceDiagram\n" +
            "    Consumer->>Broker: Connect\n" +
            "    critical Establish connection\n" +
            "        Broker->>Consumer: Connected\n" +
            "    option Network timeout\n" +
            "        Broker->>Consumer: Retry\n" +
            "    option Credentials rejected\n" +
            "        Broker->>Consumer: Abort\n" +
            "    end"
        },
        {
          title: "Break",
          desc: "Break out of the flow on an error.",
          code:
            "sequenceDiagram\n" +
            "    Client->>API: Request data\n" +
            "    API->>Cache: Lookup\n" +
            "    break when cache is corrupt\n" +
            "        API-->>Client: 500 error\n" +
            "    end\n" +
            "    Cache-->>API: value\n" +
            "    API-->>Client: 200 OK"
        }
      ];

      // --------------------------------------------------------
      // Styles — theme-aware, namespaced, injected once.
      // --------------------------------------------------------
      MS.injectCSS(
        "" +
        ".seqex-card__code{" +
        "  margin:8px 0 0;padding:8px 10px;overflow:auto;max-height:150px;" +
        "  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
        "  font-size:11px;line-height:1.45;white-space:pre;" +
        "  color:var(--text);background:var(--surface);" +
        "  border:1px solid var(--border);border-radius:var(--radius);" +
        "}" +
        ".seqex-card{cursor:pointer;transition:border-color .15s ease,transform .15s ease;}" +
        ".seqex-card:hover{border-color:var(--accent);transform:translateY(-1px);}" +
        ".seqex-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}" +
        ".seqex-card__desc{color:var(--text);opacity:.72;font-size:12px;margin:2px 0 0;}" +
        ".seqex-hint{color:var(--text);opacity:.7;font-size:12px;margin:0 0 12px;}",
        "sequence-examples-css"
      );

      // --------------------------------------------------------
      // Modal builder.
      // --------------------------------------------------------
      function loadExample(ex) {
        try {
          MS.setCode(ex.code);
          MS.closeModal();
          MS.toast("Loaded: " + ex.title);
          MS.focusEditor();
        } catch (e) {
          console.error("[" + SLUG + "] load failed", e);
          MS.toast("Could not load example");
        }
      }

      function buildGallery() {
        var wrap = document.createElement("div");

        var hint = document.createElement("p");
        hint.className = "seqex-hint";
        hint.textContent =
          "Click any example to load it into the editor. " +
          EXAMPLES.length + " sequence diagram patterns.";
        wrap.appendChild(hint);

        var grid = document.createElement("div");
        grid.className = "ms-grid";

        EXAMPLES.forEach(function (ex, i) {
          var card = document.createElement("div");
          card.className = "ms-card seqex-card";
          card.id = PREFIX + "-card-" + i;
          card.setAttribute("role", "button");
          card.setAttribute("tabindex", "0");
          card.setAttribute("aria-label", "Load example: " + ex.title);

          var title = document.createElement("div");
          title.className = "ms-card__title";
          title.textContent = ex.title;

          var body = document.createElement("div");
          body.className = "ms-card__body";

          var desc = document.createElement("p");
          desc.className = "seqex-card__desc";
          desc.textContent = ex.desc;

          var pre = document.createElement("pre");
          pre.className = "seqex-card__code";
          pre.textContent = ex.code;

          body.appendChild(desc);
          body.appendChild(pre);
          card.appendChild(title);
          card.appendChild(body);

          card.addEventListener("click", function () { loadExample(ex); });
          card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              loadExample(ex);
            }
          });

          grid.appendChild(card);
        });

        wrap.appendChild(grid);
        return wrap;
      }

      function openGallery() {
        try {
          MS.openModal({
            title: "Sequence Diagram Pack",
            width: "900px",
            node: buildGallery()
          });
        } catch (e) {
          console.error("[" + SLUG + "] open modal failed", e);
          MS.toast("Could not open gallery");
        }
      }

      // --------------------------------------------------------
      // Topbar button + command palette entry.
      // --------------------------------------------------------
      MS.addTopbarButton({
        id: "seqexBtn",
        label: "Sequence",
        title: "Sequence Diagram Pack — example gallery",
        icon:
          '<svg viewBox="0 0 24 24" class="ico" fill="none" ' +
          'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
          'stroke-linejoin="round">' +
          '<path d="M6 3v18M18 3v18"/>' +
          '<path d="M6 8h12M18 14H6"/>' +
          '<path d="M15 5l3 3-3 3M9 11l-3 3 3 3"/>' +
          "</svg>",
        onClick: openGallery
      });

      MS.registerCommand({
        id: "sequence-examples.open",
        title: "Sequence Diagram Pack: Open gallery",
        run: openGallery
      });
    } catch (e) {
      console.error("[sequence-examples] init failed", e);
    }
  });
})();
