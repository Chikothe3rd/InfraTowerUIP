🗼 Smart Tower Monitoring & Intelligence Platform (Enterprise UX Case Study)

Translating Fragmented Telemetry into Actionable Operational Intelligence

> **INFRATEL - UNZA iHub Hackathon Submission**

## 📘 Overview

This enterprise-grade, single-pane-of-glass platform transitions INFRATEL from fragmented infrastructure monitoring to centralized operational intelligence. While the system utilizes a robust full-stack architecture (React, Node.js, Python), the core challenge was a **human-centered design problem**: how to present thousands of data points to a Network Operations Center (NOC) operator without causing alert fatigue.

## 🎯 The User Problem

Managing telecommunications towers involves tracking power, security, and commercial data simultaneously.

* **The NOC Operator:** Suffers from "alert fatigue" due to fragmented systems. When a generator turns on, a door opens, and a temperature sensor spikes all at once across different software, operators struggle to prioritize the critical issue.
* **The Commercial Team:** Lacks real-time visibility into how technical outages impact Service Level Agreement (SLA) liabilities and revenue.
* **The Goal:** Build an interface that doesn't just show *what* is happening, but *why it matters* and *what to do next*.

## 🧑‍💻 User Research & Workflow Mapping

To design an effective dashboard, I analyzed the operational realities of infrastructure monitoring:

* **Workflow Analysis:** Mapped the daily routine of a NOC operator to understand how they currently triage incoming alerts.
* **Information Architecture:** Identified that spatial context (where is the tower?) and financial context (what is the SLA penalty risk?) are the two most critical data points needed to prioritize maintenance dispatches.
* **Role-Based Needs:** Recognized that a System Admin needs deep configuration access, while a standard Operator needs a streamlined, strictly observational view to prevent accidental system changes.

## 🔄 How UX Strategy Shaped the Interface

The platform's features were designed as direct solutions to the operational pain points discovered during research:

1. **Reducing Cognitive Load (Global NOC Dashboard):**
* *Feedback:* Operators waste time cross-referencing multiple screens.
* *UI Solution:* Designed a unified command center. Integrated an interactive Leaflet map with status-coded markers and a **Unified Status Strip** that aggregates Power, Security, and Commercial indicators into a single visual glance.


2. **Combating Alert Fatigue (Actionable Intelligence):**
* *Feedback:* Raw sensor data (e.g., "Fuel dropping") is often ignored as routine usage.
* *UI Solution:* Instead of just showing raw telemetry, the Python Intelligence Service processes the data to flag *anomalies* (e.g., "Fuel Theft Suspected"). Furthermore, the live alert feed automatically calculates the financial impact/SLA liability, allowing operators to prioritize dispatch based on business risk.


3. **Contextual Deep Dives (Tower Detail View):**
* *Feedback:* When an issue is flagged, operators need the full history of that specific site instantly.
* *UI Solution:* Created micro-level telemetry dashboards for individual towers, featuring historical power source timelines, environmental gauges, and active tenant data to provide immediate context for decision-making.



## 📊 Business & User Impact

* Replaced fragmented tools with a single-pane-of-glass dashboard, drastically reducing the time required to triage a site outage.
* Bridged the gap between technical operations and commercial management by visualizing SLA penalty risks directly alongside hardware alerts.
* Provided automated, officially branded PDF reports to streamline communication between the NOC floor and executive stakeholders.

## 🛠️ Technology Stack

* **Frontend (User Interface):** React (Vite), TypeScript, Zustand, Recharts, React Leaflet
* **Backend (Data Pipeline):** Node.js, Express, Socket.IO, PostgreSQL 16, Prisma ORM
* **Intelligence (Logic):** Python, SQLAlchemy, APScheduler (Rule-based alerting for fuel theft and wear)

## 🚀 Quick Start (Sandbox)

Start the entire platform (database, backend, intelligence, frontend) with a single command:

```bash
docker-compose up --build

```

Access the user interfaces at:

* **Frontend Dashboard:** `http://localhost:5173`
* **Backend API:** `http://localhost:3001`

### 🔐 Role-Based Access Testing

To evaluate the tailored user interfaces, use the mock enterprise credentials:

| Username | Password | Role | UI Experience |
| --- | --- | --- | --- |
| `operator` | `infratel2026` | NOC Operator | Streamlined view, acknowledge alerts, generate reports |
| `admin` | `infratel2026` | System Admin | Full access, including complex tower configurations |
