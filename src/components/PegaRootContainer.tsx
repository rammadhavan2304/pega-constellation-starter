import { Children, createElement, useMemo } from 'react';
import createPConnectComponent from '@pega/react-sdk-components/lib/bridge/react_pconnect';
import StockRootContainerBase from '@pega/react-sdk-components/lib/components/infra/RootContainer/RootContainer';

const StockRootContainer = StockRootContainerBase as (props: Record<string, any>) => JSX.Element;

export default function PegaRootContainer(props: Record<string, any>) {
  const { children } = props;

  const modalViewContainer = useMemo(() => {
    return createElement(
      createPConnectComponent(),
      window.PCore.createPConnect({
        meta: {
          type: 'ModalViewContainer',
          config: {
            name: 'modal'
          }
        },
        options: {
          context: 'app'
        }
      })
    );
  }, []);

  if (children && Children.count(children) > 0) {
    return (
      <>
        {children}
        {modalViewContainer}
      </>
    );
  }

  return <StockRootContainer {...props} />;
}
