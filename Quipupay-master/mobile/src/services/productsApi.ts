import { authFetch } from './http';

export type Product = {
  code: string;
  name: string;
  shortDescription: string;
  currencies: ('PEN' | 'USD')[];
  recommended: boolean;
  trea: number;
  maintenanceFee: number;
  minimumBalance: number;
  requirement: string | null;
  features: string[];
};

export function listProducts(): Promise<Product[]> {
  return authFetch<Product[]>('/products');
}

export function getProduct(code: string): Promise<Product> {
  return authFetch<Product>(`/products/${code}`);
}
