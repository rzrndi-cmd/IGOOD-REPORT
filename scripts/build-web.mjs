import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const destDir = path.join(rootDir, 'dist_web');

const filesToCopy = [
    'index.html',
    'app.js',
    'style.css',
    'logo.png',
    'jspdf.umd.min.js',
    'jspdf.plugin.autotable.min.js',
    'url supabase.txt',
    '_redirects',
    'vercel.json'
];

async function buildWeb() {
    await fs.mkdir(destDir, { recursive: true });
    for (const file of filesToCopy) {
        const src = path.join(rootDir, file);
        const dest = path.join(destDir, file);
        try {
            await fs.copyFile(src, dest);
            console.log(`Copied ${file} to dist_web/`);
        } catch (err) {
            console.error(`Error copying ${file}:`, err.message);
        }
    }

    const srcJs = path.join(rootDir, 'js');
    const destJs = path.join(destDir, 'js');
    try {
        await fs.mkdir(destJs, { recursive: true });
        const jsFiles = await fs.readdir(srcJs);
        for (const f of jsFiles) {
            await fs.copyFile(path.join(srcJs, f), path.join(destJs, f));
            console.log(`Copied js/${f} to dist_web/js/`);
        }
    } catch (err) {
        console.error('Error copying js directory to dist_web:', err.message);
    }

    console.log('Build web ready in dist_web/ folder!');
}

buildWeb();
