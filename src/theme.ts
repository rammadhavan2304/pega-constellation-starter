import { createTheme } from '@mui/material/styles';

export const starterTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0a6f8f',
      dark: '#07526a',
      light: '#d9f3f7'
    },
    secondary: {
      main: '#536d35',
      dark: '#3d5127',
      light: '#e8f1dd'
    },
    background: {
      default: '#f6f8f5',
      paper: '#ffffff'
    },
    text: {
      primary: '#18212a',
      secondary: '#60707a'
    },
    warning: {
      main: '#b46b16'
    },
    success: {
      main: '#357a4d'
    }
  },
  typography: {
    fontFamily: [
      'Inter',
      'Segoe UI',
      'Roboto',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 800 },
    button: {
      fontWeight: 700,
      textTransform: 'none'
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 40
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid #dfe7e2',
          boxShadow: '0 8px 24px rgba(24, 33, 42, 0.06)'
        }
      }
    }
  }
});
