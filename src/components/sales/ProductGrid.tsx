import React from 'react';
import { Search, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Product, CartItem } from '@/types/sales';
import { formatNumber, getDisplayedStock } from '@/utils/salesHelpers';

interface ProductGridProps {
  products: Product[];
  exchangeRate: number | null;
  cart: CartItem[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAddToCart: (product: Product) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  currentPage: number;
  totalPages: number;
  onRefreshRate: () => void;
  isLoading?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  exchangeRate,
  cart,
  searchTerm,
  onSearchChange,
  onAddToCart,
  onPreviousPage,
  onNextPage,
  currentPage,
  totalPages,
  onRefreshRate,
  isLoading = false,
}) => {
  const displayedStock = (product: Product) => getDisplayedStock(product, cart);

  return (
    <div className="md:w-[63%] bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 transition-colors">
      {/* Exchange Rate Banner */}
      {typeof exchangeRate === 'number' && exchangeRate > 0 && (
        <div className="mb-3 p-2 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded text-blue-800 dark:text-blue-200 text-sm font-medium flex items-center justify-between">
          <span>
            💱 Taux du jour : <span className="font-bold">{formatNumber(exchangeRate)}</span> CDF pour 1 USD
          </span>
          <button
            type="button"
            onClick={onRefreshRate}
            disabled={isLoading}
            className="ml-3 px-3 py-1 text-sm border rounded hover:bg-blue-50 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            🔄 Rafraîchir
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Entrez le nom de l'article ou son barcode..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors text-gray-900 dark:text-gray-100"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {products.map((product) => {
          const stock = displayedStock(product);
          const isOutOfStock = stock <= 0;
          const isLowStock = stock > 0 && stock <= 5;

          return (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-400 transition-colors duration-200 text-left bg-white dark:bg-gray-700 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <h6 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 min-h-[2.5rem]">
                {product.name}
              </h6>

              <p className="text-lg font-bold text-primary-600 dark:text-primary-400 my-2">
                {formatNumber(Number((product.selling_price ?? 0) * (exchangeRate ?? 1)))} Fc
              </p>

              <p
                className={`text-sm font-medium flex items-center gap-1 ${
                  isOutOfStock
                    ? 'text-red-600 dark:text-red-400'
                    : isLowStock
                    ? 'text-orange-500 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {isOutOfStock ? (
                  <>
                    <AlertCircle size={16} />
                    Stock épuisé
                  </>
                ) : isLowStock ? (
                  <>
                    <AlertTriangle size={16} />
                    Stock faible : {stock}
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    En stock : {stock}
                  </>
                )}
              </p>
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={onPreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Précédent
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
