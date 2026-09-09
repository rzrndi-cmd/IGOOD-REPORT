const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impud2RvdWN5andoa3F4cnp0dWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU0NzIsImV4cCI6MjA5NjQ1MTQ3Mn0.mQ5-WX_IFGhi4c_C0cEXFEZnjDO1yDAqvHZOaqGAJ4c';
const base = 'https://jnwdoucyjwhkqxrztubm.supabase.co/rest/v1';
const headers = { 
    apikey: key, 
    Authorization: 'Bearer ' + key 
};

const tables = [
    'igood_transactions',
    'igood_service_orders',
    'igood_preorder_requests',
    'igood_operational_expenses',
    'igood_device_stock',
    'igood_acc_stock',
    'igood_employees',
    'igood_technicians',
    'igood_service_catalog',
    'igood_other_catalog'
];

async function verify() {
    console.log('==============================================');
    console.log('      STATUS JUMLAH DATA TABEL SUPABASE       ');
    console.log('==============================================');
    let allClean = true;
    for (const table of tables) {
        try {
            const res = await fetch(`${base}/${table}?select=*`, { headers });
            if (!res.ok) {
                console.log(`❌ ${table.padEnd(28)} : Gagal (${res.statusText})`);
                allClean = false;
                continue;
            }
            const data = await res.json();
            const count = Array.isArray(data) ? data.length : 0;
            if (count === 0) {
                console.log(`✅ ${table.padEnd(28)} : KOSONG (0 data)`);
            } else {
                console.log(`⚠️ ${table.padEnd(28)} : ADA DATA (${count} baris)`);
                allClean = false;
            }
        } catch (e) {
            console.log(`❌ ${table.padEnd(28)} : Error (${e.message})`);
            allClean = false;
        }
    }
    console.log('==============================================');
    if (allClean) {
        console.log('🎉 SEMUA TABEL SUDAH 100% KOSONG & BERSIH!');
    } else {
        console.log('⚠️ Ada tabel yang belum kosong sepenuhnya.');
    }
    console.log('==============================================');
}

verify();
