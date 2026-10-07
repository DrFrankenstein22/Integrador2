export type ProductCurrency = 'PEN' | 'USD';

export type Product = {
  code: string;
  name: string;
  shortDescription: string;
  currencies: ProductCurrency[];
  recommended: boolean;
  trea: number;
  maintenanceFee: number;
  minimumBalance: number;
  requirement: string | null;
  features: string[];
};

export const PRODUCTS: Product[] = [
  {
    code: 'AHORROS',
    name: 'Cuenta de ahorros',
    shortDescription: 'Soles · sin monto mínimo · sin mantenimiento',
    currencies: ['PEN', 'USD'],
    recommended: true,
    trea: 0.5,
    maintenanceFee: 0,
    minimumBalance: 0,
    requirement: null,
    features: [
      'Transferencias interbancarias gratis (4 al mes)',
      'Retiros sin tarjeta en cajeros de la red',
      'Fondos cubiertos por el Fondo de Seguro de Depósitos',
    ],
  },
  {
    code: 'SUELDO',
    name: 'Cuenta sueldo',
    shortDescription: 'Requiere carta de tu empleador',
    currencies: ['PEN'],
    recommended: false,
    trea: 0.75,
    maintenanceFee: 0,
    minimumBalance: 0,
    requirement: 'Carta de tu empleador que autorice el abono de haberes.',
    features: [
      'Sin comisión de mantenimiento por ley',
      'Retiro del 100% de tu sueldo sin costo',
      'Acceso a adelanto de sueldo',
    ],
  },
  {
    code: 'DOLARES',
    name: 'Cuenta en dólares',
    shortDescription: 'US$ · sin monto mínimo',
    currencies: ['USD'],
    recommended: false,
    trea: 0.25,
    maintenanceFee: 0,
    minimumBalance: 0,
    requirement: null,
    features: [
      'Ahorra en dólares sin monto mínimo de apertura',
      'Transferencias entre tus cuentas sin costo',
      'Tipo de cambio preferencial en la app',
    ],
  },
];

export function findProduct(code: string): Product | undefined {
  return PRODUCTS.find((product) => product.code === code.toUpperCase());
}
