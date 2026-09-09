const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

const os = require('os');

// Serve static files from the current directory
app.use(express.static(__dirname));

// Fallback to index.html for any other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (let name of Object.keys(interfaces)) {
        for (let iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(`${name}: http://${iface.address}:${PORT}`);
            }
        }
    }

    console.log(`Server is running!`);
    console.log(`- Local (Laptop): http://localhost:${PORT}`);
    
    console.log(`\nCoba akses salah satu alamat Network berikut dari HP Anda:`);
    if (addresses.length > 0) {
        addresses.forEach(addr => console.log(`  -> ${addr}`));
    } else {
        console.log(`  (Tidak ada IP Network terdeteksi)`);
    }

    console.log(`\nPress Ctrl+C to stop the server`);
});
