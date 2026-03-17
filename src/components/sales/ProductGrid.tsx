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
  const displayedStock = (product: Product) =>
    getDisplayedStock(product, cart);

  return (
    <div className="md:w-[63%] bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">

      {/* Exchange Rate */}
      {typeof exchangeRate === 'number' && exchangeRate > 0 && (
        <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg flex justify-between items-center text-sm">
          <span className="text-blue-800 dark:text-blue-200 font-medium">
            💱 Taux : <strong>{formatNumber(exchangeRate)}</strong> CDF / USD
          </span>
          <button
            onClick={onRefreshRate}
            disabled={isLoading}
            className="px-3 py-1 border rounded hover:bg-blue-50 dark:hover:bg-blue-800 disabled:opacity-50"
          >
            🔄
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Rechercher article ou barcode..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* TABLE */}
      <div className="overflow-auto max-h-[450px] border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
            <tr>
              <th className="text-left p-3">Article</th>
              <th className="text-right p-3">Prix</th>
              <th className="text-center p-3">Stock</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => {
              const stock = displayedStock(product);
              const isOutOfStock = stock <= 0;
              const isLowStock = stock > 0 && stock <= 5;

              const price =
                Number(product.selling_price ?? 0) * (exchangeRate ?? 1);

              const inCart = cart.some((c) => c.id === product.id);

              return (
                <tr
                  key={product.id}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  className={`
                    border-t border-gray-200 dark:border-gray-700
                    transition cursor-pointer
                    ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                    
                    ${inCart
                      ? 'bg-primary-50 dark:bg-yellow-500/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                  `}
                >
                  {/* NAME */}
                  <td className="p-3 font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </td>

                  {/* PRICE */}
                  <td className="p-3 text-right font-semibold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                    {formatNumber(price)} Fc
                  </td>

                  {/* STOCK */}
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={onPreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
          >
            Précédent
          </button>

          <span className="text-sm font-medium">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={onNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;