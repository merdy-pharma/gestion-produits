import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Smartphone,
  Banknote,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import Receipt from '@/pages/Receipt';
import { useAuth } from "@/hooks/useAuth";
import { initOfflineDB } from '@/lib/offlineDB';


// Génère un n° facture lisible
function generateInvoiceNumber(id: string | number | null, prefix = 'Fac') {
  if (!id) return '';
  return `${prefix}-${String(new Date().getFullYear()).slice(2)}${String(
    new Date().getMonth() + 1
  ).padStart(2, '0')}-${String(id).slice(0, 6).toUpperCase()}`;
}

interface Product {
  id: string;
  name: string;
  selling_price: number; // stocké en USD dans la base
  stock: number;
  barcode: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number; // en CDF pour l'UI (unit price affiché)
  quantity: number;
}

const Sales: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [customerName, setCustomerName] = useState ('');
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const [saleCompleted, setSaleCompleted] = useState(false);
  const [printedCart, setPrintedCart] = useState<CartItem[]>([]);
  const [printedTotal, setPrintedTotal] = useState<number>(0); // en CDF
  const [printedCustomerName, setPrintedCustomerName] = useState<string | null>(null);
  const [printedPaymentMethod, setPrintedPaymentMethod] = useState<string>('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatNumber = (value: number) => {
  return value.toLocaleString("fr-FR"); // format 1 000 / 2 500 / 125 400
};


  // Pagination
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Exchange rate (CDF per 1 USD). Récupéré depuis exchange_rates.
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // printedRate : taux utilisé pour l'impression de la vente courante (garantit que le reçu affiche le bon taux même si le taux change plus tard)
  const [printedRate, setPrintedRate] = useState<number | null>(null);

  // --- Filtrage / pagination produits
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchExchangeRate();
    fetchProducts();
  }, []);

  // Récupère le dernier taux (méthode publique)
  const fetchLatestRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération du taux:', error);
        return;
      }

      if (data && data.rate) {
        setExchangeRate(Number(data.rate));
      }
    } catch (err) {
      console.error('fetchLatestRate error', err);
    }
  };

  // Même fonction mais renvoyant uniquement rate et gérant erreurs silencieuses
  const fetchExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        console.warn('Erreur en récupérant le taux de change :', (error as any).message || error);
        return;
      }

      if (data && data.rate) {
        setExchangeRate(Number(data.rate));
      }
    } catch (err) {
      console.warn('fetchExchangeRate error', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue...');
    } finally {
      setLoading(false);
    }
  };

  // Ajoute un produit au panier — le prix affiché est en CDF (selling_price * rate)
  const addToCart = (product: Product) => {
    setSaleCompleted(false);
    setShowReceiptModal(false);

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      // Si le taux n'est pas chargé, on utilise 1 par défaut (évite d'ajouter 0). Mieux : charger le taux avant vente.
      const effectiveRate = exchangeRate ?? 1;
      const priceInCDF = Number((product.selling_price ?? 0) * effectiveRate);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: priceInCDF,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: string, change: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const product = products.find((p) => p.id === id);
            const maxQty = product ? product.stock : item.quantity;
            const newQty = Math.min(maxQty, item.quantity + change);
            return { ...item, quantity: Math.max(0, newQty) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const getDisplayedStock = (product: Product) => {
    const cartItem = cart.find((item) => item.id === product.id);
    return product.stock - (cartItem?.quantity || 0);
  };

 
  
// Finalise la vente : insère sale + sale_items, met à jour stock, prépare reçu
  
  const handleCompleteSale = async () => {
  // ⛔ Anti double-clic
  if (isSubmitting) return;

  // 🚫 Hors ligne = vente bloquée
  if (!navigator.onLine) {
    toast.error("Connexion perdue. Vente annulée.");
    return;
  }

  // 🚫 Panier vide
  if (!cart || cart.length === 0) {
    toast.error("Ajoutez au moins un article au panier.");
    return;
  }

  // 🚫 Mode de paiement obligatoire
  if (!selectedPayment) {
    toast.error("Veuillez sélectionner un mode de paiement.");
    return;
  }

    // 🚫 Nom client obligatoire
    if (!customerName.trim()) {
      toast.error("Veuillez saisir le nom du client.");
      return;
    }
  // ⚠️ Alerte prix trop bas
  const lowPriceItems = cart.filter(item => item.price <= 100);
  if (lowPriceItems.length > 0) {
    const list = lowPriceItems
      .map(i => `${i.name} (${i.price} Fc)`)
      .join("\n - ");

    const confirmed = window.confirm(
      `⚠️ Certains articles ont un prix très bas (≤ 100 Fc) :\n\n - ${list}\n\n` +
      "Voulez-vous vraiment continuer ?"
    );

    if (!confirmed) {
      toast.error("Vente annulée. Veuillez corriger les prix.");
      return;
    }
  }

  setIsSubmitting(true);
  toast.loading("Validation de la vente…", { id: "sale-progress" });
  

  try {
    // 🔄 Taux de change (fallback safe)
    let rate = exchangeRate;

    try {
      const { data } = await supabase
        .from("exchange_rates")
        .select("rate")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data?.rate) rate = Number(data.rate);
    } catch {}

    if (!rate || rate <= 0) {
      throw new Error("Taux de change invalide.");
    }

    // 📦 Préparation des items (USD)
    const itemsPayload = cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price / rate,
    }));

    // 🔐 Appel RPC transactionnelle
    const { data: saleId, error } = await supabase.rpc(
      "create_sale_transaction_ph",
      {
        p_customer_id:'5616a8f4-d0ba-4eb1-afde-387a11763f92',
        p_customer_name: customerName.trim(),
        p_payment_method: selectedPayment,
        p_exchange_rate: rate,
        p_user_id: user?.id,
        p_items: itemsPayload,
      }
    );

    if (error || !saleId) {
      throw error || new Error("Échec de la validation de la vente.");
    }

    // 🧾 Reçu (UI uniquement)
    const totalCDF = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    setSelectedSaleId(saleId);
    setPrintedCart([...cart]);
    setPrintedTotal(totalCDF);
    setPrintedPaymentMethod(selectedPayment);
    setPrintedCustomerName(customerName);
    setPrintedRate(rate);

    // 🔄 Reset UI
    setCart([]);
    setSelectedPayment("");
    setCustomerName("");


    await fetchProducts();

    setSaleCompleted(true);
    setShowReceiptModal(true);

    toast.success("Vente enregistrée avec succès !", {
      id: "sale-progress",
    });

  } catch (err) {
    console.error("handleCompleteSale error:", err);

    toast.error(
      err instanceof Error
        ? err.message
        : "Une erreur est survenue lors de la validation.",
      { id: "sale-progress" }
    );
  } finally {
    setIsSubmitting(false);
  }
};

  // Totaux côté UI (CDF)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.0;
  const total = subtotal + tax;

  // Pagination helpers
  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };
  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  return (
   <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen transition-colors">
      {/* Products Section */}
      <div className="md:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-colors">
        {typeof exchangeRate === 'number' && exchangeRate > 0 && (
          <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded text-blue-800 text-sm font-medium flex items-center justify-between">
            <span>
              💱 Taux du jour : <span className="font-bold">{exchangeRate.toLocaleString('fr-FR')}</span> CDF pour 1
              USD
            </span>

            <button
              type="button"
              onClick={fetchLatestRate}
              className="ml-3 px-3 py-1 text-sm border rounded hover:bg-blue-50"
            >
              🔄 Rafraîchir
            </button>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Entrez le nom de l'article ou son barcode..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Grille produits */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {paginatedProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 transition-colors duration-200 text-left bg-white shadow-sm"
              disabled={getDisplayedStock(product) <= 0}
            >
              <h6 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 min-h-[2.5rem]">
                {product.name}
              </h6>

              <p className="text-lg font-bold text-primary-600">
                {Number((product.selling_price ?? 0) * (exchangeRate ?? 1)).toFixed(0)} Fc
              </p>

              <p
                className={`text-sm font-medium flex items-center gap-1 ${
                  getDisplayedStock(product) === 0 ? 'text-red-600' : getDisplayedStock(product) <= 5 ? 'text-orange-500' : 'text-black'
                }`}
              >
                {getDisplayedStock(product) === 0 ? (
                  <>
                    <AlertCircle size={16} />
                    Stock épuisé
                  </>
                ) : getDisplayedStock(product) <= 5 ? (
                  <>
                    <AlertTriangle size={16} />
                    Stock faible : {getDisplayedStock(product)}
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    En stock : {getDisplayedStock(product)}
                  </>
                )}
              </p>
            </button>
          ))}
        </div>

        <div className="flex justify-center items-center mt-4 space-x-4">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm font-medium">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>



      {/* Section Panier */}
