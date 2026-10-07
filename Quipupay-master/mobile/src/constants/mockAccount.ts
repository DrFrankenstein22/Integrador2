export const mockAccount = {
  ownerFirstName: 'María',
  ownerFullName: 'María Elena Quispe Rojas',
  dni: '74128905',
  email: 'maria.quispe@correo.com',
  phone: '+51 987 654 321',
  accountNumber: '191-2847 5063 09',
  accountLast4: '5063',
  cci: '002 191 002847506309 21',
  balance: 'S/ 1,248.60',
} as const;

export type Movement = {
  id: string;
  title: string;
  date: string;
  amount: string;
  direction: 'in' | 'out';
  icon: string;
};

export const mockMovements: Movement[] = [
  { id: '1', title: 'Bodega San Martín', date: 'Hoy · 09:12', amount: '- S/ 18.50', direction: 'out', icon: '▣' },
  {
    id: '2',
    title: 'Transferencia recibida',
    date: 'Ayer · 18:40',
    amount: '+ S/ 320.00',
    direction: 'in',
    icon: '↓',
  },
  { id: '3', title: 'Recibo de luz', date: '28 ago · 11:05', amount: '- S/ 72.30', direction: 'out', icon: '≡' },
  {
    id: '4',
    title: 'Transferencia a J. Ramos',
    date: '26 ago · 20:18',
    amount: '- S/ 150.00',
    direction: 'out',
    icon: '↗',
  },
];
