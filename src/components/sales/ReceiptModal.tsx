import React, { ReactNode } from 'react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  children: ReactNode;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 transition-colors max-w-2xl w-full max-h-[85vh]">
        <div className="max-h-[calc(85vh-120px)] overflow-y-auto pr-2">
          {children}
        </div>

        <div className="flex justify-end gap-3 mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Fermer
          </button>
          <button
            onClick={onPrint}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
          >
            Imprimer la Facture
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
