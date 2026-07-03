# Shared Workspace

This directory contains logic shared by:

- `frontend/`
- `frontend-app/`

The first extraction pass targets:

- `api/`
- `constants/`
- `utils/`
- `query/`

Rules:

- Keep shared modules UI-agnostic whenever possible
- Do not move page, route, or layout code here
- Preserve Web and App behavioral parity for shared logic
