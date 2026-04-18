# Single npm run dev Setup (Frontend + Backend)

## Status: Completed

1. [x] Install concurrently
2. [x] Update package.json
3. [x] Update artifacts/my-app/vite.config.ts
4. [x] Test: `npm run dev` (frontend: localhost:3000)
5. [ ] [Optional] For prod single port: modify build to copy my-app/dist to api-server/dist/public, serve static in app.ts

Dev: Frontend on $PORT (proxy API), backend 3001 internal.
Deploy safe (dev-only).
