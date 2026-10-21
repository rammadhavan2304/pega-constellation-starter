import CssBaseline from '@pega/react-sdk-components/node_modules/@mui/material/CssBaseline';
import { ThemeProvider } from '@pega/react-sdk-components/node_modules/@mui/material/styles';
import { ThemeProvider as StylesThemeProvider } from '@mui/styles';
import createPConnectComponent from '@pega/react-sdk-components/lib/bridge/react_pconnect';
import StoreContext from '@pega/react-sdk-components/lib/bridge/Context/StoreContext';
import { getSdkComponentMap } from '@pega/react-sdk-components/lib/bridge/helpers/sdk_component_map';
import { compareSdkPCoreVersions } from '@pega/react-sdk-components/lib/components/helpers/versionHelpers';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import localSdkComponentMap from '../../sdk-local-component-map';
import { pegaTheme } from '../theme-pega';

const reactRoots = new WeakMap<Element, Root>();

const rootContainerWithHybrid = {
  type: 'RootContainer',
  config: { renderingMode: 'hybrid' },
  children: [
    {
      type: 'HybridViewContainer',
      config: { routingInfo: '@ROUTING_INFO', name: 'primary', contextName: 'app' },
      children: []
    }
  ]
};

function RootComponent(props: Record<string, unknown>) {
  const PegaConnect = createPConnectComponent();
  const PCore = window.PCore;

  return (
    <StoreContext.Provider value={{ store: PCore.getStore(), displayOnlyFA: true }}>
      <StylesThemeProvider theme={pegaTheme}>
        <ThemeProvider theme={pegaTheme}>
          <CssBaseline />
          <PegaConnect {...props} />
        </ThemeProvider>
      </StylesThemeProvider>
    </StoreContext.Provider>
  );
}

function initialRender(renderObj: any) {
  const { props, domContainerID = null, componentName, portalTarget, styleSheetTarget } = renderObj;
  const target = domContainerID ? document.getElementById(domContainerID) : portalTarget;

  if (!target) return;

  const Component = RootComponent as typeof RootComponent & { displayName?: string };
  if (componentName) Component.displayName = componentName;

  const root = reactRoots.get(target) || createRoot(target);
  reactRoots.set(target, root);
  root.render(<Component {...props} portalTarget={portalTarget} styleSheetTarget={styleSheetTarget} />);
}

export function startMashup() {
  const PCore = window.PCore;
  if (!PCore) return;

  PCore.onPCoreReady((renderObj: any) => {
    compareSdkPCoreVersions();
    getSdkComponentMap(localSdkComponentMap).then(() => initialRender(renderObj));
  });
}

export async function createCaseInConstellation(caseTypeId: string, content: Record<string, unknown> = {}) {
  const PCore = window.PCore;
  if (!PCore?.getBootstrapUtils?.()?.getCaseApi) {
    throw new Error('Pega Constellation case API is not ready.');
  }

  await PCore.getBootstrapUtils().loadRootComponent('pega-root', rootContainerWithHybrid, [
    PCore.getConstants().CONTAINER_TYPE.HYBRID,
    PCore.getConstants().LOAD_VIEW_STRING
  ]);

  PCore.getInitialiser().initCoreContainers();

  await PCore
    .getBootstrapUtils()
    .getCaseApi()
    .createCase(caseTypeId, PCore.getConstants().APP.APP, PCore.getConstants().PRIMARY, {
      startingFields: content,
      pageName: PCore.getConstants().PY_DETAILS || 'pyDetails',
      renderInline: true,
      viewType: 'page'
    });

  PCore.getCoexistenceManager()?.getEventUtils?.().publishConstellationLoadedEvent?.();
}

export async function openAssignmentInConstellation(assignmentId: string) {
  const PCore = window.PCore;
  if (!PCore?.getBootstrapUtils?.() || !PCore?.getMashupApi?.()?.openAssignment) {
    throw new Error('Pega Constellation assignment API is not ready.');
  }

  await PCore.getBootstrapUtils().loadRootComponent('pega-root', rootContainerWithHybrid, [
    PCore.getConstants().CONTAINER_TYPE.HYBRID,
    PCore.getConstants().LOAD_VIEW_STRING
  ]);

  PCore.getInitialiser().initCoreContainers();

  const target = PCore.getConstants().APP.APP || 'primary';
  const options = {
    containerName: 'primary',
    displayMode: 'workarea',
    pageName: PCore.getConstants().PY_DETAILS || 'pyDetails'
  };

  console.log('[Pega PCore] Opening pending assignment', { assignmentId, target, options });
  await PCore.getMashupApi().openAssignment(assignmentId, target, options);
  PCore.getCoexistenceManager()?.getEventUtils?.().publishConstellationLoadedEvent?.();
}
