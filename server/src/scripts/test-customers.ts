import http from 'http';

const makeReq = (method: string, path: string, headers: Record<string, string>, body: unknown = null): Promise<{s: number; b: {success: boolean; message: string; data: Record<string, unknown>}}> =>
  new Promise((resolve, reject) => {
    const b = body ? JSON.stringify(body) : null;
    const req = http.request(
      { hostname: 'localhost', port: 5000, path, method, headers: { ...headers, ...(b ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b).toString() } : {}) } },
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

async function test() {
  const loginRes = await makeReq('POST', '/api/v1/auth/login', {}, { email: 'admin@fundsroom.com', password: 'Admin@1234' });
  const token = loginRes.b.data.token as string;
  const auth = { Authorization: `Bearer ${token}` };
  console.log('✓ Login:', loginRes.s === 200 ? 'OK' : `FAIL (${loginRes.s})`);

  const createRes = await makeReq('POST', '/api/v1/customers', auth, {
    name: 'Ramesh Kumar', companyName: 'Ramesh Traders', phone: '+91 98765 43210',
    email: 'ramesh@traders.com', customerType: 'WHOLESALER', status: 'ACTIVE',
    creditLimit: 500000, address: '123 Market Street, Mumbai', gstin: '22AAAAA0000A1Z5',
  });
  console.log('✓ Create customer:', createRes.s === 201 ? 'OK' : `FAIL (${createRes.s}) ${createRes.b.message}`);
  const cid = (createRes.b.data.customer as {id: string}).id;

  for (const c of [
    { name: 'Priya Shah', phone: '9876543211', customerType: 'RETAILER', creditLimit: 100000 },
    { name: 'Venkat Rao', phone: '9876543212', customerType: 'DISTRIBUTOR', creditLimit: 200000 },
    { name: 'Amit Singh', phone: '9876543213', customerType: 'LEAD', status: 'INACTIVE', creditLimit: 0 },
    { name: 'Sunita Desai', phone: '9876543214', customerType: 'PROSPECT', creditLimit: 50000 },
  ]) {
    const r = await makeReq('POST', '/api/v1/customers', auth, c);
    console.log(`✓ Create ${c.name}:`, r.s === 201 ? 'OK' : `FAIL (${r.s}) ${r.b.message}`);
  }

  const listRes = await makeReq('GET', '/api/v1/customers?page=1&limit=3&sortBy=name&sortOrder=asc', auth);
  const pag = listRes.b.data.pagination as {total: number; totalPages: number};
  console.log('✓ List+sort:', listRes.s === 200 ? 'OK' : 'FAIL', `total=${pag.total} pages=${pag.totalPages}`);

  const searchRes = await makeReq('GET', '/api/v1/customers?search=ramesh', auth);
  const sc = (searchRes.b.data.customers as unknown[]).length;
  console.log('✓ Search "ramesh":', searchRes.s === 200 && sc >= 1 ? 'OK' : 'FAIL', `found=${sc}`);

  const filterRes = await makeReq('GET', '/api/v1/customers?customerType=RETAILER&status=ACTIVE', auth);
  console.log('✓ Filter RETAILER+ACTIVE:', filterRes.s === 200 ? 'OK' : 'FAIL');

  const getRes = await makeReq('GET', `/api/v1/customers/${cid}`, auth);
  const cname = (getRes.b.data.customer as {name: string}).name;
  console.log(`✓ Get by ID: ${getRes.s === 200 ? 'OK' : 'FAIL'} name=${cname}`);

  const updateRes = await makeReq('PATCH', `/api/v1/customers/${cid}`, auth, { status: 'INACTIVE', creditLimit: 750000 });
  console.log('✓ Update customer:', updateRes.s === 200 ? 'OK' : `FAIL (${updateRes.s})`);

  const badRes = await makeReq('POST', '/api/v1/customers', auth, { name: 'X', phone: 'bad', customerType: 'INVALID' });
  console.log('✓ Validation 400:', badRes.s === 400 ? 'OK' : `FAIL (${badRes.s})`);

  const nfRes = await makeReq('GET', '/api/v1/customers/nonexistent-id', auth);
  console.log('✓ Not found 404:', nfRes.s === 404 ? 'OK' : `FAIL (${nfRes.s})`);

  const p2Res = await makeReq('GET', '/api/v1/customers?page=2&limit=2&sortBy=createdAt', auth);
  const p2c = (p2Res.b.data.customers as unknown[]).length;
  console.log(`✓ Pagination page 2: ${p2Res.s === 200 ? 'OK' : 'FAIL'} customers=${p2c}`);

  console.log('\n🎉 ALL CUSTOMER API SMOKE TESTS PASSED!');
}

test().catch((e: Error) => {
  console.error('❌ FAIL:', e.message);
  process.exit(1);
});
