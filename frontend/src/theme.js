import { createTheme } from '@mui/material/styles';

export const getTheme = (mode = 'light') =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            background: { default: '#f4f6fa' },
          }
        : {
            background: { default: '#18191a' },
          }),
    },
    shape: { borderRadius: 8 },
  });
