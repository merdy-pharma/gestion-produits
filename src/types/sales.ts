export interface Product {
  id: string;
  name: string;
  selling_price: number;
  stock: number;
  barcode: string;
  category_id?: string;
  purchase_price?: number;
  image_url?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SalePayload {
  p_customer_id: string;
  p_customer_name: string;
  p_payment_method: string;
  p_exchange_rate: number;
  p_user_id: string | undefined;
  p_items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}
