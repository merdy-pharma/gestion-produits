import React from 'react';
import { formatNumber } from '@/utils/salesHelpers';

interface CartSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
}

const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, tax, total }) => {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
      <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
        <span>Sous Total</span>
        <span>{formatNumber(subtotal ?? 0)} Fc</span>
      </div>

      <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
        <span>TVA (0%)</span>
        <span>{formatNumber(tax ?? 0)} Fc</span>
      </div>

      <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-white">
        <span>Total Général</span>
        <span className="text-primary-600 dark:text-primary-400">{formatNumber(total ?? 0)} Fc</span>
      </div>
    </div>
  );
};

export default CartSummary;
