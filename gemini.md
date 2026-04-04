# GEMINI.md — The Project Law & Data Schema

## 🟢 Data-First Standard (Mandatory)
All processing begins with a defined schema. No coding in `tools/` until the "Payload" shape is defined here.

## 🟢 Behavioral Rules
- **Layered Architecture (A.N.T.)**:
  - Layer 1: SOPs in `architecture/`.
  - Layer 2: Navigation (LLM decision routing).
  - Layer 3: Atomic Python Tools in `tools/`.
- **Deterministic Logic**: LLMs reason, scripts execute. Never trust the LLM with math or shell execution.
- **Self-Healing**: Failures MUST update `architecture/` documents so they don't repeat.
- **CyberSim Compliance**:
  - Isolated Docker containers ONLY. No internet access from within containers.
  - No real exploit payloads in filenames or source code (use reference IDs).
  - Every Python file must pass `black .` and `mypy .`.
  - React components must have Storybook stories (per Rule 22).
  - Use `.tmp/` for all intermediate file operations.
  - No placeholders. All images/assets must be generated or provided.

## 🟢 Data Schema (Input/Output shapes)
*Awaiting Phase 1: Blueprint discovery answers.*

## 🟢 Maintenance Log
*Project initialized on 2026-04-04.*
