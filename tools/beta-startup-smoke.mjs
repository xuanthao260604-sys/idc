// Cross-platform CLI lifecycle check. Uses real child processes and loopback HTTP only.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cwd = await mkdtemp(join(tmpdir(), 'YGO kiểm tra khởi động '));
async function bounded(promise, ms, message) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]); }
  finally { clearTimeout(timer); }
}
async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { port: server.address().port, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
async function withBeta(port, check) {
  const child = spawn(process.execPath, [join(root, 'dist', 'tools', 'beta.js')], {
    cwd, env: { ...process.env, YGO_BETA_PORT: String(port) }, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '', stderr = '', launchError;
  child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-65536); });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-65536); });
  child.on('error', error => { launchError = error; });
  const done = new Promise(resolve => child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr, launchError })));
  try { return await check({ child, done, output: () => stdout, error: () => launchError }); }
  finally {
    if (child.pid && child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
    try { await bounded(done, 4000, 'Beta process did not stop'); }
    catch (error) { child.kill('SIGKILL'); await bounded(done, 4000, 'Beta process could not be cleaned up'); throw error; }
  }
}
try {
  await withBeta(0, async ({ done }) => {
    const result = await bounded(done, 5000, 'Invalid port did not terminate');
    assert.ok(result.code !== null && result.code !== 0); assert.match(result.stderr, /YGO_BETA_PORT phải từ 1 đến 65535/);
  });
  const occupied = await reservePort();
  try {
    await withBeta(occupied.port, async ({ done }) => {
      const result = await bounded(done, 5000, 'Occupied port did not terminate');
      assert.ok(result.code !== null && result.code !== 0); assert.match(result.stderr, /EADDRINUSE/);
    });
  } finally { await occupied.close(); }
  const available = await reservePort(); const port = available.port; await available.close();
  const base = `http://127.0.0.1:${port}`;
  const request = (path, options) => fetch(base + path, { ...options, signal: AbortSignal.timeout(2000) });
  const post = (path, body, cookie) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
  let previousDuel;
  for (let run = 0; run < 2; run++) await withBeta(port, async ({ child, output, error }) => {
    const deadline = Date.now() + 5000;
    while (!output().includes('beta trên máy này:')) {
      if (error()) throw error();
      assert.equal(child.exitCode, null, 'Beta exited before ready');
      assert.ok(Date.now() < deadline, 'Beta did not become ready');
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    for (const [path, type] of [['/', 'text/html'], ['/app.js', 'text/javascript'], ['/style.css', 'text/css']]) {
      const response = await request(path); assert.equal(response.status, 200);
      assert.ok(response.headers.get('content-type').startsWith(type)); assert.ok((await response.text()).length > 100);
    }
    assert.equal((await request('/api/view')).status, 401);
    const seat = await post('/api/seat', { seat: 'a' }); assert.equal(seat.status, 200);
    const cookie = seat.headers.get('set-cookie').split(';')[0], view = await seat.json();
    assert.equal(view.selfHand.length, 6); assert.equal(view.opponentHandCount, 5); assert.equal(view.stateVersion, 0);
    if (run) assert.notEqual(view.duelId, previousDuel, 'Restart must create a fresh in-memory duel');
    previousDuel = view.duelId;
    const cmd = { commandId: 'startup-pass', duelId: view.duelId, expectedStateVersion: 0, action: { type: 'pass' } };
    const accepted = await (await post('/api/command', cmd, cookie)).json();
    const retry = await (await post('/api/command', cmd, cookie)).json();
    assert.equal(accepted.outcome.accepted, true); assert.equal(accepted.view.stateVersion, 1);
    assert.deepEqual(retry.outcome, accepted.outcome); assert.equal(retry.view.stateVersion, 1);
  });
  console.log(JSON.stringify({ platform: process.platform, node: process.versions.node, mode: 'beta-cli-startup',
    cases: ['invalid-port-exit', 'occupied-port-exit', 'unicode-cwd', 'static-assets', 'private-view', 'command-and-retry', 'stop-and-restart'],
    launches: 4, windows11DesktopVerified: false }));
} finally { await rm(cwd, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
