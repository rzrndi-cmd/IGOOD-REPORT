import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const destDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');

const filesToCopy = ['index.html', 'app.js', 'style.css', 'logo.png', 'jspdf.umd.min.js', 'jspdf.plugin.autotable.min.js', 'url supabase.txt'];

async function copyAssets() {
    console.log('Copying assets from root to android/app/src/main/assets/public/...');
    await fs.mkdir(destDir, { recursive: true });
    for (const file of filesToCopy) {
        const src = path.join(rootDir, file);
        const dest = path.join(destDir, file);
        try {
            if (await fs.stat(src).catch(() => null)) {
                await fs.copyFile(src, dest);
                console.log(`Copied ${file} successfully.`);
            }
        } catch (err) {
            console.error(`Error copying ${file}:`, err.message);
        }
    }

    // Copy js/ directory if exists
    const srcJs = path.join(rootDir, 'js');
    const destJs = path.join(destDir, 'js');
    try {
        if (await fs.stat(srcJs).catch(() => null)) {
            await fs.mkdir(destJs, { recursive: true });
            const jsFiles = await fs.readdir(srcJs);
            for (const f of jsFiles) {
                await fs.copyFile(path.join(srcJs, f), path.join(destJs, f));
                console.log(`Copied js/${f} successfully.`);
            }
        }
    } catch (err) {
        console.error('Error copying js directory:', err.message);
    }

    console.log('Done! Assets are ready for Android build.');
}

copyAssets();
