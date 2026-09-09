const SUPABASE_URL = 'https://jnwdoucyjwhkqxrztubm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impud2RvdWN5andoa3F4cnp0dWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU0NzIsImV4cCI6MjA5NjQ1MTQ3Mn0.mQ5-WX_IFGhi4c_C0cEXFEZnjDO1yDAqvHZOaqGAJ4c';

async function main() {
  const url = SUPABASE_URL + '/rest/v1/igood_transactions?select=*&order=created_at.desc';
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY
    }
  });
  const txs = await res.json();
  console.log('TOTAL TRANSAKSI DI SUPABASE:', txs.length);
  txs.forEach((t, idx) => {
    console.log('#' + (idx + 1) + ': ID=' + t.id + ' | Date=' + t.date + ' | Shift=' + t.shift + ' | Item=' + t.item_name + ' | Sell=' + t.sell);
  });
}
main().catch(console.error);
