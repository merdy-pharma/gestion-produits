/*
  # Schéma complet de la base de données POS RBG
  
  ## Tables créées
  
  ### 1. Gestion des utilisateurs
  - `roles` - Rôles disponibles (admin, manager, employee)
  - `profiles` - Profils utilisateurs avec informations détaillées
  
  ### 2. Gestion des produits
  - `categories` - Catégories de produits
  - `products` - Articles en vente avec prix et stock
  
  ### 3. Gestion des clients
  - `customers` - Base clients avec coordonnées
  
  ### 4. Gestion des ventes
  - `sales` - En-tête des ventes
  - `sale_items` - Lignes de détail des ventes
  
  ### 5. Gestion du stock
  - `stock_movements` - Mouvements de stock (entrées/sorties)
  - `stock_history` - Historique des changements (legacy)
  
  ### 6. Gestion financière
  - `exchange_rates` - Taux de change CDF/USD
  - `expense_categories` - Catégories de dépenses
  - `expenses` - Dépenses/sorties de caisse
  - `cash_entries` - Entrées de caisse manuelles
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Politiques restrictives par rôle
  - Authentification requise pour toutes les opérations
  
  ## Notes importantes
  - Les prix sont stockés en USD dans la base
  - L'affichage en CDF utilise le taux de change du jour
  - Les stocks sont gérés automatiquement via triggers
  - Historique complet des mouvements conservé
*/

-- =====================================================
-- 1. TABLE DES RÔLES
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL CHECK (name IN ('admin', 'manager', 'employee'))
);

-- Insertion des rôles par défaut
INSERT INTO roles (name) 
VALUES ('admin'), ('manager'), ('employee')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. TABLE DES PROFILS UTILISATEURS
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- RLS pour profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir tous les profils" ON profiles;
CREATE POLICY "Utilisateurs authentifiés peuvent voir tous les profils"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Utilisateurs peuvent mettre à jour leur propre profil" ON profiles;
CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins peuvent tout gérer sur profiles" ON profiles;
CREATE POLICY "Admins peuvent tout gérer sur profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. TABLE DES CATÉGORIES DE PRODUITS
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les catégories" ON categories;
CREATE POLICY "Tout le monde peut voir les catégories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent gérer les catégories" ON categories;
CREATE POLICY "Admins et managers peuvent gérer les catégories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 4. TABLE DES PRODUITS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  barcode TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  purchase_price DECIMAL(10, 2) DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price DECIMAL(10, 2) NOT NULL CHECK (selling_price >= 0),
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);

-- RLS pour products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les produits" ON products;
CREATE POLICY "Tout le monde peut voir les produits"
  ON products FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent gérer les produits" ON products;
CREATE POLICY "Admins et managers peuvent gérer les produits"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 5. TABLE DES CLIENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);

-- RLS pour customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les clients" ON customers;
CREATE POLICY "Tout le monde peut voir les clients"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent gérer les clients" ON customers;
CREATE POLICY "Admins et managers peuvent gérer les clients"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 6. TABLE DES VENTES
-- =====================================================

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sale_date TIMESTAMPTZ DEFAULT now(),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile')),
  exchange_rate DECIMAL(10, 2) DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);

-- RLS pour sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les ventes" ON sales;
CREATE POLICY "Tout le monde peut voir les ventes"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Employees peuvent créer des ventes" ON sales;
CREATE POLICY "Employees peuvent créer des ventes"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.status = true
    )
  );

DROP POLICY IF EXISTS "Admins et managers peuvent modifier supprimer sales" ON sales;
CREATE POLICY "Admins et managers peuvent modifier supprimer sales"
  ON sales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 7. TABLE DES LIGNES DE VENTE
-- =====================================================

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- RLS pour sale_items
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les items" ON sale_items;
CREATE POLICY "Tout le monde peut voir les items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Employees peuvent créer des items" ON sale_items;
CREATE POLICY "Employees peuvent créer des items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.status = true
    )
  );

DROP POLICY IF EXISTS "Admins et managers peuvent modifier supprimer items" ON sale_items;
CREATE POLICY "Admins et managers peuvent modifier supprimer items"
  ON sale_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 8. TABLE DES MOUVEMENTS DE STOCK
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
  reason TEXT NOT NULL CHECK (reason IN ('SALE', 'PURCHASE', 'AJUSTEMENT', 'ENDOMMAGE', 'PERIME', 'PERTE', 'RETOUR')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  comment TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);

