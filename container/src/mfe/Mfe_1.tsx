import React from 'react';
import { useMicrofrontend } from './hooks';

/**
 * Host-side wrapper for the `mfe_1` remote (items CRUD).
 *
 * A wrapper is deliberately this thin: it renders one empty <div>, hands the
 * node to `useMicrofrontend` and gets out of the way. All the lifecycle logic
 * lives in the hook (COMPREHENSIVE_GUIDE.md § 7).
 */

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
    // `serviceApi` arrives once (null -> the real object), which is the one
    // remount that actually matters: the remote is torn down and rebuilt with
    // the API in hand.
    dependencies: [serviceApi],
    // The remote's dev server may still be starting up: 5 attempts, 2s apart.
    retryOnFailure: true,
    maxRetries: 5,
    retryDelay: 2000
  });

  // Empty on purpose: everything inside is rendered by the remote's own React
  // root, created in mfe_1's mount().
  return <div ref={elementRef as React.RefObject<HTMLDivElement>} />;
};

export default Mfe_1;
