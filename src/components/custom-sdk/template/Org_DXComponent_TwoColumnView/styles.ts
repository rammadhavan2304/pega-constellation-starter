import type { CSSProperties } from 'react';

export const twoColumnStyles: Record<string, CSSProperties> = {
  wrapper: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '16px',
    width: '100%',
    alignItems: 'start'
  },
  column: {
    minWidth: 0,
    width: '100%'
  }
};
