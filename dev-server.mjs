import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
    '.apk': 'application/vnd.android.package-archive',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    '.agent',
    '.agents',
    '.claude',
    '.gemini',
    '.idea',
    '.gradle',
    'build',
    '.kotlin',
    '.kiro',
    '.codex',
    'dist_web',
    'test-results'
]);

// Active SSE client connections
const sseClients = new Set();

const HOT_CLIENT_SCRIPT = `
<!-- [HOT RELOAD DEV CLIENT] -->
<script>
(function() {
    let reconnectAttempts = 0;
    function connect() {
        const es = new EventSource('/___hot_reload_sse');
        
        es.onopen = function() {
            reconnectAttempts = 0;
            console.log('%c[HOT RELOAD] %cConnected to Dev Server', 'color:#0ea5e9;font-weight:bold;', 'color:#10b981;');
        };
        
        es.addEventListener('reload', function(e) {
            const data = JSON.parse(e.data || '{}');
            console.log('%c[HOT RELOAD] %cFile changed: ' + (data.file || 'unknown') + ', reloading...', 'color:#f59e0b;font-weight:bold;', 'color:#64748b;');
            window.location.reload();
        });

        es.addEventListener('reload-css', function(e) {
            const data = JSON.parse(e.data || '{}');
            console.log('%c[HOT RELOAD] %cCSS updated: ' + (data.file || 'style.css'), 'color:#06b6d4;font-weight:bold;', 'color:#64748b;');
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            links.forEach(function(link) {
                const href = link.getAttribute('href');
                if (href) {
                    const url = new URL(href, window.location.href);
                    url.searchParams.set('_hot_t', Date.now());
                    link.setAttribute('href', url.pathname + url.search);
                }
            });
        });

        es.onerror = function() {
            es.close();
            reconnectAttempts++;
            const timeout = Math.min(1000 * reconnectAttempts, 5000);
            setTimeout(connect, timeout);
        };
    }
    connect();
})();
</script>
`;

function notifyClients(type, payload) {
    const data = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of sseClients) {
        try {
            client.write(data);
        } catch {
            sseClients.delete(client);
        }
    }
}

// Watch project directory recursively
let debounceTimer = null;
let pendingChanges = new Set();

function setupFileWatcher() {
    try {
        fs.watch(ROOT_DIR, { recursive: true }, (eventType, filename) => {
            if (!filename) return;

            // Normalize slashes
            const normalized = filename.replace(/\\\\/g, '/');
            const parts = normalized.split('/');

            // Ignore system / internal directories
            if (parts.some(part => IGNORED_DIRS.has(part))) return;
            if (normalized.endsWith('.log') || normalized.endsWith('.tmp') || normalized.includes('~')) return;

            const ext = path.extname(filename).toLowerCase();
            if (!['.html', '.css', '.js', '.mjs', '.json', '.svg', '.png', '.jpg', '.jpeg'].includes(ext)) return;

            pendingChanges.add(normalized);

            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const changedFiles = Array.from(pendingChanges);
                pendingChanges.clear();

                const hasOnlyCss = changedFiles.every(f => f.endsWith('.css'));
                const primaryFile = changedFiles[0];

                if (hasOnlyCss) {
                    console.log(`⚡ [HOT CSS] ${changedFiles.join(', ')}`);
                    notifyClients('reload-css', { file: primaryFile, files: changedFiles });
                } else {
                    console.log(`🔥 [HOT RELOAD] ${changedFiles.join(', ')}`);
                    notifyClients('reload', { file: primaryFile, files: changedFiles });
                }
            }, 100);
        });
        console.log('👀 File watcher active for auto-reload.');
    } catch (err) {
        console.warn('⚠️ File watcher notice:', err.message);
    }
}

const server = http.createServer((req, res) => {
    // SSE endpoint for live reload
    if (req.url === '/___hot_reload_sse') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write('retry: 2000\n\n');
        sseClients.add(res);

        req.on('close', () => {
            sseClients.delete(res);
        });
        return;
    }

    // Standard static file serving
    const rawUrl = req.url.split('?')[0];
    const decodedUrl = decodeURIComponent(rawUrl);
    let targetPath = path.join(ROOT_DIR, decodedUrl === '/' ? 'index.html' : decodedUrl);

    // Prevent directory traversal
    if (!targetPath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    // If target is directory, serve index.html inside it
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        targetPath = path.join(targetPath, 'index.html');
    }

    // Check if file exists, else fallback to index.html for SPA routes
    let fileToRead = targetPath;
    let isHtml = false;

    if (!fs.existsSync(fileToRead)) {
        fileToRead = path.join(ROOT_DIR, 'index.html');
        isHtml = true;
    } else {
        isHtml = path.extname(fileToRead).toLowerCase() === '.html';
    }

    const ext = path.extname(fileToRead).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Disallow caching in dev mode so updates reflect immediately
    const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    };

    if (isHtml) {
        fs.readFile(fileToRead, 'utf8', (err, htmlContent) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Internal Server Error: ${err.message}`);
                return;
            }

            // Inject hot reload client script before </body> or at end
            let modifiedHtml = htmlContent;
            if (modifiedHtml.includes('</body>')) {
                modifiedHtml = modifiedHtml.replace('</body>', `${HOT_CLIENT_SCRIPT}\n</body>`);
            } else if (modifiedHtml.includes('</html>')) {
                modifiedHtml = modifiedHtml.replace('</html>', `${HOT_CLIENT_SCRIPT}\n</html>`);
            } else {
                modifiedHtml += HOT_CLIENT_SCRIPT;
            }

            res.writeHead(200, headers);
            res.end(modifiedHtml, 'utf8');
        });
    } else {
        fs.readFile(fileToRead, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }
            res.writeHead(200, headers);
            res.end(data);
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    const networkAddresses = [];

    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                networkAddresses.push({ name, url: `http://${iface.address}:${PORT}` });
            }
        }
    }

    console.clear();
    console.log(`\n========================================================`);
    console.log(`  🔥 IGOOD REPORT - LOCAL DEV SERVER WITH HOT RELOAD 🔥  `);
    console.log(`========================================================\n`);
    console.log(`  📍 Local Laptop : http://localhost:${PORT}`);
    console.log(`  📄 Demo Tabs    : http://localhost:${PORT}/demo-tabs.html`);
    
    if (networkAddresses.length > 0) {
        console.log(`\n  📱 Akses dari HP / Perangkat lain (Wi-Fi sama):`);
        networkAddresses.forEach(({ name, url }) => {
            console.log(`     -> [${name}] ${url}`);
        });
    }
    console.log(`\n  ⚡ Status       : Hot Reload & Auto Refresh AKTIF`);
    console.log(`  💡 Simpan file (Ctrl+S) -> Browser otomatis update!`);
    console.log(`  🛑 Tekan Ctrl+C untuk menghentikan server.\n`);
    console.log(`--------------------------------------------------------\n`);

    setupFileWatcher();
});
