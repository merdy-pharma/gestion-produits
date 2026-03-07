import React from 'react';
import { CreditCard, Banknote, Smartphone } from 'lucide-react';

interface PaymentSectionProps {
  selectedPayment: string;
  onPaymentChange: (method: string) => void;
  isDisabled?: boolean;
}

const paymentMethods = [
  {
    id: 'cash',
    label: 'Cash',
    icon: Banknote,
    enabled: true,
  },
  {
    id: 'card',
    label: 'Carte',
    icon: CreditCard,
    enabled: false,
  },
  {
    id: 'mobile',
    label: 'Mobile Money',
    icon: Smartphone,
    enabled: false,
  },
];

const PaymentSection: React.FC<PaymentSectionProps> = ({
  selectedPayment,
  onPaymentChange,
  isDisabled = false,
}) => {
  return (
    <div className="mt-4 space-y-2">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">Méthode de Paiement</h3>

      <div className="grid grid-cols-3 gap-2">
        {paymentMethods.map(({ id, label, icon: Icon, enabled }) => (
          <button
            key={id}
            onClick={() => enabled && onPaymentChange(id)}
            disabled={!enabled || isDisabled}
            className={`p-2 flex flex-col items-center rounded-lg border h-20 transition-all ${
              selectedPayment === id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${
              !enabled || isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Icon
              size={20}
              className={`${
                selectedPayment === id
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            />
            <span className="text-xs mt-1 text-gray-900 dark:text-gray-100">{label}</span>
            {!enabled && <span className="text-xs text-gray-500 dark:text-gray-400">Bientôt</span>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PaymentSection;
