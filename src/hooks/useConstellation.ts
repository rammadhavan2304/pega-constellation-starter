import { useEffect, useState } from 'react';
import { getSdkConfig, loginIfNecessary, sdkSetAuthHeader } from '@pega/auth/lib/sdk-auth-manager';
import { startMashup } from '../lib/constellation';

declare global {
  interface Window {
    PCore?: any;
    __pegaMashupStarted?: boolean;
  }
}

export function useConstellation(shouldInit: boolean) {
  const [isPegaReady, setIsPegaReady] = useState(() => Boolean(window.PCore));

  useEffect(() => {
    if (!shouldInit) return;

    let unmounted = false;

    const markReady = () => {
      if (unmounted) return;
      if (!window.__pegaMashupStarted) {
        startMashup();
        window.__pegaMashupStarted = true;
      }
      setIsPegaReady(true);
    };

    void getSdkConfig().then((sdkConfig: any) => {
      const authConfig = sdkConfig.authConfig || {};

      if (!authConfig.mashupClientId && authConfig.customAuthType === 'Basic') {
        const credentials = window.btoa(`${authConfig.mashupUserIdentifier}:${window.atob(authConfig.mashupPassword)}`);
        sdkSetAuthHeader(`Basic ${credentials}`);
      }
    });

    const onReady = () => {
      document.removeEventListener('SdkConstellationReady', onReady);
      markReady();
    };

    if (window.PCore) {
      markReady();
    } else {
      document.addEventListener('SdkConstellationReady', onReady);
    }

    loginIfNecessary({ appName: 'portal', mainRedirect: true });

    return () => {
      unmounted = true;
      document.removeEventListener('SdkConstellationReady', onReady);
    };
  }, [shouldInit]);

  return isPegaReady;
}
