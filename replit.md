# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (jsonwebtoken) + bcryptjs password hashing
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Recharts + Framer Motion

## Inventory & Sales Management App

A dark-themed inventory and sales management system called **Aegis Control**.

### Authentication
- Test user: `email: testuser`, `password: testuser123`
- JWT stored in `localStorage` as `auth_token`
- All API routes (except `/auth/login`) are protected with `requireAuth` middleware
- JWT secret uses the `SESSION_SECRET` env var

### App Pages
- `/login` — Login page with JWT auth
- `/dashboard` — Command center with 4 summary cards + 4 charts
- `/management` — Regions list with add/edit/delete
- `/management/regions/:id` — Shops in a region with add/edit/delete
- `/management/shops/:id` — Orders for a shop with order creation

### Database Schema
- `users` — User accounts with hashed passwords
- `regions` — Geographic regions
- `shops` — Shops belonging to regions
- `items` — Inventory items with unit price, min order qty, stock
- `orders` — Sales orders for shops
- `order_line_items` — Line items for each order

### Data
- 4 regions, 10 shops, 10 inventory items
- 48 orders with 146 line items spanning Jan 2025 - Apr 2026

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
