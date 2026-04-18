# MySQL Setup Guide for Inventory Sales Hub

## Prerequisites
- MySQL Server installed locally
- MySQL root user with password `2004`
- Node.js v18+ installed

## Step-by-Step Setup

### 1. Create the Database and Tables

#### Option A: Using MySQL CLI
```bash
# Connect to MySQL
mysql -u root -p

# Enter password: 2004

# Then paste the contents of database-setup.sql
# Or run directly:
mysql -u root -p2004 < database-setup.sql
```

#### Option B: Using MySQL Workbench
1. Open MySQL Workbench
2. Create a new connection with:
   - Hostname: `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: `2004`
3. Open `database-setup.sql` and execute it

#### Option C: Manual Creation
```bash
# Open MySQL shell
mysql -u root -p2004

# Create database
CREATE DATABASE IF NOT EXISTS inventory_sales_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventory_sales_hub;

# Then paste all CREATE TABLE statements from database-setup.sql
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

This installs:
- `mysql2` - MySQL driver for Node.js
- `drizzle-orm` - ORM for type-safe database queries
- `dotenv` - Environment variable loader

### 3. Environment Configuration

The `.env` file is already created with your MySQL connection:
```env
DATABASE_URL=mysql://root:2004@localhost:3306/inventory_sales_hub
```

If you need to change credentials, update the `.env` file:
```env
DATABASE_URL=mysql://username:password@host:port/database_name
```

### 4. Test Database Connection

```bash
# Test connection with sample query
npm run db:test

# Or manually test:
tsx test-db-connection.ts
```

### 5. Create Database Schema with Drizzle

```bash
# Generate migrations from your schema files
npm run db:push

# Force push (use with caution, clears existing data)
npm run db:push-force
```

### 6. Start Development Server

```bash
# Start API server (connects automatically to MySQL)
npm run dev

# Or individual commands:
npm run dev:api-server     # Backend only (port 3001)
npm run dev:my-app         # Frontend only (port 3000)
npm run dev:mockup-sandbox # Mockup sandbox
```

## File Changes Made

### Configuration Files
- **`.env`** - MySQL connection string (created)
- **`.env.example`** - Example configuration for reference
- **`lib/db/drizzle.config.ts`** - Updated from PostgreSQL to MySQL

### Schema Files (Updated for MySQL)
- **`lib/db/src/schema/users.ts`** - Using `mysqlTable` and `int().autoincrement()`
- **`lib/db/src/schema/regions.ts`** - MySQL compatible schema
- **`lib/db/src/schema/shops.ts`** - MySQL compatible schema
- **`lib/db/src/schema/items.ts`** - Using `decimal()` instead of `numeric()`
- **`lib/db/src/schema/orders.ts`** - MySQL compatible schema

### Package Dependencies
- Replaced: `pg` → `mysql2`
- Added: `dotenv`
- Removed: `@types/pg`

## Database Schema

### Tables Created
1. **users** - Authentication and user management
2. **regions** - Geographic areas/districts
3. **shops** - Store locations within regions
4. **items** - Inventory products
5. **orders** - Customer orders
6. **order_line_items** - Line items in each order

### Foreign Key Relationships
```
regions (1) ──→ shops (M)
shops (1) ──→ orders (M)
orders (1) ──→ order_line_items (M)
items (1) ──→ order_line_items (M)
```

## Troubleshooting

### Connection Error: "ECONNREFUSED"
- MySQL is not running
- Wrong host/port (should be `localhost:3306`)
- Check MySQL service: `mysql.server status` or `systemctl status mysql`

### Error: "Unknown database 'inventory_sales_hub'"
- Database wasn't created
- Run: `mysql -u root -p2004 < database-setup.sql`

### Error: "Access denied for user 'root'@'localhost'"
- Wrong password (should be `2004`)
- Update `.env` with correct credentials

### Drizzle Sync Error
The schema defines `timestamp()` without timezone (MySQL compatible):
```typescript
createdAt: timestamp("created_at").notNull().defaultNow()
```

For automatic sync, run:
```bash
npm run db:push
```

## Running the Application

```bash
# Full development (Frontend + Backend)
npm run dev

# Backend only
npm run dev:api-server

# Frontend only
npm run dev:my-app

# Mockup/UI sandbox
npm run dev:mockup-sandbox

# Type checking
npm run typecheck

# Building
npm run build

# Production start (after build)
npm run start
```

## API Endpoints Available

The application includes routes for:
- **`/auth`** - User authentication
- **`/regions`** - Region management
- **`/shops`** - Shop management
- **`/items`** - Item/inventory management
- **`/orders`** - Order management
- **`/dashboard`** - Dashboard data
- **`/health`** - Health check

## Sample Data

The database includes pre-populated sample data:
- 3 regions
- 4 shops
- 5 items
- 3 orders with line items
- 1 admin user

You can query them directly or test via API endpoints.

## Next Steps

1. ✅ Database created and connected
2. ✅ Schema tables in place
3. ✅ Sample data loaded
4. → Start the development server: `npm run dev`
5. → Test API endpoints
6. → Build your application features

Enjoy building! 🚀
