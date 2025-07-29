import React from 'react';
import { useMicrofrontend } from './hooks';

type Mfe2Props = {
  items: any[];
  onFilter?: (query: string) => Promise<any[]>;
  onLoad?: Function;
};

const Mfe_2: React.FC<Mfe2Props> = ({ items, onFilter, onLoad }) => {
  const { elementRef } = useMicrofrontend({
    moduleName: 'mfe_2/mount',
    mountProps: {
      items,
      onFilter,
      onMount: onLoad
    },
    onLoad: onLoad as (() => void) | undefined,
    dependencies: [],
    updatePropsOnChange: true,
    retryOnFailure: true,
    maxRetries: 5,
    retryDelay: 2000
  });

  return <div ref={elementRef} />;
};

export default Mfe_2;