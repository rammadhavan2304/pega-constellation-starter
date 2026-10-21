import { CssBaseline, ThemeProvider } from '@mui/material';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { BrandConfig, BrandId, brands, createBrandTheme } from './brandConfig';

/**
 * Provides the active brand (copy, palette and CSS variables) to the app.
 * Add more entries to `brands` in brandConfig.ts to support additional themes.
 */
interface BrandContextValue {
  brand: BrandConfig;
  brandId: BrandId;
}

const BrandContext = createContext<BrandContextValue | null>(null);

const DEFAULT_BRAND_ID: BrandId = 'default';

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const brandId = DEFAULT_BRAND_ID;
  const brand = brands[brandId];
  const theme = useMemo(() => createBrandTheme(brand), [brand]);

  useEffect(() => {
    document.documentElement.dataset.brand = brand.id;
    Object.entries(brand.cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [brand]);

  const value = useMemo(() => ({ brand, brandId }), [brand, brandId]);

  return (
    <BrandContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </BrandContext.Provider>
  );
}

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand must be used inside BrandProvider');
  return context;
};
