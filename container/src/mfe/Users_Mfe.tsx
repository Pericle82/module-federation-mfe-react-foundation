import React from 'react';
import { useMicrofrontend } from './hooks';

export type UsersMfeProps = {
  serviceApi: any; // Service API with loaders and errors
  onLoad?: Function; // Optional prop to trigger initial load
  isReady?: boolean; // Optional prop to indicate if the service is ready
};

const Users_Mfe: React.FC<UsersMfeProps> = ({ serviceApi, onLoad, isReady = true }) => {
  const { elementRef } = useMicrofrontend({
    moduleName: 'users_mfe/mount',
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

export default Users_Mfe;
