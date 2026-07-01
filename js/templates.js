/* Mermaid Studio — curated, syntax-verified templates.
   Every sample renders cleanly on mermaid v11. */
window.MERMAID_TEMPLATES = [
  {
    name: "Flowchart",
    code: `flowchart LR
  A([Start]) --> B{Logged in?}
  B -- Yes --> C[Show dashboard]
  B -- No --> D[Show login]
  D --> E[/Enter creds/]
  E --> B
  C --> F([End])`
  },
  {
    name: "Sequence diagram",
    code: `sequenceDiagram
  autonumber
  participant U as User
  participant A as API
  participant DB as Database
  U->>A: POST /login
  A->>DB: SELECT user
  DB-->>A: user row
  A-->>U: 200 + JWT
  Note over U,A: Token cached for 1h`
  },
  {
    name: "Class diagram",
    code: `classDiagram
  class Animal {
    +String name
    +int age
    +makeSound() void
  }
  class Dog {
    +fetch() void
  }
  class Cat {
    +scratch() void
  }
  Animal <|-- Dog
  Animal <|-- Cat`
  },
  {
    name: "State diagram",
    code: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: fetch()
  Loading --> Success: 200
  Loading --> Error: 4xx / 5xx
  Success --> Idle: reset
  Error --> Idle: retry
  Success --> [*]`
  },
  {
    name: "Entity relationship",
    code: `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "ordered in"
  CUSTOMER {
    int id PK
    string name
    string email
  }
  ORDER {
    int id PK
    date created_at
  }`
  },
  {
    name: "Gantt chart",
    code: `gantt
  title Product Roadmap
  dateFormat YYYY-MM-DD
  section Design
  Research      :done,    r1, 2026-01-01, 10d
  Wireframes    :active,  w1, after r1, 8d
  section Build
  Backend       :         b1, after w1, 15d
  Frontend      :         f1, after w1, 20d
  section Launch
  QA            :         q1, after b1, 7d
  Release       :crit,    rel, after f1, 3d`
  },
  {
    name: "Pie chart",
    code: `pie showData
  title Traffic sources
  "Organic" : 45
  "Direct" : 25
  "Referral" : 18
  "Social" : 12`
  },
  {
    name: "Mindmap",
    code: `mindmap
  root((Mermaid Studio))
    Editing
      Live preview
      Templates
      Autosave
    Export
      SVG
      PNG
      Shareable link
    Themes
      Light
      Dark`
  },
  {
    name: "Git graph",
    code: `gitGraph
  commit id: "init"
  branch develop
  commit id: "feature A"
  commit id: "feature B"
  checkout main
  merge develop tag: "v1.0"
  commit id: "hotfix"`
  },
  {
    name: "User journey",
    code: `journey
  title Onboarding experience
  section Sign up
    Visit site: 5: User
    Create account: 3: User
  section First use
    Import data: 2: User
    See dashboard: 5: User, System`
  },
  {
    name: "Timeline",
    code: `timeline
  title Company history
  2019 : Founded
  2021 : Series A : First 100 customers
  2023 : Series B : Global launch
  2026 : IPO`
  },
  {
    name: "Quadrant chart",
    code: `quadrantChart
  title Reach vs Effort
  x-axis Low Effort --> High Effort
  y-axis Low Reach --> High Reach
  quadrant-1 Big bets
  quadrant-2 Quick wins
  quadrant-3 Deprioritize
  quadrant-4 Maybe later
  Campaign A: [0.3, 0.8]
  Campaign B: [0.7, 0.7]
  Campaign C: [0.2, 0.3]`
  },
  {
    name: "Architecture (subgraphs)",
    code: `flowchart TB
  subgraph Client
    UI[Web App]
  end
  subgraph Edge
    CDN[CDN]
    GW[API Gateway]
  end
  subgraph Services
    Auth[Auth Service]
    Core[Core API]
    Q[(Queue)]
  end
  DB[(Database)]
  UI --> CDN --> GW
  GW --> Auth
  GW --> Core
  Core --> Q
  Core --> DB`
  }
];
