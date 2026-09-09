const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impud2RvdWN5andoa3F4cnp0dWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU0NzIsImV4cCI6MjA5NjQ1MTQ3Mn0.mQ5-WX_IFGhi4c_C0cEXFEZnjDO1yDAqvHZOaqGAJ4c';
const base = 'https://jnwdoucyjwhkqxrztubm.supabase.co/rest/v1';
const headers = { 
    apikey: key, 
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json'
};

const tables = {
    'igood_transactions': 'id',
    'igood_service_orders': 'code',
    'igood_preorder_requests': 'code',
    'igood_operational_expenses': 'id',
    'igood_device_stock': 'code',
    'igood_acc_stock': 'code',
    'igood_employees': 'id',
    'igood_technicians': 'name',
    'igood_service_catalog': 'code',
    'igood_other_catalog': 'code'
};

async function clearTable(tableName, idCol) {
    try {
        process.stdout.write(`Mengecek tabel [${tableName}]... `);
        const res = await fetch(`${base}/${tableName}?select=${idCol}`, { headers });
        if (!res.ok) {
            console.log(`❌ Gagal membaca: ${res.statusText}`);
            return;
        }
        const rows = await res.json();
        if (!rows || rows.length === 0) {
            console.log(`✅ Sudah kosong (0 data).`);
            return;
        }
        console.log(`🗑️ Menghapus ${rows.length} data...`);
        let deleted = 0;
        for (const row of rows) {
            const idVal = row[idCol];
            if (idVal == null) continue;
            const delRes = await fetch(`${base}/${tableName}?${idCol}=eq.${encodeURIComponent(idVal)}`, { 
                method: 'DELETE', 
                headers 
            });
            if (delRes.ok) deleted++;
        }
        console.log(`   └─ Sukses menghapus ${deleted}/${rows.length} data.`);
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
}

async function run() {
    console.log('==============================================');
    console.log('   MEMULAI RESET DATABASE SUPABASE (CLEAN)   ');
    console.log('==============================================');
    for (const [table, idCol] of Object.entries(tables)) {
        await clearTable(table, idCol);
    }
    console.log('==============================================');
    console.log('   RESET DATABASE SUPABASE SELESAI           ');
    console.log('==============================================');
}

run();
