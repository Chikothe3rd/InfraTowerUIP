# INFRATEL Branding, UI/UX & System Styling Guide

> **Reference Document** — Consult this file at every step of building the platform.
> Every UI component, page, and visual element must comply with these standards.

---

## 1. Brand Mission & Core Values

INFRATEL's mission is to transition from **fragmented monitoring** to **centralized operational intelligence**. Every design choice must reflect these core values:

| Value | How It Manifests in Our UI |
|---|---|
| **Customer-Centric** | Dashboard prioritizes the NOC operator's workflow — critical data visible at a glance, zero unnecessary clicks |
| **Innovation** | Modern glassmorphism design, real-time data streaming, predictive maintenance indicators |
| **Efficiency** | Unified Analytics Dashboard eliminates fragmented workflows — Power + Security + Commercial on one screen |
| **Integrity** | Audit logging, role-based access, transparent SLA reporting with financial impact |
| **Teamwork** | Shared live feed, collaborative alert acknowledgment with user attribution |

When presenting to judges, explicitly mention: *"Our dashboard layout prioritizes Efficiency and Innovation by eliminating the fragmented workflows that currently burden INFRATEL staff."*

---

## 2. Color Palette — "Trust & Tech"

### Brand Colors (Immutable)

These are INFRATEL's official brand colors. They remain constant across both themes.

| Name | Hex | CSS Variable | Usage |
|---|---|---|---|
| **Resolution Blue** | `#003388` | `--infratel-blue` | Navigation bars, primary buttons, active indicators, brand identity |
| **Biscay** | `#193660` | `--infratel-navy` | Panel backgrounds, sidebar, card headers, depth |
| **White** | `#FFFFFF` | `--infratel-white` | Typography, data labels, high readability contrast |

### Dark Theme — NOC Mode (Default)

The standard for Network Operations Center environments. Uses "Midnight Navy" (not pure black) to reduce eye strain during long shifts.

| Token | Hex | CSS Variable | Usage |
|---|---|---|---|
| Background Primary | `#0B1929` | `--bg-primary` | Page background (Midnight Navy) |
| Background Secondary | `#122340` | `--bg-secondary` | Card backgrounds |
| Background Tertiary | `#193660` | `--bg-tertiary` | Elevated surfaces, modals |
| Glass | `rgba(18, 35, 64, 0.7)` | `--bg-glass` | Glassmorphism panels |
| Text Primary | `#FFFFFF` | `--text-primary` | Headings, KPI numbers |
| Text Secondary | `#8899B4` | `--text-secondary` | Labels, descriptions |
| Text Tertiary | `#506380` | `--text-tertiary` | Disabled, placeholders |
| Border | `rgba(0, 51, 136, 0.3)` | `--border-subtle` | Card borders (Resolution Blue tint) |
| Navigation BG | `#003388` | `--nav-bg` | Sidebar and top bar |

### Light Theme — Executive / Field Mode

For executives viewing reports in bright environments or field engineers on tablets.

| Token | Hex | CSS Variable | Usage |
|---|---|---|---|
| Background Primary | `#F0F4F8` | `--bg-primary` | Page background (light gray-blue) |
| Background Secondary | `#FFFFFF` | `--bg-secondary` | Card backgrounds (white) |
| Background Tertiary | `#E8EDF3` | `--bg-tertiary` | Elevated surfaces |
| Glass | `rgba(255, 255, 255, 0.8)` | `--bg-glass` | Glassmorphism panels |
| Text Primary | `#0B1929` | `--text-primary` | Headings, KPI numbers (dark navy) |
| Text Secondary | `#506380` | `--text-secondary` | Labels, descriptions |
| Text Tertiary | `#8899B4` | `--text-tertiary` | Disabled, placeholders |
| Border | `rgba(0, 51, 136, 0.15)` | `--border-subtle` | Card borders (soft blue) |
| Navigation BG | `#003388` | `--nav-bg` | Sidebar and top bar (stays brand blue) |

> [!IMPORTANT]
> The sidebar/topbar navigation background stays `#003388` Resolution Blue in **both** themes. This maintains brand consistency and ensures the INFRATEL identity is always visible.

### Alert & Status Accents (Same in Both Themes)

These colors must maintain high contrast against both dark and light backgrounds. They are used for critical operational indicators and must be immediately visible.

| Name | Hex | CSS Variable | Usage |
|---|---|---|---|
| **Resolution Blue** | `#003388` | `--accent-primary` | Primary actions, active states, selected items |
| **Safety Amber** | `#F59E0B` | `--accent-warning` | Warnings, low fuel, SLA at risk |
| **Alert Red** | `#EF4444` | `--accent-danger` | Critical alarms, intrusions, SLA breach, offline |
| **Online Green** | `#10B981` | `--accent-success` | Healthy towers, online status, SLA compliant |
| **Info Blue** | `#3B82F6` | `--accent-info` | Informational badges, tooltips |
| **Brand Glow** | `rgba(0, 51, 136, 0.2)` | `--glow-primary` | Glow effects on active/critical elements |

---

## 3. Typography

