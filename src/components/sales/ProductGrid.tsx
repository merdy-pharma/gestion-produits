import React from 'react';
import { Search } from 'lucide-react';
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

      {/* Exchange Rate */}
      {typeof exchangeRate === 'number' && exchangeRate > 0 && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg flex items-center justify-between text-sm">
          <span className="text-blue-800 dark:text-blue-200 font-medium">
            💱 Taux : <strong>{formatNumber(exchangeRate)}</strong> CDF / USD
          </span>
          <button
            onClick={onRefreshRate}
            disabled={isLoading}
            className="px-3 py-1 border rounded hover:bg-blue-50 dark:hover:bg-blue-800 disabled:opacity-50 transition"
          >
            🔄
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-5">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Rechercher article ou barcode..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {products.map((product) => {
          const stock = displayedStock(product);
          const isOutOfStock = stock <= 0;
          const isLowStock = stock > 0 && stock <= 5;

          const price =
            Number(product.selling_price ?? 0) * (exchangeRate ?? 1);

          const inCart = cart.some((c) => c.id === product.id);

          return (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock}
              className={`group relative p-3 rounded-xl border text-left transition-all duration-200
                bg-white dark:bg-gray-700
                border-gray-200 dark:border-gray-700
                hover:border-primary-500 dark:hover:border-primary-400
                hover:shadow-md active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                ${inCart ? 'ring-2 ring-primary-500' : ''}`}
            >
              {/* Stock Badge */}
              <div className="absolute top-2 right-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${
                      isOutOfStock
                        ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                        : isLowStock
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300'
                        : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                    }`}
                >
                  {isOutOfStock ? '0' : stock}
                </span>
              </div>

              {/* Product Name */}
              <div className="mb-2 min-h-[40px]">
                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                  {product.name}
                </p>
              </div>

              {/* Price */}
              <div className="mt-auto">
                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                  {formatNumber(price)} Fc
                </p>
              </div>

              {/* Status */}
              <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                {isOutOfStock
                  ? 'Indisponible'
                  : isLowStock
                  ? 'Stock faible'
                  : 'Disponible'}
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
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Précédent
          </button>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;