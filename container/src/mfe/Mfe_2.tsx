import React from 'react';
import { useMicrofrontend } from './hooks';

type Mfe2Props = {
  serviceApi: any; // Service API with loaders and errors
  onLoad?: Function;
  isReady: boolean;
};

const Mfe_2: React.FC<Mfe2Props> = ({ serviceApi, onLoad, isReady }) => {
  const { elementRef } = useMicrofrontend({
    moduleName: 'mfe_2/mount',
    mountProps: {
      serviceApi, // Pass the entire service API including loaders and errors
    },
    onLoad: onLoad as (() => void) | undefined,
    isReady,
    dependencies: [serviceApi], // Re-mount when service API changes
    updatePropsOnChange: true,
    retryOnFailure: true,
    maxRetries: 5,
    retryDelay: 2000
  });

  return <div ref={elementRef as React.RefObject<HTMLDivElement>} />;
};

export default Mfe_2;