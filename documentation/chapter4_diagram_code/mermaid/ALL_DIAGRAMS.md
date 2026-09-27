# RakshaSafe Chapter 4 - Mermaid Diagrams

Open each block at https://mermaid.live and paste. Export PNG free.

## Flowchart 4.2.1: Login
```mermaid
flowchart TD
    A([User opens Login page]) --> B[Enter email / phone and password]
    B --> C{Valid credentials?}
    C -- Yes --> D{Account active?}
    C -- No --> E[Show invalid-credentials error]
    D -- Yes --> F[Create JWT session]
    D -- No --> E
    F --> G{Role: USER / ADMIN / RESPONDER?}
    G --> H[[Redirect to user dashboard]]
    G --> I[[Redirect to admin dashboard]]
    G --> J[[Redirect to responder dashboard]]
    E --> B
```

## Flowchart 4.2.2: Registration
```mermaid
flowchart TD
    A([User opens Registration page]) --> B[Enter name, email, phone, password]
    B --> C{Fields valid and unique?}
    C -- No --> D[Show field-level errors] --> B
    C -- Yes --> E[Hash password with bcrypt]
    E --> F[Create USER account]
    F --> G[Create session]
    G --> H([Open user dashboard])
```

## Flowchart 4.2.3: User Dashboard
```mermaid
flowchart TD
    A([User signs in]) --> B[Load own incidents and notifications]
    B --> C[Render stat summary and quick actions]
    C --> D{Open incident detail?}
    D -- Yes --> E[Show timeline, location, risk]
    D -- No --> F
    E --> F([Continue using dashboard])
```

## Flowchart 4.2.4: SOS Creation
```mermaid
flowchart TD
    A([User opens SOS page]) --> B[Select type, category, description, priority]
    B --> C{Use My Location?}
    C -- Yes --> D[Capture device coordinates]
    C -- No --> E[Continue without location]
    D --> F{Coordinates valid?}
    F -- No --> D
    F -- Yes --> G[Submit incident]
    E --> G
    G --> H([Stored as REPORTED + reference shown])
```

## Flowchart 4.2.5: Incident Detail
```mermaid
flowchart TD
    A([Open an incident]) --> B[Load facts, location, history]
    B --> C[Load nearby resources + weather]
    C --> D{Assignable team attached?}
    D -- Yes --> E[Show assignment and team contact]
    D -- No --> F
    E --> F{REPORTED / ACKNOWLEDGED and unassigned?}
    F -- Yes --> G([Allow edit and delete])
    F -- No --> H([Read-only view])
```

## Flowchart 4.2.6: Emergency Contacts
```mermaid
flowchart TD
    A([Open Emergency Contacts]) --> B[Add / edit contact form]
    B --> C{Phone valid and normalised?}
    C -- No --> B
    C -- Yes --> D{Only one primary per user?}
    D -- No --> B
    D -- Yes --> E[Save to Mongo]
    E --> F([Contact list refreshed])
```

## Flowchart 4.2.7: Resource Lookup
```mermaid
flowchart TD
    A([Open Resources]) --> B[Enter search term / filters]
    B --> C{Use current location?}
    C -- Yes --> D[Get device coordinates]
    C -- No --> E[Skip location]
    D --> F[Query stored facilities + providers]
    E --> F
    F --> G[Sort by distance]
    G --> H([Show call + directions cards])
```

## Flowchart 4.2.8: Unsafe Reporting
```mermaid
flowchart TD
    A([Open Unsafe Area Report]) --> B[Choose category, severity, description]
    B --> C{Location attached?}
    C -- Yes --> D[Validate coordinates]
    C -- No --> E[Use device / searched place] --> D
    D --> F{Coordinates valid?}
    F -- No --> E
    F -- Yes --> G[Submit report]
    G --> H([Stored unverified, queued for admin])
```

## Flowchart 4.2.9: Risk Assessment
```mermaid
flowchart TD
    A([Open incident with location]) --> B[Click Assess Risk]
    B --> C[Backend counts nearby factors]
    C --> D[(POST /risk/assess - FastAPI)]
    D --> E{Response valid - score 0-100, level enum?}
    E -- No --> F[Retryable error panel] --> B
    E -- Yes --> G[Store RiskAssessment + show panel]
    G --> H([Decision-support disclaimer shown])
```

