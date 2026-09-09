import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const PUBLIC_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
    // URL decoding to handle spaces/special characters
    const decodedUrl = decodeURIComponent(req.url);
    let filePath = path.join(PUBLIC_DIR, decodedUrl === '/' ? 'demo-tabs.html' : decodedUrl);
    
    // Prevent directory traversal attacks
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}/\n`);
    console.log(`Silakan buka di browser Anda: http://localhost:${PORT}/demo-tabs.html`);
    console.log(`Atau buka aplikasi utama di: http://localhost:${PORT}/index.html\n`);
    console.log(`Tekan Ctrl+C untuk menghentikan server.`);
});
