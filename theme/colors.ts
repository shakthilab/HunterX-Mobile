export const palette = {
  black: '#000000',
  background: '#020203',
  surface: '#0D1114',
  surfaceRed: '#18090A',
  border: '#1C232A',
  hunterRed: '#F12730',
  textWhite: '#F4F5F6',
  textSecondary: '#8D98A3',
  gold: '#F3AF72',
  silver: '#B8C6D1',
  bronze: '#C87852',

  navy900: '#050505',
  navy800: '#0D1114',
  navy700: '#161618',
  navy600: '#1C232A',
  navy500: '#3F3F46',

  white: '#F4F5F6',
  slate100: '#F4F5F6',
  slate300: '#8D98A3',
  slate500: '#71717A',

  blue: '#5B8CFF',
  purple: '#9D4EDD',
  orange: '#F12730',
  orangeMuted: 'rgba(241, 39, 48, 0.65)',
  goldMuted: 'rgba(243, 175, 114, 0.65)',
  red: '#F12730',
  green: '#3DDC97',
} as const;

export const colors = {
  background: palette.background,
  surface: palette.surface,
  surfaceElevated: palette.surfaceRed,
  border: palette.border,

  textPrimary: palette.textWhite,
  textSecondary: palette.textSecondary,
  textMuted: palette.slate500,

  accentPrimary: palette.hunterRed,
  accentSecondary: palette.purple,
  accentOrange: palette.hunterRed,
  accentGold: palette.gold,
  accentGoldMuted: palette.goldMuted,

  hunterRed: palette.hunterRed,
  surfaceRed: palette.surfaceRed,

  success: palette.green,
  danger: palette.hunterRed,
  warning: palette.gold,

  // Loot / achievement rarity tiers
  rarity: {
    common: palette.textSecondary,
    rare: palette.blue,
    epic: palette.purple,
    legendary: palette.gold,
  },
} as const;

export type AppColors = typeof colors;

