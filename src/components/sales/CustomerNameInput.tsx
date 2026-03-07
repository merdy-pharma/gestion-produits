import React from 'react';

interface CustomerNameInputProps {
  value: string;
  onChange: (name: string) => void;
  isDisabled?: boolean;
}

const CustomerNameInput: React.FC<CustomerNameInputProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => {
  const hasError = !value.trim();

  return (
    <div className="mt-4 space-y-2">
      <h3 className="font-medium text-gray-900 dark:text-white mb-2">Nom du client</h3>

      <input
        type="text"
        placeholder="Entrer le nom du client"
        className={`w-full px-3 py-2 border rounded-lg h-11 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
          hasError
            ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
      />

      {hasError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          ⚠️ Le nom du client est obligatoire
        </p>
      )}
    </div>
  );
};

export default CustomerNameInput;
