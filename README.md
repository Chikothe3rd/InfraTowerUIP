# Smart Tower Monitoring & Infrastructure Intelligence Platform

> **INFRATEL - UNZA iHub Hackathon Submission**
> An enterprise-grade, single-pane-of-glass operations platform that transitions INFRATEL from fragmented monitoring to centralized operational intelligence.

---

## Key Features

1. **Global NOC Dashboard (Unified command center)**
   - 6 high-level KPI cards (including SLA Risk & Service Credit Liability calculations).
   - Interactive Leaflet map centered on Lusaka, Zambia with status-coded markers.
   - **Unified Status Strip** aggregating Power, Security, and Commercial indicators.
   - Real-time Alert Feed with financial impact estimation.
   - Live Power Distribution & Event log.

2. **Tower Detail View (Micro-level telemetry)**
   - Uptime clock and historical power source timeline (Grid vs. Solar vs. Generator).
   - Environmental telemetry gauges (Equipment/Ambient temp, Humidity).
   - **Commercial Profile** section showing active tenants, capacity, and estimated revenue.

3. **Fuel & Security Console**
   - Active security alarm grid (motion, door, CCTV).
   - Fuel level analytics with fuel theft markers and generator runtime tracker.

4. **Commercial Hub**
   - Ranks towers by utilization, highlights SLA penalty risks, and displays revenue opportunities.

5. **Analytics & Reporting**
   - Interactive reports and **Generate PDF Report** action with official branding.

6. **Python Intelligence Service**
   - Rule-based alerts for fuel theft, temperature degradation, and power source wear.

---

## Technology Stack

- **Frontend:** React (Vite) + TS + Zustand + Recharts + React Leaflet + Vanilla CSS (Light/Dark themes)
- **Backend:** Node.js (Express) + TypeScript + Prisma ORM + Socket.IO + Telemetry Simulator
- **Database:** PostgreSQL 16
- **Intelligence:** Python + psycopg2 + SQLAlchemy + APScheduler

---

## Quick Start

Start the entire platform (database, backend, intelligence, frontend) with a single command:

```bash
docker-compose up --build
```

Access the services at:
- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)

### Credentials
For the mock enterprise login:

| Username | Password | Role | Access Level |
|---|---|---|---|
| `operator` | `infratel2026` | NOC Operator | View, acknowledge alerts, print reports |
| `admin` | `infratel2026` | System Admin | Full access + configure towers |

---
*Developed as a cohesive fullstack solution for the INFRATEL hackathon.*
