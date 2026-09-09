-- =========================================================
-- IGOOD REPORT: RESET SELURUH DATABASE UNTUK PRODUCTION REAL
-- Jalankan query ini di Supabase Dashboard -> SQL Editor
-- =========================================================

TRUNCATE TABLE 
  public.igood_transactions,
  public.igood_service_orders,
  public.igood_preorder_requests,
  public.igood_operational_expenses,
  public.igood_device_stock,
  public.igood_acc_stock,
  public.igood_employees,
  public.igood_technicians,
  public.igood_service_catalog,
  public.igood_other_catalog
RESTART IDENTITY CASCADE;

-- Verifikasi hasil penghapusan (semua harus bernilai 0):
SELECT 'igood_transactions' AS table_name, count(*) AS total_rows FROM public.igood_transactions
UNION ALL
SELECT 'igood_service_orders', count(*) FROM public.igood_service_orders
UNION ALL
SELECT 'igood_preorder_requests', count(*) FROM public.igood_preorder_requests
UNION ALL
SELECT 'igood_operational_expenses', count(*) FROM public.igood_operational_expenses
UNION ALL
SELECT 'igood_device_stock', count(*) FROM public.igood_device_stock
UNION ALL
SELECT 'igood_acc_stock', count(*) FROM public.igood_acc_stock
UNION ALL
SELECT 'igood_employees', count(*) FROM public.igood_employees
UNION ALL
SELECT 'igood_technicians', count(*) FROM public.igood_technicians
UNION ALL
SELECT 'igood_service_catalog', count(*) FROM public.igood_service_catalog
UNION ALL
SELECT 'igood_other_catalog', count(*) FROM public.igood_other_catalog;
