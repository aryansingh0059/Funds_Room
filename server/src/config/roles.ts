import { Role } from '@prisma/client';

/**
 * Central permission matrix for Funds Room ERP + CRM.
 *
 * Backend enforces these independently of the frontend.
 * ADMIN has full access to everything by default.
 */

const { ADMIN, SALES, WAREHOUSE, ACCOUNTS } = Role;

export const ROLES = {
  ALL: [ADMIN, SALES, WAREHOUSE, ACCOUNTS] as Role[],
  ADMIN_ONLY: [ADMIN] as Role[],
  ADMIN_SALES: [ADMIN, SALES] as Role[],
  ADMIN_WAREHOUSE: [ADMIN, WAREHOUSE] as Role[],
  ADMIN_SALES_WAREHOUSE: [ADMIN, SALES, WAREHOUSE] as Role[],
  ADMIN_ACCOUNTS: [ADMIN, ACCOUNTS] as Role[],
  // Followup read: ADMIN, SALES, ACCOUNTS (WAREHOUSE excluded)
  NO_WAREHOUSE: [ADMIN, SALES, ACCOUNTS] as Role[],
};

/**
 * RBAC Permission Matrix:
 *
 * Resource            | ADMIN | SALES | WAREHOUSE | ACCOUNTS
 * ─────────────────── | ──────|───────|───────────|─────────
 * User Management     |  CRUD |  ✗    |  ✗        |  ✗
 * Dashboard           |  R    |  R    |  R        |  R
 * Customers (Read)    |  R    |  R    |  R        |  R
 * Customers (Write)   |  CUD  |  CU   |  ✗        |  ✗
 * Followups (Read)    |  R    |  R    |  ✗        |  R
 * Followups (Write)   |  CUD  |  CU   |  ✗        |  ✗
 * Products (Read)     |  R    |  R    |  R        |  R
 * Products (Write)    |  CUD  |  ✗    |  CUD      |  ✗
 * Stock (Read)        |  R    |  R    |  R        |  R
 * Stock (Manual Adj.) |  CUD  |  ✗    |  CUD      |  ✗
 * Challans (Read)     |  R    |  R    |  R        |  R
 * Challans (Create)   |  C    |  C    |  ✗        |  ✗
 * Challans (Approve)  |  U    |  ✗    |  U        |  ✗
 * Challans (Cancel)   |  U    |  ✗    |  ✗        |  ✗
 */
