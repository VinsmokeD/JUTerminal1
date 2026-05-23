# CyberSim Immersive HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the entire CyberSim frontend into a cinematic "Immersive HUD" with phased navigation and 3D context.

**Architecture:** We use a global `HudEnvironment` provider to manage the Three.js background and shared glassmorphism styles. Navigation is phased using Framer Motion for cinematic transitions between Briefing, Operation, and Debrief states.

**Tech Stack:** React, Tailwind CSS, Three.js, Framer Motion, Lucide React.

---

### Task 1: Foundation & Global Styles

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`

- [x] **Step 1: Inject HUD Fonts**
Add `<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&family=JetBrains+Mono:wght@400..800&display=swap" rel="stylesheet">` to `index.html`.

- [x] **Step 2: Update Tailwind Config**
Extend theme with `hud-void`, `hud-cyan`, `hud-crimson` colors and custom `clip-path` utilities.

- [x] **Step 3: Commit**
`git add frontend/tailwind.config.js frontend/index.html && git commit -m "style: foundation for HUD redesign (fonts & colors)"`

### Task 2: Global HUD Atmosphere

**Files:**
- Create: `frontend/src/components/layout/HudEnvironment.jsx`
- Modify: `frontend/src/App.jsx`

- [x] **Step 1: Implement HudEnvironment**
Create a component that renders a full-screen, fixed-position Three.js canvas with a subtle particle grid.

- [x] **Step 2: Wrap Application**
Wrap the main router in `App.jsx` with the `HudEnvironment` to provide the persistent atmosphere.

- [x] **Step 3: Commit**
`git add frontend/src/components/layout/HudEnvironment.jsx frontend/src/App.jsx && git commit -m "feat: add global Three.js HUD atmosphere"`

### Task 3: HUD Core Components Rework

**Files:**
- Modify: `frontend/src/components/ui/Button.jsx`
- Modify: `frontend/src/components/ui/Card.jsx`
- Modify: `frontend/src/components/ui/Badge.jsx`

- [ ] **Step 1: Restyle UI Primitives**
Apply `backdrop-blur`, `clip-path` angled corners, and glowing borders. Replace Inter with Orbitron for headers and JetBrains Mono for data.

- [ ] **Step 2: Commit**
`git add frontend/src/components/ui/ && git commit -m "style: rework UI primitives to HUD aesthetic"`

### Task 4: Cinematic Dashboard (The Briefing)

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Implement Staggered Entrance**
Use Framer Motion to animate mission cards into view with a "digital assembly" effect.

- [ ] **Step 2: Restyle Mission Cards**
Make them large, glassmorphic, and highly interactive.

- [ ] **Step 3: Commit**
`git commit -am "feat: cinematic mission briefing dashboard"`

### Task 5: Immersive Operation (Workspaces)

**Files:**
- Modify: `frontend/src/pages/RedWorkspace.jsx`
- Modify: `frontend/src/pages/BlueWorkspace.jsx`
- Modify: `frontend/src/components/terminal/Terminal.jsx`

- [ ] **Step 1: Style Terminal for HUD**
Transparent background, matching colors, and JetBrains Mono font.

- [ ] **Step 2: Operational Overlays**
Rework sidebar and top bars into minimal, semi-transparent HUD overlays that "float" at the edges.

- [ ] **Step 3: Commit**
`git commit -am "feat: immersive workspace HUD"`

### Task 6: Data-Rich Debrief (The Aftermath)

**Files:**
- Modify: `frontend/src/pages/Debrief.jsx`

- [ ] **Step 1: Intelligence Readout Style**
Restyle the Debrief page to look like a post-mission technical readout. Enhance charts and timelines with glowing data points.

- [ ] **Step 2: Commit**
`git commit -am "feat: data-rich intelligence debrief"`
