# Accessibility and Usability Notes

This document highlights the user experience (UX) architecture, interface styling, usability targets, and accessibility accommodations implemented across the CyberSim platform.

---

## 1. Usability Principles & Workspace Design

The CyberSim workspace is designed to mimic a high-density Security Operations Center (SOC) dashboard. The interface coordinates several functional streams (a Kali terminal, a live SIEM feed, Socratic hints, notes, and playbooks) without overwhelming the student.

```text
┌────────────────────────────────────────────────────────┐
│                   Workspace Header                     │
├───────────────────────────┬────────────────────────────┤
│                           │                            │
│                           │      AI Hint Panel         │
│                           │                            │
│       Kali Terminal       ├────────────────────────────┤
│        (xterm.js)         │                            │
│                           │       SIEM Feed            │
│                           │                            │
├───────────────────────────┴────────────────────────────┤
│                   Guided Notebook                      │
└────────────────────────────────────────────────────────┘
```

### 1.1 Persistent Workspace Layouts
* **Layout Presets**: Users can toggle between three resizable workspace layouts tailored to specific student focus areas:
  * *Focus*: Expands the terminal to cover 80% of the screen for intensive shell command typing.
  * *Balanced*: A 50/50 split between terminal and SIEM, ideal for coordinating attacker keystrokes with corresponding alerts.
  * *Debug*: Maximizes the SIEM feed and triage panels for forensic investigation.
* **Draggable Flex Dividers**: Implements resizable panels utilizing CSS flex containers and mouse-drag event handlers. This avoids heavy external drag-and-drop libraries, reducing bundle size and preventing UI stuttering.

### 1.2 UX Polish & Cleanups
* **Distraction-Free Direct Entry**: Standard CRT scanline overlays and bios welcome overlays are deactivated by default to ensure immediate terminal responsiveness and high readability of small command-line fonts.
* **Standard Scrollbars**: Tailwind style custom scrollbars are optimized with native fallback definitions, preventing scrollbar occlusion in Firefox and custom Linux browser instances.

---

## 2. Accessibility Mapping (WCAG 2.1 Alignment)

CyberSim targets compliance with Web Content Accessibility Guidelines (WCAG 2.1 AA) where possible for an interactive, console-based application.

### 2.1 Keyboard Navigation & Focus
* **Interactive Element Outlines**: Buttons, input cards, and tabs display explicit hover and focus rings.
* **Terminal Focus Loop**: The xterm.js terminal captures focus on tab navigation, enabling complete keyboard-driven command execution. Key events are bound to preventing default window tab actions while the terminal PTY is active.
* **Escaping Focus**: Users can press `Ctrl + Shift + Q` to release keyboard focus from the active xterm terminal instance back to the main document page.

### 2.2 Color Contrast and Theme
* **Midnight SOC Palette**: Uses a high-contrast dark theme (base void background `#08090c` against text `#e8eaf0`). Important status alerts use high-vibrancy status markers (`#00ff88` for success, `#ffaa00` for warning, and `#ff3b3b` for critical events), providing a minimum contrast ratio of 4.5:1 against dark surfaces.
* **Font Legibility**:Monospace text (such as SIEM logs and terminal commands) is set to `JetBrains Mono` at a minimum size of 12px. The sans-serif UI elements use `Outfit` to ensure glyph separation and readability.

### 2.3 Reduced Motion Accommodations
* **Animation Toggle**: The settings page includes a "Reduced Motion" option. When activated, CSS transitions, pulsing live dots, scanline sweep animations, and Three.js background canvas movements are paused (`data-animations="reduced"`).
* **Self-Healing Diagnostics**: Readiness checks are displayed statically rather than utilizing complex booting animations if reduced motion is requested.
