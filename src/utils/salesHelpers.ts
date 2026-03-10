import { supabase } from '@/lib/supabase';
import { CartItem, Product } from '@/types/sales';

// Génère un numéro de facture lisible
export function generateInvoiceNumber(id: string | number | null, prefix = 'Fac') {
  if (!id) return '';
  return `${prefix}-${String(new Date().getFullYear()).slice(2)}${String(
    new Date().getMonth() + 1
  ).padStart(2, '0')}-${String(id).slice(0, 6).toUpperCase()}`;
}

// Formate un nombre en français
export function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR');
}

// Récupère le dernier taux de change
export async function fetchLatestExchangeRate(): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && (error as any).code !== 'PGRST116') {
      console.warn('Erreur en récupérant le taux de change:', error.message);
      return null;
    }

    return data && data.rate ? Number(data.rate) : null;
  } catch (err) {
    console.warn('fetchLatestExchangeRate error:', err);
    return null;
  }
}

// Récupère tous les produits
export async function fetchProductsList(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
    .from("products_sellable_stock")
    .select("*")
    .gt("sellable_stock", 0)
    .order("name");

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Erreur lors de la récupération des produits:', err);
    throw err;
  }
}

// Filtre les produits par terme de recherche
export function filterProducts(
  products: Product[],
  searchTerm: string
): Product[] {
  if (!searchTerm.trim()) return products;

  const term = searchTerm.toLowerCase();
  return products.filter(
    (product) =>
      product.name.toLowerCase().includes(term) ||
      product.barcode.includes(term)
  );
}

// Pagine les produits
export function paginateProducts(
  products: Product[],
  currentPage: number,
  itemsPerPage: number
): Product[] {
  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return products.slice(start, end);
}

// Ajoute un produit au panier
export function addProductToCart(
  cart: CartItem[],
  product: Product,
  exchangeRate: number | null
): CartItem[] {
  const existingItem = cart.find((item) => item.id === product.id);
  const effectiveRate = exchangeRate ?? 1;
  const priceInCDF = Number((product.selling_price ?? 0) * effectiveRate);

  if (existingItem) {
    return cart.map((item) =>
      item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
    );
  }

  return [
    ...cart,
    {
      id: product.id,
      name: product.name,
      price: priceInCDF,
      quantity: 1,
    },
  ];
}

// Augmente la quantité d'un article au panier
export function increaseCartItemQuantity(
  cart: CartItem[],
  itemId: string,
  maxStock: number
): CartItem[] {
  return cart.map((item) =>
    item.id === itemId
      ? { ...item, quantity: Math.min(maxStock, item.quantity + 1) }
      : item
  );
}

// Diminue la quantité d'un article au panier
export function decreaseCartItemQuantity(cart: CartItem[], itemId: string): CartItem[] {
  return cart
    .map((item) =>
      item.id === itemId
        ? { ...item, quantity: Math.max(0, item.quantity - 1) }
        : item
    )
    .filter((item) => item.quantity > 0);
}

// Supprime un article du panier
export function removeFromCart(cart: CartItem[], itemId: string): CartItem[] {
  return cart.filter((item) => item.id !== itemId);
}

// Calcule le stock affiché (disponible - en panier)
export function getDisplayedStock(product: Product, cart: CartItem[]): number {
  const cartItem = cart.find((item) => item.id === product.id);
  return products_sellable_stock.sellable_stock - (cartItem?.quantity || 0);
}

// Calcule le sous-total
export function calculateSubtotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Valide les conditions pour compléter une vente
export function validateSaleCompletion(
  cart: CartItem[],
  selectedPayment: string,
  customerName: string,
  isOnline: boolean
): { isValid: boolean; error?: string } {
  if (!isOnline) {
    return { isValid: false, error: 'Connexion perdue. Vente annulée.' };
  }

  if (!cart || cart.length === 0) {
    return { isValid: false, error: 'Ajoutez au moins un article au panier.' };
  }

  if (!selectedPayment) {
    return { isValid: false, error: 'Veuillez sélectionner un mode de paiement.' };
  }

  if (!customerName.trim()) {
    return { isValid: false, error: 'Veuillez saisir le nom du client.' };
  }

  return { isValid: true };
}

// Prépare les items pour l'API (conversion USD)
export function prepareItemsPayload(cart: CartItem[], exchangeRate: number) {
  return cart.map((item) => ({
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price / exchangeRate,
  }));
}

// Détecte les articles à prix très bas
export function detectLowPriceItems(cart: CartItem[], threshold = 100) {
  return cart.filter((item) => item.price <= threshold);
}
