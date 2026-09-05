import React from 'react';
import { useMicrofrontend } from './hooks';

/**
 * Host-side wrapper for the `mfe_2` remote (items filter).
 *
 * Same shape as the other wrappers, with one difference: `mfe_2` is the only
 * remote whose mount() also returns `updateProps`, so the hook can push new
 * props into the live instance instead of remounting it.
 */

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
    // Prefer instance.updateProps() over a remount - mfe_2 keeps filter state
    // that a remount would throw away.
    updatePropsOnChange: true,
    retryOnFailure: true,
    maxRetries: 5,
    retryDelay: 2000
  });

  return <div ref={elementRef as React.RefObject<HTMLDivElement>} />;
};

export default Mfe_2;