/**
 * STEM/MakerLab Theme for Modern Engineering Interface
 * 
 * Features:
 * - Engineering color palette (blues, grays, accent colors)
 * - Technical typography
 * - Circuit board patterns
 * - Geometric elements
 * - Professional gradients
 */

import { createTheme } from '@mui/material/styles';

// STEM Color Palette
const stemColors = {
  // Primary Engineering Colors
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#2196f3', // Main blue
    600: '#1e88e5',
    700: '#1976d2',
    800: '#1565c0',
    900: '#0d47a1',
  },
  
  // Secondary Technical Colors
  secondary: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e', // Main gray
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Accent Colors for STEM Elements
  accent: {
    orange: '#ff6b35',    // Engineering orange
    green: '#4caf50',     // Success/Go
    red: '#f44336',       // Error/Stop
    yellow: '#ffc107',    // Warning/Caution
    purple: '#9c27b0',    // Innovation
    teal: '#009688',      // Technology
  },
  
  // Background Colors
  background: {
    primary: '#fafbfc',
    secondary: '#f5f7fa',
    dark: '#1a1d23',
    card: '#ffffff',
    surface: '#f8f9fa',
  },
  
  // Text Colors
  text: {
    primary: '#1a1d23',
    secondary: '#6b7280',
    disabled: '#9ca3af',
    inverse: '#ffffff',
  }
};

// Engineering Typography
const engineeringTypography = {
  fontFamily: [
    '"Inter"',
    '"Roboto"',
    '"Segoe UI"',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
    color: stemColors.text.secondary,
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'none' as const,
  },
};

// Create the STEM theme
export const stemTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: stemColors.primary[500],
      light: stemColors.primary[300],
      dark: stemColors.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: stemColors.secondary[500],
      light: stemColors.secondary[300],
      dark: stemColors.secondary[700],
      contrastText: '#ffffff',
    },
    error: {
      main: stemColors.accent.red,
    },
    warning: {
      main: stemColors.accent.yellow,
    },
    info: {
      main: stemColors.primary[500],
    },
    success: {
      main: stemColors.accent.green,
    },
    background: {
      default: stemColors.background.primary,
      paper: stemColors.background.card,
    },
    text: {
      primary: stemColors.text.primary,
      secondary: stemColors.text.secondary,
    },
  },
  
  typography: engineeringTypography,
  
  shape: {
    borderRadius: 12,
  },
  
  components: {
    // Enhanced Button Components
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.15)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${stemColors.primary[500]} 0%, ${stemColors.primary[600]} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`,
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            background: `${stemColors.primary[50]}`,
          },
        },
      },
    },
    
    // Enhanced Card Components
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    
    // Enhanced TextField Components
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: stemColors.secondary[300],
            },
            '&:hover fieldset': {
              borderColor: stemColors.primary[300],
            },
            '&.Mui-focused fieldset': {
              borderColor: stemColors.primary[500],
              borderWidth: 2,
            },
          },
        },
      },
    },
    
    // Enhanced Paper Components
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
        elevation3: {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        },
      },
    },
    
    // Enhanced AppBar
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${stemColors.primary[600]} 0%, ${stemColors.primary[700]} 100%)`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    
    // Enhanced Chip Components
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
        colorPrimary: {
          background: `linear-gradient(135deg, ${stemColors.primary[500]} 0%, ${stemColors.primary[600]} 100%)`,
          color: '#ffffff',
        },
      },
    },
  },
});

// Export color constants for use in components
export { stemColors };
