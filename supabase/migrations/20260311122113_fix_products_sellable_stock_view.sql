/*
  # Fix products_sellable_stock View

  1. Drop and recreate the view
    - Removes old view definition if exists
    - Creates proper view for sales interface with correct columns

  2. View columns
    - id: Product UUID
    - name: Product name
    - selling_price: Price in USD
    - sellable_stock: Available quantity
    - barcode: Product barcode
    - category_id: Category reference
    - purchase_price: Cost price
    - image_url: Product image

  3. Purpose
    - Products with stock > 0 for sales operations
*/

DROP VIEW IF EXISTS products_sellable_stock CASCADE;

CREATE VIEW products_sellable_stock AS
SELECT 
  p.id,
  p.name,
  p.selling_price,
  p.stock::integer AS sellable_stock,
  p.barcode,
  p.category_id,
  p.purchase_price,
  p.image_url
FROM products p
WHERE p.stock > 0
ORDER BY p.name;
