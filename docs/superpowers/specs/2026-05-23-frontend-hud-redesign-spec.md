# CyberSim Immersive HUD Design Spec (Approved)

**Date:** 2026-05-23
**Status:** Approved
**Aesthetic:** Immersive HUD / Cinematic Phased Navigation

## 1. Aesthetic Direction: Immersive HUD
We will abandon standard "SaaS" design patterns in favor of a cinematic, operator-centric interface.
- **Backgrounds:** Deep void (`#030508`) overlaid with a persistent, subtle Three.js particle or wireframe grid that reacts slowly to cursor movement.
- **Surfaces:** Heavy use of glassmorphism (frosted glass, `backdrop-blur-xl`, semi-transparent deep blues/blacks).
- **Shapes:** Breaking the box. We will use CSS `clip-path` to create angled corners, tech-inspired chamfers, and non-rectangular data panels.
- **Accents:** Sharp, neon-glow accents (Cyan/Blue for Blue Team, Crimson/Orange for Red Team) that pulse or illuminate on interaction.

## 2. Typography Strategy
Moving away from standard sans-serifs to establish a strong visual identity:
- **Display/Headings:** A wide, geometric, sci-fi inspired font (e.g., Google Fonts *Orbitron* or *Syncopate*) to make mission titles and phases feel cinematic.
- **Body & Data:** A highly legible, sharp monospace font (e.g., *JetBrains Mono*) for all telemetry, logs, and terminal outputs. No standard body fonts; everything feels like data.

## 3. Structural Layout: Cinematic Phased Navigation
The application will be restructured into distinct, immersive phases rather than a cluttered single screen:
- **Phase 1: The Briefing (Lobby/Dashboard):** Centered, high-impact mission selection. Large typography, dramatic entrance animations for scenario cards.
- **Phase 2: The Operation (Workspaces):** The UI fades back, bringing the terminal and primary feed into deep focus. Surrounding UI elements become minimal, holographic overlays on the edges of the screen.
- **Phase 3: The Aftermath (Debrief):** A data-rich, analytical view. The radar charts and timelines are restyled to look like high-end intelligence readouts, prioritizing dramatic data visualization over standard cards.

## 4. Component Rework
- **Buttons:** Angled corners, glowing borders on hover, monospace text.
- **Cards:** Glassmorphic background, subtle border glow, `clip-path` corners.
- **Terminal:** Transparent background, `JetBrains Mono` font, integrated into the HUD panel.

## 5. Technology Stack
- **Styling:** Tailwind CSS (Custom config for colors, animations, and clip-paths).
- **Animation:** Framer Motion (for staggered entrance) + Vanilla CSS transitions.
- **Background:** Three.js (Particle system/Wireframe grid).
- **Icons:** Lucide React (Styled with HUD glows).
