# CyberSim Design System (DESIGN.md)

> **Identity**: Military-grade Security Operations Center (SOC) meets modern high-performance engineering.
> **Philosophy**: Duality (Red ↔ Blue), Precision, and Authority.
> **Inspiration**: Refero Styles (Midnight Command Center, High-Contrast Precision) + University of Jordan (UJ) Identity.

---

## 🎨 Color Palette

> **Two-Tier Color Rule (V5, Option A — locked 2026-05-30)**
> - **Tier 1 — Duality** (`cs-red` / `cs-blue`): semantic layer — text, borders, severity chips. Use for readable content.
> - **Tier 2 — HUD Neon** (`hud-crimson` / `hud-cyan`): glow/accent layer — box-shadows, focus halos, laser lines only. Never for text or solid borders.

### 1. The Voids (Surfaces)
*   **Void** (`#08090c`): The primary background. Deep, focused, zero-distraction.
*   **Surface 1** (`#0d0f14`): Primary panel background.
*   **Surface 2** (`#13161d`): Headers, inactive states, secondary inputs.
*   **Surface 3** (`#1a1d26`): Cards, hover states, interactive elements.
*   **Surface 4** (`#22262f`): Tooltips, dropdowns, high-elevation elements.

### 2. The Duality — Tier 1 (text / borders / severity)
*   **cs-red** (`#ff3b3b`): Red Team, Active Threats, Critical Alerts — text and border identity.
*   **cs-blue** (`#3b8bff`): Blue Team, Defensive Actions, Trusted Traffic — text and border identity.

### 3. HUD Neon — Tier 2 (glow / box-shadows only)
*   **hud-crimson** (`#ff0055`): Red Team neon glow layer (box-shadows, halos). Not for text/borders.
*   **hud-cyan** (`#00f3ff`): Blue Team neon glow layer (box-shadows, halos). Not for text/borders.

### 4. Functional Accents
*   **green-signal** (`#00ff88`): System Ready, Successful Commands, Safe Zones.
*   **amber-warn** (`#ffaa00`): Medium alerts, Pending actions.
*   **critical** (`#ff2244`): System failures, Out-of-scope breaches.
*   **magenta** (`#a855f7`): AI Tutor, Pro-Tip hints, hint accent.

---

## Typography

| Role | Font | Where |
|------|------|--------|
| `font-hud` | **Orbitron** | Hero wordmark, large HUD numerals ONLY — never body text |
| `font-display` | **Outfit** | All headings, labels, UI text, body prose |
| `font-mono` | **JetBrains Mono** | Terminal output, SIEM logs, IPs, scores, code |

> **Rule:** Never use Orbitron for readable body-length text — it is a geometric display face built for short glyphs only. Any element that previously used `.font-display` and rendered Orbitron (because tailwind put it first) now correctly renders Outfit.

---

## 📐 Layout & Spacing

*   **Base Grid**: 8px.
*   **Micro Grid**: 4px.
*   **Information Density**: High. Avoid excessive whitespace. Use "Layered Depth" (subtle 1px borders) to separate components instead of large margins.
*   **Borders**: `1px solid #1e2230` (Default).
    *   Use `border-glow` for active or focused states.
*   **Corner Radius**:
    *   Standard Panel: `16px` (lg).
    *   Interactive Card: `10px` (md).
    *   Input/Small Button: `6px` (sm).

---

## ✨ Patterns & Texture

*   **Scan-line Overlay**: A repeating 4px linear gradient over the entire UI to simulate a CRT/SOC monitor.
*   **Ambient Radial Glow**: Subtle, low-opacity red/blue glows in the corners to reinforce the current scenario context.
*   **Blueprint Grid**: `bg-grid` utility (40px spacing) for background textures in documentation and briefing areas.
*   **Micro-Animations**:
    *   *Pulse*: For "Live" signals and SIEM alerts.
    *   *Blink*: Terminal-style cursor.
    *   *Tilt*: Perspective-based hover effects for scenario cards.

---

## 🛠 Component Guidelines

### Buttons (CTAs)
*   **Red Team**: High-glow red, white text.
*   **Blue Team**: High-glow blue, white text.
*   **System/Ghost**: Transparent with 1px border, subtle text.

### Panels
*   Every panel MUST have a `panel-header` with a `panel-header-dot` indicating status (Red/Blue/Green/Amber).
*   Use `font-mono` for headers to convey a "tooled" industrial feel.

### Badges
*   Strictly monochromatic with low-opacity background fills.
*   Severity-colored text only.

---

## 📂 Design Implementation
*   **Tailwind Config**: `frontend/tailwind.config.js`
*   **Global CSS**: `frontend/src/index.css`
*   **Canva Brand**: University of Jordan (Black, Green, Gold) accents applied to academic headers.

---

*Generated via Gemini CLI with Refero Styles integration - 2026-05-23*
