# Structure de la Base de Données - POS RBG

## Vue d'ensemble

Cette base de données supporte un système de point de vente (POS) complet avec gestion des stocks, des ventes, des clients, et de la comptabilité.

## Architecture

### Principes de conception
- **Devise de référence** : USD (stockage)
- **Conversion dynamique** : CDF (affichage via taux de change)
- **Sécurité** : RLS activé sur toutes les tables
- **Traçabilité** : Historique complet des mouvements
- **Intégrité** : Contraintes et validations strictes

---

## Tables Principales

### 1. Gestion des utilisateurs

#### `roles`
Rôles disponibles dans l'application.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant unique |
| name | TEXT | Nom du rôle (admin/manager/employee) |

**Valeurs possibles** : 'admin', 'manager', 'employee'

---

#### `profiles`
Profils utilisateurs étendus liés à auth.users.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Référence à auth.users(id) |
| name | TEXT | Nom complet de l'utilisateur |
| phone | TEXT | Numéro de téléphone |
| avatar | TEXT | URL de l'avatar |
| role | TEXT | Rôle (admin/manager/employee) |
| status | BOOLEAN | Compte actif ou non |
| created_at | TIMESTAMPTZ | Date de création |
| updated_at | TIMESTAMPTZ | Dernière mise à jour |

**Relations** :
- `id` → `auth.users(id)` (CASCADE)

**Politiques RLS** :
- ✅ Tous peuvent lire tous les profils
- ✅ Chacun peut modifier son propre profil
- ✅ Admins peuvent tout gérer

---

### 2. Gestion des produits

#### `categories`
Catégories de produits.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| name | TEXT | Nom de la catégorie (unique) |
| created_at | TIMESTAMPTZ | Date de création |

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent gérer

---

#### `products`
Articles en vente.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| name | TEXT | Nom du produit (unique) |
| barcode | TEXT | Code-barres |
| category_id | UUID | Catégorie du produit |
| purchase_price | DECIMAL(10,2) | Prix d'achat en USD |
| selling_price | DECIMAL(10,2) | Prix de vente en USD |
| stock | INTEGER | Quantité en stock |
| image_url | TEXT | URL de l'image produit |
| created_at | TIMESTAMPTZ | Date de création |
| updated_at | TIMESTAMPTZ | Dernière mise à jour |

**Relations** :
- `category_id` → `categories(id)` (SET NULL)

**Contraintes** :
- `purchase_price` >= 0
- `selling_price` >= 0
- `stock` >= 0

**Index** :
- name, barcode, category_id, stock

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent gérer

---

### 3. Gestion des clients

#### `customers`
Base de données clients.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| full_name | TEXT | Nom complet |
| phone | TEXT | Téléphone |
| email | TEXT | Email |
| address | TEXT | Adresse |
| created_at | TIMESTAMPTZ | Date de création |

**Index** :
- phone, email, full_name

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent gérer

---

### 4. Gestion des ventes

#### `sales`
En-tête des ventes (factures).

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Numéro de vente |
| customer_id | UUID | Client concerné |
| user_id | UUID | Vendeur/Caissier |
| sale_date | TIMESTAMPTZ | Date/heure de la vente |
| total_amount | DECIMAL(10,2) | Montant total en USD |
| payment_method | TEXT | Mode de paiement |
| exchange_rate | DECIMAL(10,2) | Taux CDF/USD du jour |
| created_at | TIMESTAMPTZ | Date de création |

**Relations** :
- `customer_id` → `customers(id)` (SET NULL)
- `user_id` → `profiles(id)` (SET NULL)

**Contraintes** :
- `payment_method` IN ('cash', 'card', 'mobile')
- `total_amount` >= 0

**Index** :
- sale_date, customer_id, user_id

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Employees peuvent créer
- ✅ Admin/Manager peuvent tout gérer

---

#### `sale_items`
Lignes de détail des ventes.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| sale_id | INTEGER | Vente parente |
| product_id | UUID | Produit vendu |
| quantity | INTEGER | Quantité vendue |
| unit_price | DECIMAL(10,2) | Prix unitaire en USD |
| created_at | TIMESTAMPTZ | Date de création |

**Relations** :
- `sale_id` → `sales(id)` (CASCADE)
- `product_id` → `products(id)` (RESTRICT)

**Contraintes** :
- `quantity` > 0
- `unit_price` >= 0

**Index** :
- sale_id, product_id

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Employees peuvent créer
- ✅ Admin/Manager peuvent tout gérer

---

### 5. Gestion du stock

