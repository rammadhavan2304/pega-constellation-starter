import RootContainer from './src/components/PegaRootContainer';
import HybridViewContainer from '@pega/react-sdk-components/lib/components/infra/Containers/ViewContainer/ViewContainer';
import TextContent from '@pega/react-sdk-components/lib/components/field/TextContent';
import OrgDXComponentTwoColumnView from './src/components/custom-sdk/template/Org_DXComponent_TwoColumnView';

const localSdkComponentMap = {
  HybridViewContainer,
  RootContainer,
  Text: TextContent,
  Org_DXComponent_TwoColumnView: OrgDXComponentTwoColumnView
};

export default localSdkComponentMap;
