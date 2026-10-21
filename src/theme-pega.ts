import { createTheme } from '@pega/react-sdk-components/node_modules/@mui/material/styles';

export const pegaTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0a6f8f'
    },
    secondary: {
      main: '#536d35'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif'
  },
  shape: {
    borderRadius: 6
  },
  actionButtons: {
    primary: {
      backgroundColor: '#0a6f8f',
      color: '#ffffff'
    },
    secondary: {
      backgroundColor: '#e8f1dd',
      color: '#26391a'
    }
  },
  embedded: {
    resolutionTextColor: '#4d5f68'
  }
} as any);
