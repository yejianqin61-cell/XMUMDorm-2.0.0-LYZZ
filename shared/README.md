# Shared Workspace

This directory contains logic shared by:

- `frontend/`
- `frontend-app/`

First-pass extraction is now in place for:

- `api/`
- `constants/`
- `query/`
- `utils/`

Current shared modules:

- `shared/api/`: backend-facing API wrappers and request helpers
- `shared/constants/`: stable business constants
- `shared/query/`: TanStack Query keys and client defaults
- `shared/utils/`: pure cross-platform helpers

Rules:

- Keep shared modules UI-agnostic whenever possible
- Do not move page, route, or layout code here
- Preserve Web and App behavioral parity for shared logic
- Keep platform-specific helpers in each frontend until they are proven shareable
