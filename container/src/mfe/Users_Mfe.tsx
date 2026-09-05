import React from 'react';
import { useMicrofrontend } from './hooks';

/**
 * Host-side wrapper for the `users_mfe` remote (users CRUD).
 * Mirror of Mfe_1, on the `users` channel of the bus.
 */

export type UsersMfeProps = {
  serviceApi: any; // Service API with loaders and errors
  onLoad?: Function; // Optional prop to trigger initial load
  // Optional here (defaults to true) unlike Mfe_1/Mfe_2, where it is required.
  // bootstrap.tsx always passes it, so in practice the gate behaves the same.
  isReady?: boolean;
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
