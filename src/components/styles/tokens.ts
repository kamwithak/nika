// Design tokens used across components
export const colors = {
  bg: '#0a0b0d',
  surface: '#141519',
  surfaceHover: '#1c1d24',
  border: '#2a2b33',
  text: '#ffffff',
  textSecondary: '#9ca3af',
  textTertiary: '#6b7280',
  accent: '#7c3aed',
  accentHover: '#6d28d9',
  accentLight: '#8b5cf6',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const radii = {
  sm: '6px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
} as const;

export const fonts = {
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
} as const;
