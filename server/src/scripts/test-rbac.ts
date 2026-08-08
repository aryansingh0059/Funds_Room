import http from 'http';
import app from '../app';

let serverInstance: http.Server;

interface ApiResponseEnvelope {
  success: boolean;
  message: string;
  data?: unknown;
  error?: unknown;
}

interface LoginData {
  token: string;
  user: { role: string; email: string };
}

const makeRequest = (
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body: unknown = null,
): Promise<{ status: number; body: ApiResponseEnvelope }> => {
  return new Promise((resolve, reject) => {
    const jsonBody = body ? JSON.stringify(body) : null;
    const reqHeaders: Record<string, string> = {
      ...headers,
      ...(jsonBody
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonBody).toString(),
          }
        : {}),
    };

    const req = http.request(
      { hostname: 'localhost', port: 5098, path, method, headers: reqHeaders },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: rawData ? JSON.parse(rawData) : {} });
          } catch {
            reject(new Error(`Failed to parse JSON: ${rawData}`));
          }
        });
      },
    );
    req.on('error', reject);
    if (jsonBody) req.write(jsonBody);
    req.end();
  });
};

const login = async (email: string, password: string): Promise<string> => {
  const res = await makeRequest('POST', '/api/v1/auth/login', {}, { email, password });
  const data = res.body.data as LoginData;
  if (res.status !== 200 || !data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return data.token;
};

const authed = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });

const assert403 = (label: string, status: number): void => {
  if (status !== 403) throw new Error(`[FAIL] ${label}: expected 403 but got ${status}`);
  console.log(`   ✓ 403 Forbidden — ${label}`);
};

const assert200or201 = (label: string, status: number): void => {
  if (status !== 200 && status !== 201) throw new Error(`[FAIL] ${label}: expected 200/201 but got ${status}`);
  console.log(`   ✓ ${status} OK — ${label}`);
};