#### `stock_movements`
Mouvements de stock (entrées/sorties).

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| product_id | UUID | Produit concerné |
| type | TEXT | Type de mouvement (IN/OUT) |
| reason | TEXT | Raison du mouvement |
| quantity | INTEGER | Quantité déplacée |
| comment | TEXT | Commentaire optionnel |
| user_id | UUID | Utilisateur ayant créé |
| created_at | TIMESTAMPTZ | Date de création |

**Relations** :
- `product_id` → `products(id)` (CASCADE)
- `user_id` → `profiles(id)` (SET NULL)

**Contraintes** :
- `type` IN ('IN', 'OUT')
- `reason` IN ('SALE', 'PURCHASE', 'AJUSTEMENT', 'ENDOMMAGE', 'PERIME', 'PERTE', 'RETOUR')
- `quantity` > 0

**Index** :
- product_id, created_at, type

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent créer

---

#### `stock_history`
Historique legacy des changements de stock.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| product_id | UUID | Produit concerné |
| change | INTEGER | Variation (+/-) |
| new_stock | INTEGER | Nouveau stock après |
| reason | TEXT | Raison |
| created_at | TIMESTAMPTZ | Date de création |

**Relations** :
- `product_id` → `products(id)` (CASCADE)

**Politiques RLS** :
- ✅ Tous peuvent lire (lecture seule)

---

### 6. Gestion financière

#### `exchange_rates`
Historique des taux de change CDF/USD.

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| rate | DECIMAL(10,2) | Taux CDF pour 1 USD |
| created_at | TIMESTAMPTZ | Date d'enregistrement |

**Contraintes** :
- `rate` > 0

**Index** :
- created_at (DESC)

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent gérer

---

#### `expense_categories`
Catégories de dépenses.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant unique |
| name | TEXT | Nom de la catégorie (unique) |
| created_at | TIMESTAMPTZ | Date de création |

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent gérer

---

#### `expenses`
Dépenses et sorties de caisse.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | Identifiant unique |
| category_id | INTEGER | Catégorie de dépense |
| description | TEXT | Description |
| amount | DECIMAL(10,2) | Montant en USD |
| date | DATE | Date de la dépense |
| user_id | UUID | Utilisateur ayant créé |
| created_at | TIMESTAMPTZ | Date de création |

**Relations** :
- `category_id` → `expense_categories(id)` (SET NULL)
- `user_id` → `profiles(id)` (SET NULL)

**Contraintes** :
- `amount` > 0

**Index** :
- date, category_id, user_id

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent gérer

---

#### `cash_entries`
Entrées manuelles de caisse (approvisionnements).

| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID | Identifiant unique |
| description | TEXT | Description |
| amount | DECIMAL(10,2) | Montant en USD |
| date | DATE | Date de l'entrée |
| user_id | UUID | Utilisateur ayant créé |
| created_at | TIMESTAMPTZ | Date de création |

**Relations** :
- `user_id` → `profiles(id)` (SET NULL)

**Contraintes** :
- `amount` > 0

**Index** :
- date, user_id

**Politiques RLS** :
- ✅ Tous peuvent lire
- ✅ Admin/Manager peuvent gérer

---

## Fonctions RPC

### `get_daily_sales()`
Retourne les ventes groupées par jour.

**Retour** :
- `day` : DATE
- `total` : DECIMAL

**Usage** :
```sql
SELECT * FROM get_daily_sales();
```

---

### `increase_stock(p_product_id UUID, p_qty INTEGER)`
Augmente le stock d'un produit.

**Paramètres** :
- `p_product_id` : ID du produit
- `p_qty` : Quantité à ajouter

**Usage** :
```sql
SELECT increase_stock('uuid-here', 10);
```

---

### `decrease_stock(p_product_id UUID, p_qty INTEGER)`
Diminue le stock d'un produit (avec vérification).

**Paramètres** :
- `p_product_id` : ID du produit
- `p_qty` : Quantité à retirer

**Erreur** : Si stock insuffisant

**Usage** :
```sql
SELECT decrease_stock('uuid-here', 5);
```

---

### `create_sale_transaction()`
Crée une vente complète de manière atomique.

**Paramètres** :
- `p_customer_id` : UUID du client
- `p_payment_method` : Mode de paiement
- `p_exchange_rate` : Taux du jour
- `p_user_id` : UUID du vendeur
- `p_items` : JSONB array des items

**Retour** : ID de la vente créée

**Format items** :
```json
[
  {
    "product_id": "uuid",
    "quantity": 2,
    "unit_price": 15.50
  }
]
```

**Comportement** :
1. Crée la vente
2. Vérifie et diminue le stock pour chaque item
3. Crée les sale_items
4. Calcule et met à jour le total

