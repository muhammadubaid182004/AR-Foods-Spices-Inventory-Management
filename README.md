# Inventory Sales Hub

Inventory Sales Hub is a TypeScript monorepo for inventory, distributor, and sales order management.
It includes an Express API server, a React + Vite frontend, shared API client/schema packages, and Drizzle ORM database schema modules.

## Tech Stack

- Node.js + TypeScript
- Express 5 API server
- React 19 + Vite frontend
- Drizzle ORM + Drizzle Kit
- OpenAPI + Orval code generation
- Zod schemas and generated API types

## Repository Structure

- `artifacts/api-server` - backend API and server runtime
- `artifacts/my-app` - main frontend app
- `artifacts/mockup-sandbox` - UI/mockup sandbox app
- `lib/db` - shared DB client and schema
- `lib/api-spec` - OpenAPI definition
- `lib/api-client-react` - generated React client utilities
- `lib/api-zod` - generated Zod schemas/types
- `scripts` - utility scripts

## Prerequisites

- Node.js 20+ (24 recommended)
- npm 10+
- A database connection string in `DATABASE_URL`

## Environment Variables

Create a `.env` file at repo root for backend variables:

```bash
DATABASE_URL=your_database_connection_string
SESSION_SECRET=replace_with_a_secure_secret
API_PORT=3000
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
```

Frontend environment variables live in `artifacts/my-app/.env` (or `.env.local`):

```bash
VITE_API_BASE_URL=
```

Leave `VITE_API_BASE_URL` empty to use same-origin requests (default local setup). Set it when API and frontend are hosted on different origins.

## Getting Started

```bash
npm install
```

Start local development (API + frontend served from one server):

```bash
npm run dev
```

Then open:

- App: [http://localhost:3000](http://localhost:3000)
- API base: [http://localhost:3000/api](http://localhost:3000/api)

## Useful Scripts

- `npm run dev` - start integrated dev server (API + Vite middleware)
- `npm run dev:api-server` - watch and run API server
- `npm run dev:my-app` - run frontend Vite server only
- `npm run build` - typecheck and build all deliverables
- `npm run build:api-server` - build API server
- `npm run build:my-app` - build frontend app
- `npm run start` - run built server from `dist`
- `npm run typecheck` - TypeScript project reference build
- `npm run db:push` - push Drizzle schema changes
- `npm run api-spec:codegen` - regenerate API client and Zod types from OpenAPI

## API and Auth Notes

- API routes are mounted under `/api`
- Auth uses JWT with `SESSION_SECRET`
- CORS is controlled by `CORS_ORIGIN` (comma-separated origins)

## Build and Production

```bash
npm run build
npm run start
```

In production, the server serves static frontend assets from `dist/public` and exposes API routes at `/api`.

