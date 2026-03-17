<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
  {products.map((product) => {
    const stock = displayedStock(product);
    const isOutOfStock = stock <= 0;
    const isLowStock = stock > 0 && stock <= 5;

    const price = Number(product.selling_price ?? 0) * (exchangeRate ?? 1);

    return (
      <button
        key={product.id}
        onClick={() => onAddToCart(product)}
        disabled={isOutOfStock}
        className="group relative p-3 rounded-xl border bg-white dark:bg-gray-700 
        border-gray-200 dark:border-gray-700 
        hover:border-primary-500 dark:hover:border-primary-400
        hover:shadow-md transition-all duration-200
        disabled:opacity-40 disabled:cursor-not-allowed text-left"
      >
        {/* STOCK BADGE */}
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

        {/* PRODUCT NAME */}
        <div className="mb-2 min-h-[40px]">
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
            {product.name}
          </p>
        </div>

        {/* PRICE */}
        <div className="mt-auto">
          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {formatNumber(price)} Fc
          </p>
        </div>

        {/* STATUS TEXT (subtle) */}
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