**Usage** :
```javascript
const { data, error } = await supabase.rpc('create_sale_transaction', {
  p_customer_id: '...',
  p_payment_method: 'cash',
  p_exchange_rate: 2800,
  p_user_id: '...',
  p_items: [...]
});
```

---

### `delete_empty_sales()`
Nettoie les ventes sans items (créées il y a plus d'1h).

**Usage** :
```sql
SELECT delete_empty_sales();
```

---

## Diagramme des Relations

```
auth.users
    ↓
profiles ←─────────┐
    ↓              │
    ├─→ sales ←────┤
    │      ↓       │
    │  sale_items  │
    │      ↓       │
    │  products ←──┤
    │      ↓       │
    │  categories  │
    │              │
    ├─→ expenses   │
    ├─→ cash_entries
    └─→ stock_movements
```

---

## Stratégie de sécurité RLS

### Principes
- **Authentification obligatoire** pour toutes les opérations
- **Lecture ouverte** : tous les employés actifs peuvent consulter
- **Écriture restreinte** : selon le rôle
- **Admin total** : accès complet sur tout

### Matrice des permissions

| Table | Admin | Manager | Employee |
|-------|-------|---------|----------|
| profiles | ✅ CRUD | ✅ Read + Self Update | ✅ Read + Self Update |
| categories | ✅ CRUD | ✅ CRUD | ✅ Read |
| products | ✅ CRUD | ✅ CRUD | ✅ Read |
| customers | ✅ CRUD | ✅ CRUD | ✅ Read |
| sales | ✅ CRUD | ✅ CRUD | ✅ Read + Create |
| sale_items | ✅ CRUD | ✅ CRUD | ✅ Read + Create |
| stock_movements | ✅ CRUD | ✅ Read + Create | ✅ Read |
| exchange_rates | ✅ CRUD | ✅ CRUD | ✅ Read |
| expenses | ✅ CRUD | ✅ CRUD | ✅ Read |
| cash_entries | ✅ CRUD | ✅ CRUD | ✅ Read |

---

## Bonnes pratiques

### Gestion des prix
- **Toujours stocker en USD** dans la base
- **Convertir en CDF** côté frontend avec le taux du jour
- **Enregistrer le taux** utilisé lors de chaque vente

### Gestion des stocks
- **Utiliser les fonctions RPC** `increase_stock()` / `decrease_stock()`
- **Créer des mouvements** pour tracer les changements
- **Vérifier avant vente** via la fonction transactionnelle

### Gestion des ventes
- **Utiliser `create_sale_transaction()`** pour garantir l'atomicité
- **Toujours vérifier le stock** avant de valider
- **Nettoyer régulièrement** les ventes vides

### Sécurité
- **Ne jamais désactiver RLS**
- **Vérifier le rôle** côté frontend ET backend
- **Logger les actions sensibles**
- **Limiter les accès admin**

---

## Migrations futures

Pour ajouter de nouvelles fonctionnalités, créer des migrations qui :
1. Utilisent `IF NOT EXISTS` pour les tables
2. Utilisent `DROP POLICY IF EXISTS` puis `CREATE POLICY` pour RLS
3. Incluent une documentation détaillée en commentaires
4. Testent les contraintes et index

**Exemple** :
```sql
/*
  # Nom de la fonctionnalité

  1. Description
  2. Tables modifiées
  3. Politiques ajoutées/modifiées
*/

-- Votre SQL ici
```

---

## Support et maintenance

### Requêtes utiles

**Vérifier les produits en rupture** :
```sql
SELECT * FROM products WHERE stock <= 0;
```

**Ventes du jour** :
```sql
SELECT * FROM sales WHERE DATE(sale_date) = CURRENT_DATE;
```

**Top 10 produits vendus** :
```sql
SELECT
  p.name,
  SUM(si.quantity) as total_sold
FROM sale_items si
JOIN products p ON p.id = si.product_id
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

**Chiffre d'affaires par période** :
```sql
SELECT
  DATE(sale_date) as day,
  SUM(total_amount) as total,
  COUNT(*) as nb_sales
FROM sales
WHERE sale_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(sale_date)
ORDER BY day DESC;
```

---

## Conclusion

Cette structure de base de données offre :
- ✅ **Sécurité** : RLS complet et granulaire
- ✅ **Performance** : Index optimisés
- ✅ **Intégrité** : Contraintes strictes
- ✅ **Traçabilité** : Historique complet
- ✅ **Flexibilité** : Support multi-devises
- ✅ **Évolutivité** : Architecture modulaire

Pour toute question ou modification, référez-vous à cette documentation.
