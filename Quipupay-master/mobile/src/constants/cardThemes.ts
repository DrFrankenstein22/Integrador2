export type CardTheme = {
  id: string;
  name: string;
  tagline: string;
  gradient: readonly [string, string, string];
  accent: string;
  accentSoft: string;
  pattern: 'orbit' | 'grid' | 'ribbon' | 'pulse' | 'carbon' | 'matrix' | 'copper' | 'ice';
};

export const CARD_THEMES: readonly CardTheme[] = [
  {
    id: 'oceano',
    name: 'Neón Lima',
    tagline: 'Azul fintech',
    gradient: ['#020617', '#0B2D5B', '#2563EB'],
    accent: '#67E8F9',
    accentSoft: 'rgba(103,232,249,0.18)',
    pattern: 'orbit',
  },
  {
    id: 'esmeralda',
    name: 'Quipu Verde',
    tagline: 'Digital segura',
    gradient: ['#031714', '#064E3B', '#12B981'],
    accent: '#A3E635',
    accentSoft: 'rgba(163,230,53,0.2)',
    pattern: 'grid',
  },
  {
    id: 'amatista',
    name: 'Aurora',
    tagline: 'Premium virtual',
    gradient: ['#11103A', '#5B21B6', '#06B6D4'],
    accent: '#C4B5FD',
    accentSoft: 'rgba(196,181,253,0.2)',
    pattern: 'pulse',
  },
  {
    id: 'atardecer',
    name: 'Solar',
    tagline: 'Energía diaria',
    gradient: ['#1F1300', '#B45309', '#F59E0B'],
    accent: '#FDE68A',
    accentSoft: 'rgba(253,230,138,0.22)',
    pattern: 'ribbon',
  },
  {
    id: 'grafito',
    name: 'Obsidiana',
    tagline: 'Minimal negra',
    gradient: ['#020617', '#111827', '#334155'],
    accent: '#E2E8F0',
    accentSoft: 'rgba(226,232,240,0.16)',
    pattern: 'carbon',
  },
  {
    id: 'nexus',
    name: 'Nexus',
    tagline: 'Red inteligente',
    gradient: ['#020617', '#123A5C', '#14B8A6'],
    accent: '#5EEAD4',
    accentSoft: 'rgba(94,234,212,0.2)',
    pattern: 'matrix',
  },
  {
    id: 'cobre',
    name: 'Cobre',
    tagline: 'Edición cálida',
    gradient: ['#140A05', '#7C2D12', '#EA580C'],
    accent: '#FDBA74',
    accentSoft: 'rgba(253,186,116,0.22)',
    pattern: 'copper',
  },
  {
    id: 'cristal',
    name: 'Cristal',
    tagline: 'Clara y digital',
    gradient: ['#082F49', '#0369A1', '#7DD3FC'],
    accent: '#E0F2FE',
    accentSoft: 'rgba(224,242,254,0.22)',
    pattern: 'ice',
  },
] as const;

export const DEFAULT_CARD_THEME_ID = CARD_THEMES[0].id;

export function getCardTheme(themeId: string | null | undefined): CardTheme {
  return CARD_THEMES.find((theme) => theme.id === themeId) ?? CARD_THEMES[0];
}
