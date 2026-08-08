import http from 'http';

const makeReq = (
  method: string,
  path: string,
  headers: Record<string, string>,
  body: unknown = null,
): Promise<{ s: number; b: { success: boolean; message: string; data: Record<string, unknown> } }> =>
  new Promise((resolve, reject) => {
    const b = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          ...headers,
          ...(b
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(b).toString(),
              }
            : {}),
        },
      },
      (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => resolve({ s: r.statusCode ?? 0, b: JSON.parse(d) }));
      },
    );
    req.on('error', reject);
    if (b) req.write(b);
    req.end();
  });

const login = async (email: string, password: string): Promise<string> => {
  const res = await makeReq('POST', '/api/v1/auth/login', {}, { email, password });
  if (res.s !== 200 || !res.b.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.b)}`);
  }
  return res.b.data.token as string;
};

async function testFollowups() {
  console.log('\n🚀 Running Phase 6 Customer Follow-ups Test Suite...\n');

  // 1. Authenticate all roles
  const [adminToken, salesToken, warehouseToken, accountsToken] = await Promise.all([
    login('admin@fundsroom.com', 'Admin@1234'),
    login('sales@fundsroom.com', 'Sales@1234'),
    login('warehouse@fundsroom.com', 'Warehouse@1234'),
    login('accounts@fundsroom.com', 'Accounts@1234'),
  ]);
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const salesAuth = { Authorization: `Bearer ${salesToken}` };
  const warehouseAuth = { Authorization: `Bearer ${warehouseToken}` };
  const accountsAuth = { Authorization: `Bearer ${accountsToken}` };

  console.log('✓ All 4 roles authenticated successfully.');

  // 2. Create a test customer for follow-ups
  const custRes = await makeReq('POST', '/api/v1/customers', adminAuth, {
    name: 'Rajesh Enterprise',
    companyName: 'Rajesh Textiles Ltd',
    phone: '+91 91234 56789',
    email: 'rajesh@rajesh-textiles.com',
    customerType: 'WHOLESALER',
    creditLimit: 300000,
  });
  const customerId = (custRes.b.data.customer as { id: string }).id;
  console.log('✓ Test customer created:', customerId);

  // 3. Create follow-up by SALES
  const fuDate1 = new Date(Date.now() + 86400000).toISOString();
  const fuRes1 = await makeReq('POST', `/api/v1/customers/${customerId}/followups`, salesAuth, {
    type: 'CALL',
    status: 'PENDING',
    followupDate: fuDate1,
    notes: 'Initial introductory call with procurement manager. Agreed to share catalog.',
    outcome: 'Catalog shared via email.',
  });
  if (fuRes1.s !== 201) throw new Error(`Failed to create follow-up 1: ${JSON.stringify(fuRes1.b)}`);
  console.log('✓ Create follow-up 1 (CALL) as SALES: 201 OK');

  // 4. Create follow-up by ADMIN
  const fuDate2 = new Date(Date.now() + 172800000).toISOString();
  const fuRes2 = await makeReq('POST', `/api/v1/customers/${customerId}/followups`, adminAuth, {
    type: 'MEETING',
    status: 'COMPLETED',
    followupDate: fuDate2,
    notes: 'In-person meeting at head office. Finalized credit terms: 30 days net.',
    outcome: 'Credit limit approved up to 3 Lakhs.',
  });
  if (fuRes2.s !== 201) throw new Error(`Failed to create follow-up 2: ${JSON.stringify(fuRes2.b)}`);
  console.log('✓ Create follow-up 2 (MEETING) as ADMIN: 201 OK');

  // 5. List follow-ups for customer
  const listRes = await makeReq('GET', `/api/v1/customers/${customerId}/followups`, salesAuth);
  const followups = listRes.b.data.followups as Array<{ id: string; notes: string; type: string }>;
  if (listRes.s !== 200 || followups.length < 2) {
    throw new Error(`List follow-ups failed: expected >= 2 follow-ups, got ${followups?.length}`);
  }
  console.log(`✓ List follow-ups returned ${followups.length} entries with user details.`);

  // 6. Verify Customer Detail includes followups & _count
  const detailRes = await makeReq('GET', `/api/v1/customers/${customerId}`, adminAuth);
  const custDetail = detailRes.b.data.customer as {
    followups: unknown[];
    _count: { followups: number };
  };
  if (detailRes.s !== 200 || custDetail._count.followups < 2) {
    throw new Error('Customer detail does not reflect follow-up counts');
  }
  console.log(`✓ Customer detail verified: _count.followups = ${custDetail._count.followups}`);

  // 7. Verify RBAC on followups
  const whList = await makeReq('GET', `/api/v1/customers/${customerId}/followups`, warehouseAuth);
  if (whList.s !== 403) throw new Error(`Expected 403 for WAREHOUSE list follow-ups, got ${whList.s}`);
  console.log('✓ WAREHOUSE blocked from reading follow-ups: 403 Forbidden');

  const whCreate = await makeReq(
    'POST',
    `/api/v1/customers/${customerId}/followups`,
    warehouseAuth,
    { type: 'CALL', followupDate: fuDate1, notes: 'Test' },
  );
  if (whCreate.s !== 403) throw new Error(`Expected 403 for WAREHOUSE create follow-up, got ${whCreate.s}`);
  console.log('✓ WAREHOUSE blocked from creating follow-ups: 403 Forbidden');

  const accList = await makeReq('GET', `/api/v1/customers/${customerId}/followups`, accountsAuth);
  if (accList.s !== 200) throw new Error(`Expected 200 for ACCOUNTS list follow-ups, got ${accList.s}`);
  console.log('✓ ACCOUNTS allowed to read follow-ups: 200 OK');

  const accCreate = await makeReq(
    'POST',
    `/api/v1/customers/${customerId}/followups`,
    accountsAuth,
    { type: 'CALL', followupDate: fuDate1, notes: 'Test' },
  );
  if (accCreate.s !== 403) throw new Error(`Expected 403 for ACCOUNTS create follow-up, got ${accCreate.s}`);
  console.log('✓ ACCOUNTS blocked from creating follow-ups: 403 Forbidden');

  // 8. Validation checks
  const badFu = await makeReq('POST', `/api/v1/customers/${customerId}/followups`, salesAuth, {
    type: 'INVALID_TYPE',
    notes: '',
  });
  if (badFu.s !== 400) throw new Error(`Expected 400 for invalid follow-up data, got ${badFu.s}`);
  console.log('✓ Validation error for missing/invalid fields: 400 Bad Request');

  const notFoundFu = await makeReq('GET', '/api/v1/customers/nonexistent-id/followups', salesAuth);
  if (notFoundFu.s !== 404) throw new Error(`Expected 404 for nonexistent customer, got ${notFoundFu.s}`);
  console.log('✓ Nonexistent customer follow-ups: 404 Not Found');

  console.log('\n🎉 ALL CUSTOMER FOLLOW-UP TESTS PASSED!\n');
}

testFollowups().catch((err: Error) => {
  console.error('\n❌ Follow-up test suite failed:', err.message);
  process.exit(1);
});