### Primary Font: Lato

**Lato** is the official typeface of Infratel Corporation. It is a clean, sans-serif font designed by Łukasz Dziedzic. It excels in dashboards because:
- High x-height improves readability at small sizes
- Clear letterforms are distinguishable from a distance (critical for NOC wall screens)
- Multiple weights available for visual hierarchy

```css
--font-sans: 'Lato', system-ui, -apple-system, sans-serif;
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap" rel="stylesheet">
```

### Monospace Font: JetBrains Mono

For telemetry values, sensor readings, tower codes, and technical data.

```css
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

**Google Fonts import:**
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Type Scale

| Element | Font | Weight | Size | Usage |
|---|---|---|---|---|
| KPI Numbers | Lato | 900 (Black) | 48–72px | Dashboard headline metrics |
| Page Titles | Lato | 700 (Bold) | 28–32px | Page headers ("Global NOC Dashboard") |
| Section Headers | Lato | 700 (Bold) | 20–24px | Card titles, section labels |
| Body Text | Lato | 400 (Regular) | 16px | Descriptions, labels, table text |
| Small Labels | Lato | 400 (Regular) | 13–14px | Timestamps, badges, chart axis labels |
| Data Values | JetBrains Mono | 700 (Bold) | 14–20px | Sensor readings, tower codes, telemetry |
| Data Labels | JetBrains Mono | 400 (Regular) | 12–14px | Units, axis labels, secondary data |

> [!IMPORTANT]
> **Minimum font size: 16px** for body text. NOC screens are read from 3+ meters away. Never use fonts smaller than 13px anywhere in the application.

---

## 4. Theme Toggle Implementation

### How It Works

```
User clicks toggle → 
  Zustand store updates theme state →
  document.documentElement.setAttribute('data-theme', 'dark' | 'light') →
  All CSS variables swap instantly →
  Preference saved to localStorage
```

### CSS Structure

```css
/* Brand constants (never change) */
:root {
  --infratel-blue: #003388;
  --infratel-navy: #193660;
  --infratel-white: #FFFFFF;
  --font-sans: 'Lato', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --accent-primary: #003388;
  --accent-warning: #F59E0B;
  --accent-danger: #EF4444;
  --accent-success: #10B981;
  --accent-info: #3B82F6;
}

/* Dark theme (default) */
[data-theme="dark"] {
  --bg-primary: #0B1929;
  --bg-secondary: #122340;
  --bg-tertiary: #193660;
  --bg-glass: rgba(18, 35, 64, 0.7);
  --text-primary: #FFFFFF;
  --text-secondary: #8899B4;
  --text-tertiary: #506380;
  --border-subtle: rgba(0, 51, 136, 0.3);
  --nav-bg: #003388;
}

/* Light theme */
[data-theme="light"] {
  --bg-primary: #F0F4F8;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #E8EDF3;
  --bg-glass: rgba(255, 255, 255, 0.8);
  --text-primary: #0B1929;
  --text-secondary: #506380;
  --text-tertiary: #8899B4;
  --border-subtle: rgba(0, 51, 136, 0.15);
  --nav-bg: #003388;
}
```

### Toggle Component Spec

- **Location**: Top bar, right side (next to notification bell)
- **Icons**: Sun icon (☀️) for light mode, Moon icon (🌙) for dark mode
- **Style**: Pill-shaped toggle with smooth 250ms transition
- **Default**: Dark mode on first visit
- **Persistence**: `localStorage.setItem('infratel-theme', 'dark' | 'light')`

### Map Tiles by Theme

| Theme | Tile Provider | URL |
|---|---|---|
| Dark | CartoDB Dark Matter | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` |
| Light | CartoDB Positron | `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` |

Map tiles switch automatically when the theme toggles.

---

## 5. Component Styling Standards

### Cards

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 24px;
  backdrop-filter: blur(12px);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 51, 136, 0.15);
}
```

### KPI Cards

```css
.kpi-card {
  /* Extends .card */
  border-left: 3px solid var(--accent-primary);
}

.kpi-value {
  font-family: var(--font-sans);
  font-weight: 900;
  font-size: 48px;
  color: var(--text-primary);
}

