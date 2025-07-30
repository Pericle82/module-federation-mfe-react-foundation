import React from 'react';
import { useMicrofrontend } from './hooks';

export type Mfe1Props = {
  serviceApi: any; // Service API with loaders and errors
  onLoad?: Function; // Optional prop to trigger initial load
  isReady: boolean; // NEW: add isReady prop
};

const Mfe_1: React.FC<Mfe1Props> = ({ serviceApi, onLoad, isReady }) => {
  const { elementRef } = useMicrofrontend({
    moduleName: 'mfe_1/mount',
    mountProps: {
      serviceApi, // Pass the entire service API including loaders and errors
    },
    onLoad: onLoad as (() => void) | undefined,
    isReady,
    dependencies: [serviceApi], // Re-mount when service API changes
    retryOnFailure: true,
    maxRetries: 5,
    retryDelay: 2000
  });

  return <div ref={elementRef as React.RefObject<HTMLDivElement>} />;
};

export default Mfe_1;
