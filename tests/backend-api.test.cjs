const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Keep these tests independent of a developer's paid-provider configuration.
const environmentKeys = ['UPCITEMDB_KEY', 'SOLD_API_KEY', 'CORS_ORIGINS'];
const savedEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
process.env.UPCITEMDB_KEY = '';
process.env.SOLD_API_KEY = '';
process.env.CORS_ORIGINS = 'https://scanner.example.test';
const { app, loadLocalEnvironment } = require('../backend/server');
for (const key of environmentKeys) {
  if (savedEnvironment[key] === undefined) delete process.env[key];
  else process.env[key] = savedEnvironment[key];
}

let server;
let providerFetch;
const originalFetch = global.fetch;

test.before(async () => {
  global.fetch = (...args) => providerFetch(...args);
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
});

test.after(async () => {
  global.fetch = originalFetch;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function request(url, { method = 'GET', origin } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      path: url,
      method,
      headers: origin ? { Origin: origin } : {},
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: body ? JSON.parse(body) : null }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('the web app can call the backend from loopback and a configured origin', async () => {
  for (const origin of ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://[::1]:8081', 'https://scanner.example.test']) {
    const response = await request('/health', { origin });
    assert.equal(response.status, 200);
    assert.equal(response.headers['access-control-allow-origin'], origin);
    assert.deepEqual(response.body, { ok: true });
  }
  const preflight = await request('/api/lookup', { method: 'OPTIONS', origin: 'http://localhost:8081' });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers['access-control-allow-methods'], /GET/);
  const untrusted = await request('/health', { origin: 'https://localhost.evil.test' });
  assert.equal(untrusted.headers['access-control-allow-origin'], undefined);
});

test('a barcode lookup reaches the provider and returns product details', async () => {
  providerFetch = async (url, options) => {
    assert.equal(url, 'https://api.upcitemdb.com/prod/trial/lookup?upc=049000028911');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ items: [{ title: 'Diet Coke 12 Pack', brand: 'Diet Coke', images: ['https://example.test/product.jpg'] }] });
  };
  const response = await request('/api/lookup?upc=049000028911');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { title: 'Diet Coke 12 Pack', brand: 'Diet Coke', image: 'https://example.test/product.jpg' });
});

test('upstream rate limits remain diagnosable without exposing the response body', async () => {
  providerFetch = async () => Response.json({ code: 'EXCEED_LIMIT', message: 'secret provider diagnostic body' }, {
    status: 429,
    headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1793051347' },
  });
  const response = await request('/api/lookup?upc=049000028911');
  assert.equal(response.status, 502);
  assert.deepEqual(response.body, {
    error: 'lookup failed', provider: 'upcitemdb', reason: 'upstream_failure', upstreamStatus: 429,
    upstreamCode: 'EXCEED_LIMIT', rateLimitRemaining: 0, rateLimitReset: 1793051347,
  });
  assert.equal(JSON.stringify(response.body).includes('secret'), false);
});

test('unknown provider fields and malformed quota values stay private', async () => {
  providerFetch = async () => Response.json({ code: 'secret-token', message: 'secret provider message', account: 'private' }, {
    status: 401,
    headers: { 'x-ratelimit-remaining': 'private account detail', 'x-ratelimit-reset': '99999999999999999999' },
  });
  const response = await request('/api/lookup?upc=049000028911');
  assert.equal(response.status, 502);
  assert.deepEqual(response.body, { error: 'lookup failed', provider: 'upcitemdb', reason: 'upstream_failure', upstreamStatus: 401 });
});

test('non-JSON provider errors preserve the upstream status without returning HTML', async () => {
  providerFetch = async () => new Response('<html>private firewall diagnostic</html>', { status: 403 });
  const response = await request('/api/lookup?upc=049000028911');
  assert.equal(response.status, 502);
  assert.deepEqual(response.body, { error: 'lookup failed', provider: 'upcitemdb', reason: 'upstream_failure', upstreamStatus: 403 });
});

test('fetch transport failures expose only an allowlisted cause code', async () => {
  providerFetch = async () => {
    throw new TypeError('fetch failed for private provider URL', { cause: Object.assign(new Error('private network diagnostic'), { code: 'ENOTFOUND' }) });
  };
  const response = await request('/api/lookup?upc=049000028911');
  assert.equal(response.status, 502);
  assert.deepEqual(response.body, { error: 'lookup failed', provider: 'upcitemdb', reason: 'upstream_failure', networkCode: 'ENOTFOUND' });

  providerFetch = async () => {
    throw new TypeError('private provider URL', { cause: { code: 'secret-token' } });
  };
  const unknown = await request('/api/lookup?upc=049000028911');
  assert.deepEqual(unknown.body, { error: 'lookup failed', provider: 'upcitemdb', reason: 'upstream_failure' });
});

test('provider timeouts terminate with a useful gateway response', async () => {
  providerFetch = async (_url, options) => {
    assert.ok(options.signal instanceof AbortSignal);
    throw new DOMException('private provider URL', 'TimeoutError');
  };
  const response = await request('/api/lookup?upc=049000028911');
  assert.equal(response.status, 504);
  assert.deepEqual(response.body, { error: 'lookup failed', provider: 'upcitemdb', reason: 'timeout' });
});

test('missing sold-data credentials preserve the manual-comps fallback', async () => {
  providerFetch = async () => { throw new Error('must not call the provider without a key'); };
  const response = await request('/api/comps?q=Product');
  assert.equal(response.status, 501);
  assert.deepEqual(response.body, { manual: true });
});

test('backend env files load while existing deployment values take precedence', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'resale-backend-env-'));
  const filename = path.join(directory, '.env');
  const key = 'RESALE_SCANNER_ENV_TEST_VALUE';
  const previous = process.env[key];
  try {
    fs.writeFileSync(filename, `${key}=from-file\n`);
    delete process.env[key];
    loadLocalEnvironment(filename);
    assert.equal(process.env[key], 'from-file');
    process.env[key] = 'from-deployment';
    loadLocalEnvironment(filename);
    assert.equal(process.env[key], 'from-deployment');
    assert.doesNotThrow(() => loadLocalEnvironment(path.join(directory, 'missing.env')));
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
