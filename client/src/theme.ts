export type ThemeMode = 'light' | 'dark';

const sharedTokens = {
  space: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  radii: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '22px',
    pill: '999px',
  },
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    // Fluid display sizes: comfortable on a phone, generous on desktop.
    xl: 'clamp(20px, 2.5vw, 24px)',
    xxl: 'clamp(26px, 5vw, 34px)',
  },
  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fonts: {
    heading: "'Bricolage Grotesque Variable', Georgia, serif",
    body: "'Outfit Variable', 'Segoe UI', Roboto, sans-serif",
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
  },
  motion: {
    fast: '140ms',
    normal: '240ms',
    slow: '400ms',
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Overshooting spring for tactile "pop" feedback on toggles/checks.
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// Brand core — a bold athletic red (fitnessmaxxing's counterpart to
// habitmaxxing's orange) with a gradient pair used for primary actions and
// the ambient background glow.
const brand = {
  primary: '#e03131',
  primaryHover: '#c92a2a',
  gradientPrimary: 'linear-gradient(135deg, #f34c4c 0%, #d61f1f 100%)',
};

const lightColors = {
  background: '#f5f5f7',
  surface: '#ffffff',
  surfaceAlt: '#f3f4f7',
  border: '#e5e7ee',
  borderStrong: '#d4d8e3',
  text: '#151823',
  textMuted: '#646b7d',
  textFaint: '#9aa1b2',
  ...brand,
  primarySoft: 'rgba(224, 49, 49, 0.09)',
  primaryText: '#ffffff',
  focusRing: 'rgba(224, 49, 49, 0.28)',
  overlay: 'rgba(16, 18, 27, 0.4)',
  success: '#1f9d5f',
  successSoft: 'rgba(31, 157, 95, 0.12)',
  danger: '#d1394a',
  warning: '#c98a04',
};

const darkColors = {
  background: '#0b0d13',
  surface: '#14161f',
  surfaceAlt: '#1b1e2a',
  border: '#262a38',
  borderStrong: '#343a4d',
  text: '#f2f4fa',
  textMuted: '#9aa3b8',
  textFaint: '#68718a',
  ...brand,
  primary: '#fa5252',
  primarySoft: 'rgba(250, 82, 82, 0.14)',
  primaryText: '#ffffff',
  focusRing: 'rgba(250, 82, 82, 0.35)',
  overlay: 'rgba(4, 5, 10, 0.6)',
  success: '#3fca82',
  successSoft: 'rgba(63, 202, 130, 0.14)',
  danger: '#f0647a',
  warning: '#e7b046',
};

// Layered elevation. Dark surfaces rely more on borders + subtle lightening,
// so their shadows are deeper but softer.
const lightShadows = {
  xs: '0 1px 2px rgba(21, 24, 35, 0.05)',
  sm: '0 1px 2px rgba(21, 24, 35, 0.04), 0 4px 12px rgba(21, 24, 35, 0.06)',
  md: '0 2px 4px rgba(21, 24, 35, 0.05), 0 12px 28px rgba(21, 24, 35, 0.09)',
  lg: '0 4px 8px rgba(21, 24, 35, 0.06), 0 24px 48px rgba(21, 24, 35, 0.14)',
  glowPrimary: '0 6px 20px rgba(224, 49, 49, 0.3)',
};

const darkShadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3), 0 4px 14px rgba(0, 0, 0, 0.35)',
  md: '0 2px 4px rgba(0, 0, 0, 0.35), 0 12px 30px rgba(0, 0, 0, 0.45)',
  lg: '0 4px 8px rgba(0, 0, 0, 0.4), 0 24px 56px rgba(0, 0, 0, 0.55)',
  glowPrimary: '0 6px 24px rgba(250, 82, 82, 0.35)',
};

export interface AppTheme {
  mode: ThemeMode;
  colors: typeof lightColors;
  shadows: typeof lightShadows;
  space: typeof sharedTokens.space;
  radii: typeof sharedTokens.radii;
  fontSizes: typeof sharedTokens.fontSizes;
  fontWeights: typeof sharedTokens.fontWeights;
  fonts: typeof sharedTokens.fonts;
  breakpoints: typeof sharedTokens.breakpoints;
  motion: typeof sharedTokens.motion;
}

export const lightTheme: AppTheme = {
  mode: 'light',
  colors: lightColors,
  shadows: lightShadows,
  ...sharedTokens,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  colors: darkColors,
  shadows: darkShadows,
  ...sharedTokens,
};

export const themes: Record<ThemeMode, AppTheme> = {
  light: lightTheme,
  dark: darkTheme,
};
