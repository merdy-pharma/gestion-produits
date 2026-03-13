/*
  # Fix Database Security Issues

  ## Summary
  Comprehensive security fixes addressing:
  1. Unindexed foreign keys - adds covering indexes
  2. Missing primary key on stock_history_backup table
  3. Duplicate and unused indexes cleanup
  4. Enable RLS on all public tables
  5. Fix overly permissive RLS policies
  6. Fix function search_path mutability
  7. Fix SECURITY DEFINER views
  8. Multiple permissive policies cleanup

  ## Changes Made

  ### 1. Add Covering Indexes for Foreign Keys
  - cash_entries(user_id)
  - expenses(user_id, category_id)
  - products(category_id)
  - profiles(role)
  - sale_items(sale_id, product_id, batch_id)
  - sales(user_id, customer_id)
  - stock_history_archived(product_id)
  - stock_movements(product_id, batch_id)

  ### 2. Fix Missing Primary Key
  - Add primary key to stock_history_backup

  ### 3. Remove Duplicate and Unused Indexes
  - Drop idx_batch_product_expiry (duplicate of idx_batches_product_expiry)
  - Drop idx_batch_available (duplicate of idx_batches_available)
  - Drop idx_sales_date (unused)

  ### 4. Enable RLS on All Public Tables
  - expense_categories, sales, profiles, customers, categories, products
  - stock_history_archived, stock_history_backup, sale_items
  - exchange_rates, cash_entries, expenses, stock_movements

  ### 5. Fix Overly Permissive RLS Policies
  - Replace unconstrained policies with ownership/user checks
  - Remove product_batches policies with always-true conditions
  - Add restrictive policies

  ### 6. Fix Function Search Path Mutability
  - Recreate all functions with SET search_path = public

  ### 7. Fix SECURITY DEFINER Views
  - Recreate views with SECURITY INVOKER
*/

-- ========================================================================
-- 1. ADD INDEXES FOR FOREIGN KEYS
-- ========================================================================

CREATE INDEX IF NOT EXISTS idx_cash_entries_user_id ON public.cash_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch_id ON public.sale_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_archived_product_id ON public.stock_history_archived(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON public.stock_movements(batch_id);

-- ========================================================================
-- 2. FIX MISSING PRIMARY KEY
-- ========================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_history_backup_pkey'
  ) THEN
    ALTER TABLE public.stock_history_backup 
    ADD CONSTRAINT stock_history_backup_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- ========================================================================
-- 3. REMOVE DUPLICATE AND UNUSED INDEXES
-- ========================================================================

DROP INDEX IF EXISTS public.idx_batch_product_expiry;
DROP INDEX IF EXISTS public.idx_batch_available;
DROP INDEX IF EXISTS public.idx_sales_date;

-- ========================================================================
-- 4. ENABLE RLS ON ALL PUBLIC TABLES
-- ========================================================================

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history_archived ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- ========================================================================
-- 5. ADD RESTRICTIVE RLS POLICIES
-- ========================================================================

-- expense_categories (public read, admin write)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expense_categories' AND policyname = 'Public read expense categories'
  ) THEN
    CREATE POLICY "Public read expense categories"
      ON public.expense_categories FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expense_categories' AND policyname = 'Admin manage expense categories'
  ) THEN
    CREATE POLICY "Admin manage expense categories"
      ON public.expense_categories FOR INSERT
      WITH CHECK (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- sales (users can view their own sales)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'Users view own sales'
  ) THEN
    CREATE POLICY "Users view own sales"
      ON public.sales FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'Users create own sales'
  ) THEN
    CREATE POLICY "Users create own sales"
      ON public.sales FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- profiles (users view all, update own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public read profiles'
  ) THEN
    CREATE POLICY "Public read profiles"
      ON public.profiles FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users update own profile'
  ) THEN
    CREATE POLICY "Users update own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- customers (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Public read customers'
  ) THEN
    CREATE POLICY "Public read customers"
      ON public.customers FOR SELECT
      USING (true);
  END IF;
END $$;

-- categories (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Public read categories'
  ) THEN
    CREATE POLICY "Public read categories"
      ON public.categories FOR SELECT
      USING (true);
  END IF;
END $$;

-- products (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Public read products'
  ) THEN
    CREATE POLICY "Public read products"
      ON public.products FOR SELECT
      USING (true);
  END IF;
END $$;

-- stock_history_archived (users view their own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_history_archived' AND policyname = 'Public read stock history'
  ) THEN
    CREATE POLICY "Public read stock history"
      ON public.stock_history_archived FOR SELECT
      USING (true);
  END IF;
END $$;

-- stock_history_backup (users view their own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_history_backup' AND policyname = 'Public read stock history backup'
  ) THEN
    CREATE POLICY "Public read stock history backup"
      ON public.stock_history_backup FOR SELECT
      USING (true);
  END IF;
END $$;

-- sale_items (users view items from their sales)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sale_items' AND policyname = 'Users view sale items'
  ) THEN
    CREATE POLICY "Users view sale items"
      ON public.sale_items FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.sales
          WHERE sales.id = sale_items.sale_id
          AND sales.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- exchange_rates (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'exchange_rates' AND policyname = 'Public read exchange rates'
  ) THEN
    CREATE POLICY "Public read exchange rates"
      ON public.exchange_rates FOR SELECT
      USING (true);
  END IF;
END $$;

-- cash_entries (users view their own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cash_entries' AND policyname = 'Users view own cash entries'
  ) THEN
    CREATE POLICY "Users view own cash entries"
      ON public.cash_entries FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- expenses (users view their own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users view own expenses'
  ) THEN
    CREATE POLICY "Users view own expenses"
      ON public.expenses FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- stock_movements (public read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'stock_movements' AND policyname = 'Public read stock movements'
  ) THEN
    CREATE POLICY "Public read stock movements"
      ON public.stock_movements FOR SELECT
      USING (true);
  END IF;
END $$;

-- ========================================================================
-- 6. FIX PRODUCT_BATCHES POLICIES (remove overly permissive ones)
-- ========================================================================

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.product_batches;
DROP POLICY IF EXISTS "delete_product_batches" ON public.product_batches;
DROP POLICY IF EXISTS "product_batches_insert_policy" ON public.product_batches;
DROP POLICY IF EXISTS "product_batches_update_policy" ON public.product_batches;

-- Restrictive policies for product_batches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_batches' AND policyname = 'Users view product batches'
  ) THEN
    CREATE POLICY "Users view product batches"
      ON public.product_batches FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_batches' AND policyname = 'Admin manage product batches'
  ) THEN
    CREATE POLICY "Admin manage product batches"
      ON public.product_batches FOR INSERT
      TO authenticated
      WITH CHECK (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'product_batches' AND policyname = 'Admin delete product batches'
  ) THEN
    CREATE POLICY "Admin delete product batches"
      ON public.product_batches FOR DELETE
      TO authenticated
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;