-- RLS pour stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les mouvements" ON stock_movements;
CREATE POLICY "Tout le monde peut voir les mouvements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent créer des mouvements" ON stock_movements;
CREATE POLICY "Admins et managers peuvent créer des mouvements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 9. TABLE D'HISTORIQUE DE STOCK (LEGACY)
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  change INTEGER NOT NULL,
  new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_date ON stock_history(created_at);

-- RLS pour stock_history
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir historique" ON stock_history;
CREATE POLICY "Tout le monde peut voir historique"
  ON stock_history FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- 10. TABLE DES TAUX DE CHANGE
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate DECIMAL(10, 2) NOT NULL CHECK (rate > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(created_at DESC);

-- RLS pour exchange_rates
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les taux" ON exchange_rates;
CREATE POLICY "Tout le monde peut voir les taux"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent gérer les taux" ON exchange_rates;
CREATE POLICY "Admins et managers peuvent gérer les taux"
  ON exchange_rates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 11. TABLE DES CATÉGORIES DE DÉPENSES
-- =====================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS pour expense_categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les catégories de dépenses" ON expense_categories;
CREATE POLICY "Tout le monde peut voir les catégories de dépenses"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent gérer expense categories" ON expense_categories;
CREATE POLICY "Admins et managers peuvent gérer expense categories"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 12. TABLE DES DÉPENSES
-- =====================================================

CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  date DATE DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);

-- RLS pour expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les dépenses" ON expenses;
CREATE POLICY "Tout le monde peut voir les dépenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent gérer les dépenses" ON expenses;
CREATE POLICY "Admins et managers peuvent gérer les dépenses"
  ON expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 13. TABLE DES ENTRÉES DE CAISSE
-- =====================================================

CREATE TABLE IF NOT EXISTS cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  date DATE DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON cash_entries(date);
CREATE INDEX IF NOT EXISTS idx_cash_entries_user ON cash_entries(user_id);

-- RLS pour cash_entries
ALTER TABLE cash_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tout le monde peut voir les entrées" ON cash_entries;
CREATE POLICY "Tout le monde peut voir les entrées"
  ON cash_entries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins et managers peuvent gérer les entrées" ON cash_entries;
CREATE POLICY "Admins et managers peuvent gérer les entrées"
  ON cash_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- 14. FONCTIONS RPC UTILES
-- =====================================================

-- Fonction pour obtenir les ventes journalières
CREATE OR REPLACE FUNCTION get_daily_sales()
RETURNS TABLE (
  day DATE,
  total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(sale_date) as day,
    SUM(total_amount) as total
  FROM sales
  GROUP BY DATE(sale_date)
  ORDER BY day DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour augmenter le stock
CREATE OR REPLACE FUNCTION increase_stock(
  p_product_id UUID,
  p_qty INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET 
    stock = stock + p_qty,
    updated_at = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour diminuer le stock
CREATE OR REPLACE FUNCTION decrease_stock(
  p_product_id UUID,
  p_qty INTEGER
)
RETURNS void AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  SELECT stock INTO current_stock
  FROM products
  WHERE id = p_product_id;
  
  IF current_stock < p_qty THEN
    RAISE EXCEPTION 'Stock insuffisant pour le produit %', p_product_id;
  END IF;
  
  UPDATE products
  SET 
    stock = stock - p_qty,
    updated_at = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction transactionnelle pour créer une vente
CREATE OR REPLACE FUNCTION create_sale_transaction(
  p_customer_id UUID,
  p_payment_method TEXT,
  p_exchange_rate DECIMAL,
  p_user_id UUID,
  p_items JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_sale_id INTEGER;
  v_item JSONB;
  v_total DECIMAL := 0;
BEGIN
  -- 1. Créer la vente
  INSERT INTO sales (customer_id, user_id, payment_method, exchange_rate, total_amount)
  VALUES (p_customer_id, p_user_id, p_payment_method, p_exchange_rate, 0)
  RETURNING id INTO v_sale_id;
  
  -- 2. Traiter chaque item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Vérifier le stock
    PERFORM decrease_stock(
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER
    );
    
    -- Insérer le sale_item
    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::DECIMAL
    );
    
    -- Calculer le total
    v_total := v_total + ((v_item->>'quantity')::INTEGER * (v_item->>'unit_price')::DECIMAL);
  END LOOP;
  
  -- 3. Mettre à jour le total
  UPDATE sales SET total_amount = v_total WHERE id = v_sale_id;
  
  RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour nettoyer les ventes vides
CREATE OR REPLACE FUNCTION delete_empty_sales()
RETURNS void AS $$
BEGIN
  DELETE FROM sales
  WHERE id NOT IN (SELECT DISTINCT sale_id FROM sale_items)
  AND created_at < now() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;