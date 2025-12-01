export interface Product {
  id: string;
  name: string;
  type: string;
  ingredients: string;
  priceNormal: number;
  priceXL?: number;
  section: string;
  image: string | { url: string }[]; // Updated to support both string URL and DB file array
  points: number;
  extrasAllowed: boolean;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
  category: 'sauce' | 'ingredient';
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  variant: 'Normal' | 'XL';
  price: number;
  quantity: number;
  selectedExtras: Extra[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  points: number;
  tableId?: string;
  password?: string; // Added for auth simulation
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  suggestedAction?: {
    product: Product;
    variant: 'Normal' | 'XL';
  };
}