<div className="md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-colors">

  {/* HEADER */}
  <div className="flex items-center mb-4">
    <ShoppingCart className="text-primary-500 mr-2" size={26} />
    <h2 className="text-xl font-semibold">Articles sélectionnés</h2>
  </div>

  {/* LISTE PANIER PRO */}
<div className="flex-1 overflow-y-auto mb-4 max-h-[380px]">
  {cart.length === 0 ? (
    <div className="text-center text-gray-400 py-10">
      Aucun article sélectionné
    </div>
  ) : (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
        <tr>
          <th className="text-left p-2">Article</th>
          <th className="text-center p-2">Qté</th>
          <th className="text-right p-2">Prix</th>
          <th className="text-right p-2">Total</th>
          <th className="p-2"></th>
        </tr>
      </thead>

      <tbody>
        {cart.map((item) => (
          <tr key={item.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
            
            {/* NOM */}
            <td className="p-2 font-medium">{item.name}</td>

            {/* QUANTITE */}
            <td className="p-2">
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded hover:bg-gray-200">
                  <Minus size={14} />
                </button>

                <span className="w-8 text-center font-semibold">
                  {item.quantity}
                </span>

                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded hover:bg-gray-200">
                  <Plus size={14} />
                </button>
              </div>
            </td>

            {/* PRIX UNITAIRE */}
            <td className="p-2 text-right font-semibold">
              {formatNumber(item.price)} Fc
            </td>

            {/* TOTAL LIGNE */}
            <td className="p-2 text-right font-bold text-primary-600">
              {formatNumber(item.price * item.quantity)} Fc
            </td>

            {/* DELETE */}
            <td className="p-2 text-right">
              <button
                onClick={() => removeFromCart(item.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}
</div>


  

  {/* TOTALS */}
  <div className="border-t pt-4 space-y-2">
    <div className="flex justify-between text-sm">
      <span>Sous Total</span>
      <span>{formatNumber(subtotal ?? 0)} Fc</span>
    </div>

    <div className="flex justify-between text-sm">
      <span>TVA (0%)</span>
      <span>{Number(tax ?? 0).toFixed(0)} Fc</span>
    </div>

    <div className="flex justify-between font-bold text-lg">
      <span>Total Général</span>
     
      <span>{formatNumber(total ?? 0)} Fc</span>
      
    </div>
  </div>

  
   {/* CLIENT */}
      <div className="mt-4 space-y-2">
        <h3 className="font-medium mb-2">Nom du client</h3>
      
        <input
          type="text"
          placeholder="Entrer le nom du client"
          className="w-full px-3 py-2 border rounded-md h-11 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
      
        {!customerName.trim() && (
          <p className="text-sm text-red-600">
            ⚠️ Le nom du client est obligatoire
          </p>
        )}
      </div>
  

  {/* PAIEMENT */}
  <div className="mt-4 space-y-2">
    <h3 className="font-medium mb-2">Méthode de Paiement</h3>

    <div className="grid grid-cols-3 gap-2">

      <button
        onClick={() => setSelectedPayment("card")}
        className={`p-2 flex flex-col items-center rounded-lg border h-20
          ${selectedPayment === "card" ? "border-primary-500 bg-primary-50" : "border-gray-200 dark:bg-gray-700 dark:border-gray-700"}
        `}
        disabled
      >
        <CreditCard size={20} className={selectedPayment === "card" ? "text-primary-500" : "text-gray-500"} />
        <span className="text-sm mt-1">Card</span>
      </button>

      <button
        onClick={() => setSelectedPayment("cash")}
        className={`p-2 flex flex-col items-center dark:bg-gray-500 rounded-lg border h-20
          ${selectedPayment === "cash" ? "border-primary-500 bg-primary-50" : "border-gray-200 dark:bg-gray-700"}
        `}
      >
        <Banknote size={20} className={selectedPayment === "cash" ? "text-primary-500" : "text-gray-500 dark:text-gray-300"} />
        <span className="text-sm mt-1">Cash</span>
      </button>

      <button
        onClick={() => setSelectedPayment("mobile")}
        className={`p-2 flex flex-col items-center rounded-lg border h-20
          ${selectedPayment === "mobile" ? "border-primary-500 bg-primary-50" : "border-gray-200 dark:bg-gray-700 dark:border-gray-700"}
        `}
        disabled
      >
        <Smartphone size={20} className={selectedPayment === "mobile" ? "text-primary-500" : "text-gray-400"} />
        <span className="text-sm mt-1">Mobile</span>
      </button>

    </div>
  </div>

  {/* VALIDATION */}
  <button
    onClick={handleCompleteSale}
    className={`mt-4 w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 
      transition-colors duration-200 h-11
      disabled:opacity-50 disabled:cursor-not-allowed
      ${isSubmitting ? "opacity-60 cursor-wait" : ""}`}
    disabled={isSubmitting || cart.length === 0 || !selectedPayment|| !customerName.trim()}
    data-tip={
      isSubmitting
        ? "Validation en cours..."
        : cart.length === 0 || !selectedPayment || !customerName.trim()
        ? "Veuillez ajouter un article, saisir le nom du client et/ou sélectionner un mode de paiement"
        : ""
    }
  >
    {isSubmitting ? "⏳ Validation..." : "Valider"}
  </button>

  <ReactTooltip place="top" effect="solid" />
</div>

      {/* Modal reçu / facture */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-colors">
            <div className="max-h-[70vh] overflow-y-auto pr-2">
            <Receipt
              ref={receiptRef}
              cart={printedCart}
              total={printedTotal} // en CDF
              customerName={printedCustomerName}
              paymentMethod={printedPaymentMethod}
              //date={new Date().toLocaleString()}
              date={new Date().toISOString()}
              invoiceNumber={generateInvoiceNumber(selectedSaleId)}
              userName={user?.name || ''}
              exchangeRate={printedRate ?? undefined}
            />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowReceiptModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                Fermer
              </button>
              <button onClick={handlePrint} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Imprimer la Facture
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