.kpi-label {
  font-family: var(--font-sans);
  font-weight: 400;
  font-size: 14px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

### Status Badges

| Status | Background | Text |
|---|---|---|
| Online | `--accent-success` at 15% opacity | `--accent-success` |
| Warning | `--accent-warning` at 15% opacity | `--accent-warning` |
| Critical | `--accent-danger` at 15% opacity | `--accent-danger` |
| Offline | `--text-tertiary` at 15% opacity | `--text-tertiary` |

### Navigation Sidebar

```css
.sidebar {
  background: var(--nav-bg); /* Always #003388 Resolution Blue */
  color: var(--infratel-white);
  width: 260px; /* expanded */
  width: 72px;  /* collapsed */
}

.sidebar .nav-item.active {
  background: rgba(255, 255, 255, 0.15);
  border-left: 3px solid var(--infratel-white);
}
```

### Buttons

| Type | Background | Text | Border |
|---|---|---|---|
| Primary | `--accent-primary` (#003388) | White | None |
| Secondary | Transparent | `--accent-primary` | 1px `--accent-primary` |
| Danger | `--accent-danger` | White | None |
| Ghost | Transparent | `--text-secondary` | None |

### Alerts / Notifications

```css
.alert-critical {
  background: rgba(239, 68, 68, 0.1);
  border-left: 4px solid var(--accent-danger);
  animation: pulse-red 2s ease-in-out infinite;
}

.alert-warning {
  background: rgba(245, 158, 11, 0.1);
  border-left: 4px solid var(--accent-warning);
}
```

---

## 6. Branding Integration Checklist

### Logo Placement

| Location | Size | Notes |
|---|---|---|
| Sidebar (top-left) | 40px height (expanded), icon-only 32px (collapsed) | Always visible |
| Login screen | 80px height, centered | Full INFRATEL branding with tagline |
| PDF report header | 120px width | Top-left of generated reports |
| Favicon | 32x32 / 16x16 | Blue "I" or INFRATEL mark |

### Visual Patterns

- **Network Grid**: Use a subtle SVG pattern of interconnected nodes/lines as a background texture on map views. This represents INFRATEL's optic fiber and tower network reach.
  ```css
  .map-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('/patterns/network-grid.svg');
    opacity: 0.03; /* Very subtle */
    pointer-events: none;
    z-index: 1;
  }
  ```
- **Login Screen**: Subtle tower silhouette or network visualization in background behind the glassmorphism login card.

### Page Subtitles (Philosophy Tags)

Each main page should have a subtitle that connects to INFRATEL values:

| Page | Subtitle |
|---|---|
| Global Dashboard | *"Unified Operational Intelligence — Efficiency through Centralized Monitoring"* |
| Tower Detail | *"Asset Intelligence — Maximizing Infrastructure ROI"* |
| Fuel & Security | *"Proactive Protection — Innovation in Anomaly Detection"* |
| Commercial Hub | *"Revenue Assurance — Customer-Centric Utilization Analytics"* |
| Analytics | *"Automated Reporting — Integrity in SLA Compliance"* |

### Report Branding

All generated PDFs and exports must include:
- INFRATEL logo in header
- Report title + date range
- "Confidential — INFRATEL Tower Intelligence Platform" in footer
- Page numbers
- Generated timestamp

---

## 7. NOC Compatibility Standards

### Readability Requirements

| Criterion | Standard | Reason |
|---|---|---|
| Minimum body font | 16px | Readable from 3+ meters |
| KPI number font | 48–72px | Visible from across NOC room |
| Contrast ratio (critical) | WCAG AAA (≥ 7:1) | Alert Red on Midnight Navy = 12:1+ |
| Hover-only data | ❌ Prohibited | NOC screens may not have mouse |
| Touch targets | ≥ 44px × 44px | Touchscreen NOC displays |

### Layout Grid

```
1920px (Full HD):  12-column grid, 24px gap
2560px (QHD):      12-column grid, 32px gap  
3840px (4K):       12-column grid, 40px gap

KPI strip:         6 cards × 2fr each (equal width)
Map area:          Full width, 400px min-height
Unified strip:     3 panels × 1fr each (33% each)
Live feeds:        2 columns × 1fr each (50% each)
```

### Animation Performance

- All animations use `transform` and `opacity` only (GPU-accelerated)
- Prefer `will-change: transform` on frequently animated elements
- Pulsing alerts: `animation-duration: 2s` (not too fast — reduces NOC fatigue)
- No auto-playing videos or flashing content (seizure risk, distracting in NOC)

---

## 8. Quick Reference — CSS Variable Cheat Sheet

Copy this block directly into `index.css`:

```css
:root {
  /* INFRATEL Brand (immutable) */
  --infratel-blue: #003388;
  --infratel-navy: #193660;
  --infratel-white: #FFFFFF;

  /* Typography */
  --font-sans: 'Lato', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Alert accents (same both themes) */
  --accent-primary: #003388;
  --accent-warning: #F59E0B;
  --accent-danger: #EF4444;
  --accent-success: #10B981;
  --accent-info: #3B82F6;
  --glow-primary: 0 0 20px rgba(0, 51, 136, 0.2);

  /* Spacing */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

[data-theme="dark"] {
  --bg-primary: #0B1929;
  --bg-secondary: #122340;
  --bg-tertiary: #193660;
  --bg-glass: rgba(18, 35, 64, 0.7);
  --text-primary: #FFFFFF;
  --text-secondary: #8899B4;
  --text-tertiary: #506380;
  --border-subtle: rgba(0, 51, 136, 0.3);
  --nav-bg: #003388;
}

[data-theme="light"] {
  --bg-primary: #F0F4F8;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #E8EDF3;
  --bg-glass: rgba(255, 255, 255, 0.8);
  --text-primary: #0B1929;
  --text-secondary: #506380;
  --text-tertiary: #8899B4;
  --border-subtle: rgba(0, 51, 136, 0.15);
  --nav-bg: #003388;
}
```
