import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { CartItem } from '@/types/sales';
import { formatNumber } from '@/utils/salesHelpers';

interface CartTableProps {
  cart: CartItem[];
  onIncreaseQuantity: (itemId: string) => void;
  onDecreaseQuantity: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

const CartTable: React.FC<CartTableProps> = ({
  cart,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemove,
}) => {
  if (cart.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-10">
        Aucun article sélectionné
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="text-left p-2 text-gray-900 dark:text-white">Article</th>
            <th className="text-center p-2 text-gray-900 dark:text-white">Qté</th>
            <th className="text-right p-2 text-gray-900 dark:text-white">Prix</th>
            <th className="text-right p-2 text-gray-900 dark:text-white">Total</th>
            <th className="p-2"></th>
          </tr>
        </thead>

        <tbody>
          {cart.map((item) => (
            <tr
              key={item.id}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <td className="p-2 font-medium text-gray-900 dark:text-white">{item.name}</td>

              <td className="p-2">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => onDecreaseQuantity(item.id)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Diminuer"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => onIncreaseQuantity(item.id)}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Augmenter"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </td>

              <td className="p-2 text-right font-semibold text-gray-900 dark:text-white">
                {formatNumber(item.price)} Fc
              </td>

              <td className="p-2 text-right font-bold text-primary-600 dark:text-primary-400">
                {formatNumber(item.price * item.quantity)} Fc
              </td>

              <td className="p-2 text-right">
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
     console.log({
  name: item.name,
  price: item.price,
  quantity: item.quantity,
  total: item.price * item.quantity,
});
};

export default CartTable;