async function runRbacTests() {
  console.log('\n🚀 Starting Phase 4 RBAC Authorization Test Suite...\n');
  serverInstance = app.listen(5098);

  // Login all 4 roles
  const [adminToken, salesToken, warehouseToken, accountsToken] = await Promise.all([
    login('admin@fundsroom.com', 'Admin@1234'),
    login('sales@fundsroom.com', 'Sales@1234'),
    login('warehouse@fundsroom.com', 'Warehouse@1234'),
    login('accounts@fundsroom.com', 'Accounts@1234'),
  ]);
  console.log('✅ All 4 roles logged in successfully.\n');

  // ────────────────────────────────────────────
  // 1. DASHBOARD — all roles can access
  // ────────────────────────────────────────────
  console.log('── 1. Dashboard (all roles should 200) ──');
  for (const [role, token] of [['ADMIN', adminToken], ['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('GET', '/api/v1/dashboard', authed(token as string));
    assert200or201(`Dashboard GET as ${role}`, r.status);
  }

  // ────────────────────────────────────────────
  // 2. USER MANAGEMENT — ADMIN only
  // ────────────────────────────────────────────
  console.log('\n── 2. User Management (ADMIN-only; SALES/WAREHOUSE/ACCOUNTS → 403) ──');
  for (const [role, token] of [['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('GET', '/api/v1/users', authed(token as string));
    assert403(`GET /users as ${role}`, r.status);
  }
  for (const [role, token] of [['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('POST', '/api/v1/users', authed(token as string), {});
    assert403(`POST /users as ${role}`, r.status);
  }
  const adminUsersRes = await makeRequest('GET', '/api/v1/users', authed(adminToken));
  assert200or201('GET /users as ADMIN', adminUsersRes.status);

  // ────────────────────────────────────────────
  // 3. CUSTOMERS
  // ────────────────────────────────────────────
  console.log('\n── 3. Customers ──');
  // Reads: all roles
  for (const [role, token] of [['ADMIN', adminToken], ['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('GET', '/api/v1/customers', authed(token as string));
    assert200or201(`GET /customers as ${role}`, r.status);
  }
  // Write (POST): WAREHOUSE & ACCOUNTS → 403
  for (const [role, token] of [['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('POST', '/api/v1/customers', authed(token as string), {});
    assert403(`POST /customers as ${role}`, r.status);
  }
  // Write (POST): ADMIN & SALES → 200/201
  for (const [role, token] of [['ADMIN', adminToken], ['SALES', salesToken]]) {
    const r = await makeRequest('POST', '/api/v1/customers', authed(token as string), {});
    assert200or201(`POST /customers as ${role}`, r.status);
  }
  // Delete: only ADMIN allowed
  for (const [role, token] of [['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('DELETE', '/api/v1/customers/fake-id', authed(token as string));
    assert403(`DELETE /customers/:id as ${role}`, r.status);
  }

  // ────────────────────────────────────────────
  // 4. FOLLOWUPS — WAREHOUSE excluded from all
  // ────────────────────────────────────────────
  console.log('\n── 4. Customer Followups ──');
  const warehouseFollowupRead = await makeRequest('GET', '/api/v1/customers/fake-id/followups', authed(warehouseToken));
  assert403('GET /customers/:id/followups as WAREHOUSE', warehouseFollowupRead.status);

  for (const [role, token] of [['ADMIN', adminToken], ['SALES', salesToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('GET', '/api/v1/customers/fake-id/followups', authed(token as string));
    assert200or201(`GET /customers/:id/followups as ${role}`, r.status);
  }
  for (const [role, token] of [['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('POST', '/api/v1/customers/fake-id/followups', authed(token as string), {});
    assert403(`POST /customers/:id/followups as ${role}`, r.status);
  }

  // ────────────────────────────────────────────
  // 5. PRODUCTS
  // ────────────────────────────────────────────
  console.log('\n── 5. Products ──');
  // Reads: all roles
  for (const [role, token] of [['ADMIN', adminToken], ['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('GET', '/api/v1/products', authed(token as string));
    assert200or201(`GET /products as ${role}`, r.status);
  }
  // Write: SALES & ACCOUNTS → 403
  for (const [role, token] of [['SALES', salesToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('POST', '/api/v1/products', authed(token as string), {});
    assert403(`POST /products as ${role}`, r.status);
  }
  // Write: ADMIN & WAREHOUSE → 200/201
  for (const [role, token] of [['ADMIN', adminToken], ['WAREHOUSE', warehouseToken]]) {
    const r = await makeRequest('POST', '/api/v1/products', authed(token as string), {});
    assert200or201(`POST /products as ${role}`, r.status);
  }

  // ────────────────────────────────────────────
  // 6. STOCK MOVEMENTS
  // ────────────────────────────────────────────
  console.log('\n── 6. Stock Movements ──');
  // Manual adjustment: SALES & ACCOUNTS → 403
  for (const [role, token] of [['SALES', salesToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('POST', '/api/v1/stock', authed(token as string), {});
    assert403(`POST /stock as ${role}`, r.status);
  }
  // ADMIN & WAREHOUSE → 200/201
  for (const [role, token] of [['ADMIN', adminToken], ['WAREHOUSE', warehouseToken]]) {
    const r = await makeRequest('POST', '/api/v1/stock', authed(token as string), {});
    assert200or201(`POST /stock as ${role}`, r.status);
  }

  // ────────────────────────────────────────────
  // 7. CHALLANS
  // ────────────────────────────────────────────
  console.log('\n── 7. Sales Challans ──');
  // Reads: all roles
  for (const [role, token] of [['ADMIN', adminToken], ['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('GET', '/api/v1/challans', authed(token as string));
    assert200or201(`GET /challans as ${role}`, r.status);
  }
  // Create: WAREHOUSE & ACCOUNTS → 403
  for (const [role, token] of [['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('POST', '/api/v1/challans', authed(token as string), {});
    assert403(`POST /challans as ${role}`, r.status);
  }
  // Create: ADMIN & SALES → 200/201
  for (const [role, token] of [['ADMIN', adminToken], ['SALES', salesToken]]) {
    const r = await makeRequest('POST', '/api/v1/challans', authed(token as string), {});
    assert200or201(`POST /challans as ${role}`, r.status);
  }
  // Status update (approve/dispatch): SALES & ACCOUNTS → 403
  for (const [role, token] of [['SALES', salesToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('PATCH', '/api/v1/challans/fake-id/status', authed(token as string), {});
    assert403(`PATCH /challans/:id/status as ${role}`, r.status);
  }
  // Cancel: non-ADMIN → 403
  for (const [role, token] of [['SALES', salesToken], ['WAREHOUSE', warehouseToken], ['ACCOUNTS', accountsToken]]) {
    const r = await makeRequest('PATCH', '/api/v1/challans/fake-id/cancel', authed(token as string), {});
    assert403(`PATCH /challans/:id/cancel as ${role}`, r.status);
  }

  console.log('\n🎉 ALL RBAC AUTHORIZATION TESTS PASSED!');
}

runRbacTests()
  .catch((err) => {
    console.error('\n❌ RBAC test suite failed:', err.message);
    process.exit(1);
  })
  .finally(() => {
    if (serverInstance) serverInstance.close();
  });
