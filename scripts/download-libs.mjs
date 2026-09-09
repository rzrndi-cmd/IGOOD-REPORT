import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const libs = [
    {
        url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        filename: 'jspdf.umd.min.js'
    },
    {
        url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
        filename: 'jspdf.plugin.autotable.min.js'
    }
];

async function download() {
    for (const lib of libs) {
        const dest = path.join(rootDir, lib.filename);
        console.log(`Downloading ${lib.url} to ${dest}...`);
        try {
            const res = await fetch(lib.url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const text = await res.text();
            fs.writeFileSync(dest, text, 'utf-8');
            console.log(`Downloaded ${lib.filename} successfully.`);
        } catch (err) {
            console.error(`Failed to download ${lib.filename}:`, err.message);
        }
    }
}

download();
