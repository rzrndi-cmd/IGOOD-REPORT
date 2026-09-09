import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const files = [
    'js/utils.js',
    'js/storage.js',
    'js/receipt.js',
    'js/supabase.js',
    'js/sales.js',
    'js/service.js',
    'js/daily-report.js',
    'js/admin.js',
    'app.js'
];

async function scan() {
    const declared = new Map();
    
    for (const file of files) {
        const fullPath = path.join(rootDir, file);
        const code = await fs.readFile(fullPath, 'utf8');
        const lines = code.split('\n');
        
        lines.forEach((l, idx) => {
            const match = l.match(/^\s*(let|const|var)\s+([a-zA-Z0-9_$]+)\s*=/);
            if (match) {
                const kind = match[1];
                const name = match[2];
                if (!declared.has(name)) {
                    declared.set(name, []);
                }
                declared.get(name).push({ file, line: idx + 1, kind });
            }
        });
    }
    
    console.log('Duplicate declarations across files:');
    let hasDups = false;
    for (const [name, occurrences] of declared.entries()) {
        if (occurrences.length > 1) {
            hasDups = true;
            console.log(`Variable "${name}":`, occurrences.map(o => `${o.file}:${o.line} (${o.kind})`).join(', '));
        }
    }
    if (!hasDups) console.log('No duplicates found!');
}

scan();
