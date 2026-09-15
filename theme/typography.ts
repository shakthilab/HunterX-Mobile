import { Platform } from 'react-native';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  italic: 'Inter_400Regular_Italic',
  mediumItalic: 'Inter_500Medium_Italic',
  semiBoldItalic: 'Inter_600SemiBold_Italic',
  boldItalic: 'Inter_700Bold_Italic',
  brush: 'PermanentMarker_400Regular',
  grunge: 'SedgwickAveDisplay_400Regular',
  rockSalt: 'RockSalt_400Regular',
  lacquer: 'Lacquer_400Regular',
  shojumaru: 'Shojumaru_400Regular',
};

export const fontFamily = Platform.select({
  ios: { sans: fontFamilies.regular, mono: 'Menlo' },
  android: { sans: fontFamilies.regular, mono: 'monospace' },
  default: { sans: fontFamilies.regular, mono: 'monospace' },
}) as { sans: string; mono: string };

export const typography = {
  display: { fontFamily: fontFamilies.bold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fontFamilies.bold, fontSize: 22, lineHeight: 28 },
  subtitle: { fontFamily: fontFamilies.semiBold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fontFamilies.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fontFamilies.medium, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fontFamilies.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamilies.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.5 },
} as const;

export type TypographyVariant = keyof typeof typography;

