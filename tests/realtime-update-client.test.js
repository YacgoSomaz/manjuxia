const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  UpdateClient,
  REALTIME_CHECK_INTERVAL_MS,
  SSE_RECONNECT_DELAY_MS,
} = require("../electron/update-client");

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

function createSseStream() {
  let controller;
  const body = new ReadableStream({
    start(nextController) {
      controller = nextController;
    },
  });
  return {
    body,
    push(text) {
      controller.enqueue(new TextEncoder().encode(text));
    },
    close() {
      controller.close();
    },
  };
}

function createClient({ sseFetchImpl, latestCalls, timers }) {
  return new UpdateClient({
    app: { getVersion: () => "0.1.13" },
    config: { update_public_key: "test-key" },
    dataDir: "",
    mainWindow: null,
    fetchImpl: async () => {
      latestCalls.push(true);
      return { ok: true, status: 200, json: async () => ({ update_release: null }) };
    },
    sseFetchImpl,
    setIntervalImpl: (callback, delay) => {
      timers.intervals.push({ callback, delay });
      return timers.intervals.length;
    },
    clearIntervalImpl: (handle) => timers.clearedIntervals.push(handle),
    setTimeoutImpl: (callback, delay) => {
      timers.timeouts.push({ callback, delay });
      return timers.timeouts.length;
    },
    clearTimeoutImpl: (handle) => timers.clearedTimeouts.push(handle),
  });
}

test("SSE uses the fixed comic product and a release event rechecks the signed endpoint", async () => {
  const stream = createSseStream();
  const sseUrls = [];
  const latestCalls = [];
  const timers = { intervals: [], timeouts: [], clearedIntervals: [], clearedTimeouts: [] };
  const client = createClient({
    sseFetchImpl: async (url) => {
      sseUrls.push(url);
      return { ok: true, status: 200, body: stream.body };
    },
    latestCalls,
    timers,
  });

  client.startRealtimeMonitoring();
  await tick();
  assert.equal(sseUrls[0], "https://anyq.site/api/v1/releases/events?product_id=comic_shrimp");
  assert.equal(timers.intervals[0].delay, REALTIME_CHECK_INTERVAL_MS);

  stream.push("event: heartbeat\ndata: {\"version\":\"999.0.0\"}\n\n");
  await tick();
  assert.equal(latestCalls.length, 0, "only release events may trigger a check");
  stream.push('event: release\ndata: {"version":"999.0.0","mandatory":true}\n\n');
  await tick();
  await tick();
  assert.equal(latestCalls.length, 1);
  assert.equal(client.currentRelease, null, "SSE payload must never become an installable release");
  client.stopRealtimeMonitoring();
});

test("60-second fallback checks, reconnects after disconnect, and stops cleanly", async () => {
  const first = createSseStream();
  const second = createSseStream();
  const streams = [first, second];
  let sseCalls = 0;
  const latestCalls = [];
  const timers = { intervals: [], timeouts: [], clearedIntervals: [], clearedTimeouts: [] };
  const client = createClient({
    sseFetchImpl: async () => ({ ok: true, status: 200, body: streams[sseCalls++]?.body }),
    latestCalls,
    timers,
  });

  client.startRealtimeMonitoring();
  client.startRealtimeMonitoring();
  await tick();
  assert.equal(sseCalls, 1, "only one SSE connection may be active");
  await timers.intervals[0].callback();
  assert.equal(latestCalls.length, 1);
  first.close();
  await tick();
  assert.equal(timers.timeouts[0].delay, SSE_RECONNECT_DELAY_MS);
  timers.timeouts[0].callback();
  await tick();
  assert.equal(sseCalls, 2);
  const activeSignal = client.sseAbortController.signal;

  client.stopRealtimeMonitoring();
  assert.equal(activeSignal.aborted, true);
  assert.deepEqual(timers.clearedIntervals, [1]);
  assert.deepEqual(timers.clearedTimeouts, []);
});

test("the packaged app includes the same updater and has no private-key dependency", () => {
  const main = fs.readFileSync(path.join(__dirname, "..", "electron", "main.js"), "utf8");
  const build = fs.readFileSync(path.join(__dirname, "..", "packaging", "build", "Build-ElectronApp.ps1"), "utf8");
  assert.match(main, /updateClient\.startRealtimeMonitoring\(\)/);
  assert.match(main, /updateClient\.stopRealtimeMonitoring\(\)/);
  assert.match(build, /Join-Path \$projectRoot "electron"/);
  assert.doesNotMatch(build, /update.*private|private.*update/i);
});
