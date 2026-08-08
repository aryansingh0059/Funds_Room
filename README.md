# Funds Room — Mini ERP + CRM Operations Portal

Funds Room is a full-stack ERP and CRM operations portal designed for wholesale and distribution enterprises.

## Tech Stack
- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma, JWT, bcrypt, Zod, Swagger
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Axios, TanStack Query, React Hook Form, Zod, Lucide React, Recharts
- **RBAC Roles:** `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`

## Monorepo Structure
```
fundsroom-erp-crm/
├── client/          # Vite + React + TypeScript + Tailwind frontend
├── server/          # Node + Express + TypeScript + Prisma backend
├── docs/            # Architecture diagrams, API specs, role workflows
├── postman/         # Postman collections & environment files
├── .env.example     # Root environment variable template
├── docker-compose.yml # Containerized PostgreSQL and services
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+) or Docker

### Installation & Development
1. Clone the repository
2. Setup environment variables: `cp server/.env.example server/.env`
3. Backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```
4. Frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
