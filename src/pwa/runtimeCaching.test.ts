import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { COACH_RUNTIME_CACHING } from './runtimeCaching';

const require = createRequire(import.meta.url);

function intercepted(url: string): boolean {
  const parsed = new URL(url);
  return COACH_RUNTIME_CACHING.some((rule) =>
    rule.urlPattern instanceof RegExp ? rule.urlPattern.test(url) : rule.urlPattern({ url: parsed }),
  );
}

/**
 * Workbox copies `urlPattern` with `Function#toString()`. A matcher that
 * closes over a sibling binding throws ReferenceError once it is inside sw.js.
 * Pull each runtime matcher back out and run it with no surrounding scope.
 */
function runtimeMatcherSources(swSource: string): string[] {
  const sources: string[] = [];
  const token = 'registerRoute(';
  let from = 0;
  while (from < swSource.length) {
    const at = swSource.indexOf(token, from);
    if (at === -1) break;
    const arg = firstArgument(swSource, at + token.length);
    from = at + token.length + arg.length;
    const trimmed = arg.trim();
    if (trimmed.startsWith('new ') || trimmed.includes('NavigationRoute')) continue;
    sources.push(trimmed);
  }
  return sources;
}

function firstArgument(source: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i] ?? '';
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') depth += 1;
    else if (ch === ')' || ch === '}' || ch === ']') {
      if (depth === 0 && ch === ')') return source.slice(start, i);
      depth -= 1;
    } else if (ch === ',' && depth === 0) {
      return source.slice(start, i);
    }
  }
  throw new Error('registerRoute call did not close');
}

function isMatcherFn(value: unknown): value is (input: { url: URL }) => boolean {
  return typeof value === 'function';
}

function isPattern(value: unknown): value is { test: (input: string) => boolean } {
  return Object.prototype.toString.call(value) === '[object RegExp]';
}

function compileMatcher(source: string): (url: string) => boolean {
  const compiled: unknown = vm.runInContext(`(${source})`, vm.createContext({}), { timeout: 1000 });
  if (isMatcherFn(compiled)) {
    return (url) => compiled({ url: new URL(url) });
  }
  if (isPattern(compiled)) {
    return (url) => compiled.test(url);
  }
  throw new Error(`runtime matcher did not compile: ${source.slice(0, 120)}`);
}

const PROBES: Array<{ url: string; intercepted: boolean }> = [
  { url: 'https://one-assess.com/og-image.png', intercepted: true },
  { url: 'https://one-assess.com/assets/main-Cd_MqS3A.js', intercepted: false },
  { url: 'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8', intercepted: false },
  { url: 'https://securetoken.googleapis.com/v1/token', intercepted: false },
  { url: 'https://identitytoolkit.googleapis.com/v1/accounts:lookup', intercepted: false },
  { url: 'https://us-central1-assessment-engine-8f633.cloudfunctions.net/publicApiV1', intercepted: false },
  { url: 'https://storage.googleapis.com/assessment-engine-8f633.appspot.com/posture.jpg', intercepted: false },
];

function expectWorkerIsSafe(swSource: string): void {
  expect(swSource).not.toContain('SAME_ORIGIN_IMAGE');
  expect(swSource).not.toContain('NetworkFirst');
  expect(swSource).not.toContain('NetworkOnly');
  expect(swSource).not.toContain('firestore.googleapis.com');
  expect(swSource).not.toContain('securetoken.googleapis.com');
  expect(swSource).not.toContain('identitytoolkit.googleapis.com');
  expect(swSource).not.toContain('cloudfunctions.net');
  expect(swSource).not.toContain('storage.googleapis.com');
  expect(swSource).not.toContain('.run.app');
  const matchers = runtimeMatcherSources(swSource).map(compileMatcher);
  expect(matchers.length).toBeGreaterThan(0);
  for (const probe of PROBES) {
    let hit = false;
    for (const matches of matchers) {
      hit = matches(probe.url);
      if (hit) break;
    }
    expect(hit, probe.url).toBe(probe.intercepted);
  }
}

describe('coach service worker runtime caching', () => {
  it('does not intercept scripts or Firebase traffic', () => {
    expect(intercepted('https://one-assess.com/assets/main-Cd_MqS3A.js')).toBe(false);
    expect(intercepted('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8')).toBe(false);
    expect(intercepted('https://securetoken.googleapis.com/v1/token')).toBe(false);
    expect(intercepted('https://identitytoolkit.googleapis.com/v1/accounts:lookup')).toBe(false);
    expect(intercepted('https://us-central1-assessment-engine-8f633.cloudfunctions.net/publicApiV1')).toBe(false);
    expect(intercepted('https://storage.googleapis.com/assessment-engine-8f633.appspot.com/posture.jpg')).toBe(false);
  });

  it('still caches ordinary images', () => {
    expect(intercepted('https://one-assess.com/og-image.png')).toBe(true);
  });

  it('runs the generated service worker matchers in a fresh context', async () => {
    const root = await mkdtemp(join(tmpdir(), 'oa-sw-'));
    try {
      const swDest = join(root, 'sw.js');
      await buildWorker(root, swDest);
      expectWorkerIsSafe(await readFile(swDest, 'utf8'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('runs the Vite dist/sw.js matchers when that build exists', async () => {
    const distSw = resolve(process.cwd(), 'dist/sw.js');
    if (!existsSync(distSw)) return;
    expectWorkerIsSafe(await readFile(distSw, 'utf8'));
  });
});

function patternLiteral(rule: (typeof COACH_RUNTIME_CACHING)[number]): string {
  return rule.urlPattern.toString();
}

async function buildWorker(root: string, swDest: string): Promise<void> {
  const globDirectory = join(root, 'public');
  await mkdir(globDirectory);
  const runtimeCaching = COACH_RUNTIME_CACHING.map(
    (rule) => `{
      urlPattern: ${patternLiteral(rule)},
      handler: ${JSON.stringify(rule.handler)},
      options: ${JSON.stringify(rule.options)}
    }`,
  ).join(',\n');
  const workboxBuild = require.resolve('workbox-build');
  const script = `import { generateSW } from ${JSON.stringify(workboxBuild)};
await generateSW({
  globDirectory: ${JSON.stringify(globDirectory)},
  swDest: ${JSON.stringify(swDest)},
  globPatterns: ['**/*.html'],
  runtimeCaching: [${runtimeCaching}],
  mode: 'production',
});
`;
  const scriptPath = join(root, 'build-sw.mjs');
  await writeFile(scriptPath, script);
  await writeFile(join(globDirectory, 'index.html'), '<!doctype html><title>One Assess</title>');
  await runNode(scriptPath);
}

function runNode(scriptPath: string): Promise<void> {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(stderr || `service worker build exited ${code}`));
    });
  });
}
