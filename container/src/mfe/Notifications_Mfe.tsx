import React from 'react';
import { useMicrofrontend } from './hooks/useMicrofrontend';

export interface NotificationsMfeMountProps {
  el: HTMLElement;
  serviceApi?: any;
}

export interface NotificationsMfeApi {
  unmount: () => void;
}

export interface NotificationsMfeProps {
  serviceApi?: any;
  onLoad?: () => void;
  isReady?: boolean;
}

const Notifications_Mfe: React.FC<NotificationsMfeProps> = ({ 
  serviceApi,
  onLoad, 
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