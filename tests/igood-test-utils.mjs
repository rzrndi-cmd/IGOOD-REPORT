import { promises as fs } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempPlaywrightPath = path.join(os.tmpdir(), 'igood-playwright-check', 'node_modules', 'playwright');
let staticServer;
let staticServerPromise;

const { chromium } = loadPlaywright();

function loadPlaywright() {
  const candidates = [process.env.PW, 'playwright', tempPlaywrightPath].filter(Boolean);
  const errors = [];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }

  throw new Error(`Unable to load Playwright. Tried ${candidates.join(', ')}.\n${errors.join('\n')}`);
}

async function checkIgoodServer() {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const request = http.get('http://127.0.0.1:4173/', (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => finish({ reachable: true, isIgood: body.includes('Igood Report') }));
    });

    request.setTimeout(1500, () => {
      request.destroy();
      finish({ reachable: false, isIgood: false });
    });
    request.on('error', () => finish({ reachable: false, isIgood: false }));
  });
}

async function ensureIgoodServer() {
  const existingServer = await checkIgoodServer();
  if (existingServer.isIgood) return;
  if (existingServer.reachable) {
    throw new Error('Port 4173 is reachable, but the response does not contain "Igood Report".');
  }

  if (!staticServerPromise) {
    staticServerPromise = startStaticServer().catch((error) => {
      staticServerPromise = undefined;
      throw error;
    });
  }
  await staticServerPromise;

  const startedServer = await checkIgoodServer();
  if (!startedServer.isIgood) throw new Error('Started Igood test server, but the response does not contain "Igood Report".');
}

async function startStaticServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const decodedUrl = decodeURIComponent(request.url || '');
      if (decodedUrl.includes('url supabase.txt')) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      const filePath = resolveStaticPath(request.url || '/');
      if (!filePath) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const data = await fs.readFile(filePath);
      response.writeHead(200, { 'content-type': contentTypeFor(filePath) });
      response.end(data);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      response.writeHead(500);
      response.end('Internal server error');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(4173, '127.0.0.1', resolve);
  });
  server.unref();
  staticServer = server;

  return server;
}

function resolveStaticPath(requestUrl) {
  const parsedUrl = new URL(requestUrl, 'http://127.0.0.1:4173');
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const requestedPath = path.resolve(projectRoot, relativePath);
  const relativeToRoot = path.relative(projectRoot, requestedPath);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) return null;
  return requestedPath;
}

function contentTypeFor(filePath) {
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
  };

  return types[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

export async function openIgoodPage() {
  await ensureIgoodServer();
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load', timeout: 60000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    return { browser, page };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

export async function closeIgoodPage(browser) { await browser.close(); }

export async function stopIgoodTestServer() {
  if (!staticServer) return;
  const server = staticServer;
  staticServer = undefined;
  staticServerPromise = undefined;

  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function seedLocalStorage(page, data) {
  await page.evaluate((payload) => {
    for (const [key, value] of Object.entries(payload)) localStorage.setItem(key, JSON.stringify(value));
  }, data);
}

export async function readLocalStorage(page, key) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '[]'), key);
}

export function assert(condition, message) { if (!condition) throw new Error(message); }

export async function setSalesName(page, selector, name) {
  await page.evaluate(([sel, val]) => {
    const el = document.querySelector(sel);
    if (el) {
      if (el.tagName === 'SELECT') {
        let opt = Array.from(el.options).find(o => o.value === val);
        if (!opt) {
          opt = document.createElement('option');
          opt.value = val;
          opt.textContent = val;
          el.appendChild(opt);
        }
        el.value = val;
      } else {
        el.value = val;
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [selector, name]);
}
