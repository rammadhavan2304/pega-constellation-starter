import { Children, type PropsWithChildren } from 'react';

import { twoColumnStyles } from './styles';
import type { PConnProps } from '@pega/react-sdk-components/lib/types/PConnProps';

interface OrgDXComponentTwoColumnViewProps extends PConnProps {}

export default function OrgDXComponentTwoColumnView(props: PropsWithChildren<OrgDXComponentTwoColumnViewProps>) {
  const childArray = Children.toArray(props.children).slice(0, 2);

  return (
    <div style={twoColumnStyles.wrapper}>
      <section style={twoColumnStyles.column}>{childArray[0] || null}</section>
      <section style={twoColumnStyles.column}>{childArray[1] || null}</section>
    </div>
  );
}
