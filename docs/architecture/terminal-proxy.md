# SOP: WebSocket Terminal Proxy

## Overview
This document defines the duplex proxy between xterm.js (browser) and the Kali container (Docker) via FastAPI.

## Architecture
1. **Frontend**: xterm.js via WebSocket sends `{type: "terminal_input", data: "...", token: "..."}`.
2. **Backend (FastAPI)**:
   - Validates JWT and Session ID.
   - Publishes input to Redis channel `terminal:{session_id}:input`.
   - Subscribes to Redis channel `terminal:{session_id}:output` to send back shell responses.
3. **Execution Worker (sandbox/terminal.py)**:
   - Uses `docker.api.exec_create` and `exec_start(socket=True)` to create a persistent TTY session.
   - Forwards Redis input to the container socket.
   - Forwards container socket output to the Redis output channel.

## Duplex Logic
Input is picked up by a listener in `_stream_sync` which writes straight to the `sock`.
Output is picked up by a reader loop in `_stream_sync` which publishes to Redis.

## Fault Tolerance
- If the socket closes, the Redis subscription is cancelled.
- If the Redis pod crashes, the connection is reset.
- Containers time out after `sleep infinity` is interrupted or session ends.