## Flowchart 4.2.10: Notifications
```mermaid
flowchart TD
    A([Open Notifications]) --> B[Load own notification records]
    B --> C[Show channel + status badges]
    C --> D{Open linked incident?}
    D -- Yes --> E[Show incident context] --> F[Mark entry read]
    D -- No --> F
    F --> G([Continue scanning])
```

## Flowchart 4.2.11: Profile
```mermaid
flowchart TD
    A([Open Profile]) --> B[Edit name, email, phone, language]
    B --> C{Valid and unique values?}
    C -- No --> B
    C -- Yes --> D[Save changes]
    D --> E([Confirm updated account])
    E --> F([Sign out / continue])
```

## Flowchart 4.2.12: Admin Dashboard
```mermaid
flowchart TD
    A([Admin signs in]) --> B[Query users, incidents, status breaks]
    B --> C[Render counters + activity feed]
    C --> D{Drill into incident?}
    D -- Yes --> E[Show incident + risk + assignments]
    D -- No --> F([Continue administration])
    E --> F
```

## Flowchart 4.2.13: Admin Incidents
```mermaid
flowchart TD
    A([Open admin incident list]) --> B[Filter by status / priority / text]
    B --> C{Status update workflow legal?}
    C -- No --> D[List allowed transitions] --> B
    C -- Yes --> E[Write IncidentUpdates + AdminLog]
    E --> F{Assign rescue team?}
    F -- Yes --> G[Create ASSIGNED assignment]
    F -- No --> H([Review detail / resolve])
    G --> H
```

## Flowchart 4.2.14: Admin Masters
```mermaid
flowchart TD
    A([Open admin master screen]) --> B[Facilities / teams / users / reports]
    B --> C{Action permitted - requireAdmin?}
    C -- No --> D[Access denied] --> A
    C -- Yes --> E[Create / edit / verify record]
    E --> F[Log action to AdminLogs]
    F --> G([List refreshed])
```

## Figure 4.1: RakshaSafe System Architecture
```mermaid
flowchart TB
    subgraph FRONTEND["FRONTEND - React + TypeScript + Vite"]
        FE["Pages and components<br/>Roles: USER | ADMIN | RESPONDER<br/>i18n dictionary"]
    end
    subgraph BACKEND["BACKEND - Node.js + Express + Mongoose  :5000"]
        API["REST API /api"]
        SVC["Services: geocoding, weather,<br/>OSM nearby, reports, notifications, risk"]
    end
    subgraph AI["AI SERVICE - FastAPI  :8000"]
        RISK["POST /risk/assess<br/>raksha-risk-v1 deterministic scoring"]
    end
    subgraph DB["MongoDB  :27017"]
        MONGO[("15 collections<br/>schema-validated")]
    end
    FE -- "HTTPS / REST (Vite proxy)" ---> API
    API --- SVC
    API -- "risk factors" --> RISK
    RISK -- "score + level" --> API
    API -- "Mongoose ODM" ---> MONGO
```

## Figure 4.3: RakshaSafe Deployment View
```mermaid
flowchart LR
    subgraph CLIENT["CLIENT - Browser"]
        SPA["React SPA<br/>port 5173 (dev) / vite build (prod)"]
    end
    subgraph BE["BACKEND - Node.js"]
        EX["Express API<br/>port 5000 / api + health"]
    end
    subgraph AIS["AI SERVICE - Python"]
        FA["FastAPI<br/>port 8000 / risk/assess"]
    end
    subgraph DATA["Data layer"]
        MDB[("MongoDB 127.0.0.1:27017<br/>15 collections")]
    end
    subgraph EXT["External APIs"]
        EXT1["Open-Meteo weather"]
        EXT2["OSM Nominatim / Overpass"]
    end
    SPA -- "HTTP proxy /api" <--> EX
    EX -- "factors / score" <--> FA
    EX -- "Mongoose ODM" <--> MDB
    EX -. "fetch (proxy)" .-> EXT1
    EX -. "fetch (proxy)" .-> EXT2
```
