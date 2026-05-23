# CyberSim Design System (DESIGN.md)

> **Identity**: Military-grade Security Operations Center (SOC) meets modern high-performance engineering.
> **Philosophy**: Duality (Red ↔ Blue), Precision, and Authority.
> **Inspiration**: Refero Styles (Midnight Command Center, High-Contrast Precision) + University of Jordan (UJ) Identity.

---

## 🎨 Color Palette

### 1. The Voids (Surfaces)
*   **Void** (`#08090c`): The primary background. Deep, focused, zero-distraction.
*   **Surface 1** (`#0d0f14`): Primary panel background.
*   **Surface 2** (`#13161d`): Headers, inactive states, secondary inputs.
*   **Surface 3** (`#1a1d26`): Cards, hover states, interactive elements.
*   **Surface 4** (`#22262f`): Tooltips, dropdowns, high-elevation elements.

### 2. The Duality (Core Accents)
*   **Cyber Red** (`#ff3b3b`): Red Team, Active Threats, Critical Alerts.
    *   *Glow*: `rgba(255, 59, 59, 0.25)`
*   **Cyber Blue** (`#3b8bff`): Blue Team, Defensive Actions, Trusted Traffic.
    *   *Glow*: `rgba(59, 139, 255, 0.25)`

### 3. Functional Accents
*   **Precision Green** (`#00ff88`): "System Ready," Successful Commands, Safe Zones (UJ-inspired).
*   **Amber Warn** (`#ffaa00`): Medium alerts, Pending actions, Rate limiting.
*   **Critical Magenta** (`#ff2244`): System failures, Out-of-scope breaches.

---

##  Typography

*   **Display**: `Outfit`
    *   Used for titles, headers, and brand elements.
    *   Feel: Modern, structured, authoritative.
*   **Monospace**: `JetBrains Mono`
    *   Used for all technical data, terminal output, SIEM logs, and methodology steps.
    *   Feel: Industrial, precise, code-first.

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
