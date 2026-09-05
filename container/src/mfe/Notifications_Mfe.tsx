import React from 'react';
import { useMicrofrontend } from './hooks/useMicrofrontend';

/**
 * Host-side wrapper for the `notifications_mfe` remote (stats + activity feed).
 *
 * Rendered first in bootstrap.tsx so its dashboard sits on top; mount order has
 * no semantic weight, though it does decide listener order on the bus (§ 5.6) -
 * which is exactly why nothing should depend on it.
 */

export interface NotificationsMfeProps {
  serviceApi?: any;
  onLoad?: () => void;
  isReady?: boolean;
}

const Notifications_Mfe: React.FC<NotificationsMfeProps> = ({ 
  serviceApi,
  onLoad, 
  // Defaults to false: without an explicit gate this remote stays unmounted
  // rather than mounting without a serviceApi.
  isReady = false 
}) => {
  const { elementRef } = useMicrofrontend({
    moduleName: 'notifications_mfe/mount',
    mountProps: {
      serviceApi,
    },
    onLoad,
    isReady,
    dependencies: [serviceApi],
    retryOnFailure: true,
    maxRetries: 5,
    retryDelay: 2000
  });

  return <div ref={elementRef as React.RefObject<HTMLDivElement>} />;
};

export default Notifications_Mfe;