import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import Receipt from '@/pages/Receipt';
import { useAuth } from "@/hooks/useAuth";
import ProductGrid from '@/components/sales/ProductGrid';
import CartTable from '@/components/sales/CartTable';
import CartSummary from '@/components/sales/CartSummary';
import PaymentSection from '@/components/sales/PaymentSection';
import CustomerNameInput from '@/components/sales/CustomerNameInput';
import ReceiptModal from '@/components/sales/ReceiptModal';
import {
  generateInvoiceNumber,
  fetchLatestExchangeRate,
  fetchProductsList,
  filterProducts,
  paginateProducts,
  addProductToCart,
  increaseCartItemQuantity,
  decreaseCartItemQuantity,
  removeFromCart,
  calculateSubtotal,
  validateSaleCompletion,
  prepareItemsPayload,
  detectLowPriceItems,
} from '@/utils/salesHelpers';
import { Product, CartItem } from '@/types/sales';

const ITEMS_PER_PAGE = 10;

const Sales: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const filteredProducts = filterProducts(products, searchTerm);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = paginateProducts(filteredProducts, currentPage, ITEMS_PER_PAGE);

  // Cart & Prices
  const [cart, setCart] = useState<CartItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const subtotal = calculateSubtotal(cart);
  const tax = subtotal * 0.0;
  const total = subtotal + tax;

  // Forms
  const [customerName, setCustomerName] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');

  // Receipt
  const receiptRef = useRef<HTMLDivElement | null>(null);
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [printedCart, setPrintedCart] = useState<CartItem[]>([]);
  const [printedTotal, setPrintedTotal] = useState<number>(0);
  const [printedCustomerName, setPrintedCustomerName] = useState<string | null>(null);
  const [printedPaymentMethod, setPrintedPaymentMethod] = useState<string>('');
  const [printedRate, setPrintedRate] = useState<number | null>(null);

  // State management
  const [saleCompleted, setSaleCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const rate = await fetchLatestExchangeRate();
        if (rate) setExchangeRate(rate);

        const productsList = await fetchProductsList();
        setProducts(productsList);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Reset page on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handlers
  const handleAddToCart = (product: Product) => {
    setSaleCompleted(false);
    setShowReceiptModal(false);
    setCart(addProductToCart(cart, product, exchangeRate));
  };

  const handleIncreaseQuantity = (itemId: string) => {
    const product = products.find((p) => p.id === itemId);
    if (product) {
      setCart(increaseCartItemQuantity(cart, itemId, product.stock));
    }
  };

  const handleDecreaseQuantity = (itemId: string) => {
    setCart(decreaseCartItemQuantity(cart, itemId));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(removeFromCart(cart, itemId));
  };

  const handleRefreshRate = async () => {
    const rate = await fetchLatestExchangeRate();
    if (rate) {
      setExchangeRate(rate);
      toast.success('Taux de change mis à jour');
    }
  };

  const handleCompleteSale = async () => {
    if (isSubmitting) return;

    // Validation
    const validation = validateSaleCompletion(
      cart,
      selectedPayment,
      customerName,
      navigator.onLine
    );

    if (!validation.isValid) {
      toast.error(validation.error || 'Erreur de validation');
      return;
    }

    // Check for low price items
    const lowPriceItems = detectLowPriceItems(cart, 100);
    if (lowPriceItems.length > 0) {
      const list = lowPriceItems
        .map((i) => `${i.name} (${i.price} Fc)`)
        .join('\n - ');

      const confirmed = window.confirm(
        `⚠️ Certains articles ont un prix très bas (≤ 100 Fc) :\n\n - ${list}\n\nVoulez-vous vraiment continuer ?`
      );

      if (!confirmed) {
        toast.error('Vente annulée. Veuillez corriger les prix.');
        return;
      }
    }

    setIsSubmitting(true);
    toast.loading('Validation de la vente…', { id: 'sale-progress' });

    try {
      // Get current exchange rate
      let rate = exchangeRate;
      try {
        const { data } = await supabase
          .from('exchange_rates')
          .select('rate')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.rate) rate = Number(data.rate);
      } catch {}

      if (!rate || rate <= 0) {
        throw new Error('Taux de change invalide.');
      }

      // Prepare items payload
      const itemsPayload = prepareItemsPayload(cart, rate);

      // Call transaction RPC
      const { data: saleId, error } = await supabase.rpc(
        'create_sale_transaction_ph',
        {
          p_customer_id: '5616a8f4-d0ba-4eb1-afde-387a11763f92',
          p_customer_name: customerName.trim(),
          p_payment_method: selectedPayment,
          p_exchange_rate: rate,
          p_user_id: user?.id,
          p_items: itemsPayload,
        }
      );

      if (error || !saleId) {
        throw error || new Error('Échec de la validation de la vente.');
      }

      // Prepare receipt data
      setSelectedSaleId(saleId);
      setPrintedCart([...cart]);
      setPrintedTotal(total);
      setPrintedPaymentMethod(selectedPayment);
      setPrintedCustomerName(customerName);
      setPrintedRate(rate);

      // Reset forms
      setCart([]);
      setSelectedPayment('');
      setCustomerName('');

      // Refresh products
      const productsList = await fetchProductsList();
      setProducts(productsList);

      setSaleCompleted(true);
      setShowReceiptModal(true);
     
      toast.success('Vente enregistrée avec succès !', { id: 'sale-progress' });
       
    } catch (err) {
      console.error('handleCompleteSale error:', err);
      toast.error(
        err instanceof Error ? err.message : 'Une erreur est survenue lors de la validation.',
        { id: 'sale-progress' }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          <p className="font-medium">Erreur lors du chargement</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 p-4 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen transition-colors">
      {/* Products Section */}
      <ProductGrid
        products={paginatedProducts}
        exchangeRate={exchangeRate}
        cart={cart}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddToCart={handleAddToCart}
        onPreviousPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        currentPage={currentPage}
        totalPages={totalPages}
        onRefreshRate={handleRefreshRate}
        isLoading={false}
      />

      {/* Cart Section */}
      <div className="md:w-[37%] bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-colors flex flex-col">
        {/* Header */}
        <div className="flex items-center mb-4">
          <ShoppingCart className="text-primary-500 dark:text-primary-400 mr-2" size={26} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Articles sélectionnés</h2>
           <button
              onClick={() => setCart([])}
              className="text-sm text-red-600 hover:underline">
              Vider le panier
             <Trash2 size={18} />
          </button>
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-y-auto mb-4 max-h-[380px]">
          <CartTable
            cart={cart}
            onIncreaseQuantity={handleIncreaseQuantity}
            onDecreaseQuantity={handleDecreaseQuantity}
            onRemove={handleRemoveFromCart}
          />
        </div>

        {/* Summary */}
        <CartSummary subtotal={subtotal} tax={tax} total={total} />

        {/* Customer Name */}
        <CustomerNameInput
          value={customerName}
          onChange={setCustomerName}
          isDisabled={isSubmitting}
        />

        {/* Payment Method */}
        <PaymentSection
          selectedPayment={selectedPayment}
          onPaymentChange={setSelectedPayment}
          isDisabled={isSubmitting}
        />

        {/* Validation Button */}
        <button
          onClick={handleCompleteSale}
          className={`mt-4 w-full py-2 bg-primary-500 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-700
            transition-colors duration-200 h-11
            disabled:opacity-50 disabled:cursor-not-allowed font-medium
            ${isSubmitting ? 'opacity-60 cursor-wait' : ''}`}
          disabled={isSubmitting || cart.length === 0 || !selectedPayment || !customerName.trim()}
          data-tip={
            isSubmitting
              ? 'Validation en cours...'
              : cart.length === 0 || !selectedPayment || !customerName.trim()
              ? 'Veuillez ajouter un article, saisir le nom du client et/ou sélectionner un mode de paiement'
              : ''
          }
        >
          {isSubmitting ? '⏳ Validation...' : 'Valider'}
        </button>

        <ReactTooltip place="top" effect="solid" />
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
      onClose={() => {
        setShowReceiptModal(false);
        document.querySelector("input[type='text']")?.focus();
      }}
        onPrint={handlePrint}
      >
        <div ref={receiptRef}>
          <Receipt
            cart={printedCart}
            total={printedTotal}
            customerName={printedCustomerName}
            paymentMethod={printedPaymentMethod}
            date={new Date().toISOString()}
            invoiceNumber={generateInvoiceNumber(selectedSaleId)}
            userName={user?.name || ''}
            exchangeRate={printedRate ?? undefined}
          />
        </div>
      </ReceiptModal>
    </div>
  );
};

export default Sales;
