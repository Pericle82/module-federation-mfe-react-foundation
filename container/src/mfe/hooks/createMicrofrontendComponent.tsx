import React from 'react';
import { useMicrofrontend, MicrofrontendHookOptions } from './useMicrofrontend';

export interface MicrofrontendWrapperProps {
  className?: string;
  style?: React.CSSProperties;
}

type RemoteEntries = 'mfe_1/mount' | 'mfe_2/mount' | 'service_mfe/mount';

/**
 * Higher-order component that creates a microfrontend wrapper component
 */
export function createMicrofrontendComponent<T = any>(
  moduleName: RemoteEntries,
  defaultOptions?: Partial<MicrofrontendHookOptions<T>>
) {
  return function MicrofrontendComponent(
    props: T & MicrofrontendWrapperProps & Partial<MicrofrontendHookOptions<T>>
  ) {
    const {
      className,
      style,
      onLoad,
      isReady,
      dependencies,
      updatePropsOnChange,
      ...mountProps
    } = props;

    const { elementRef } = useMicrofrontend({
      moduleName,
      mountProps: mountProps as T,
      onLoad,
      isReady,
      dependencies,
      updatePropsOnChange,
      ...defaultOptions
    });

    return <div ref={elementRef as React.RefObject<HTMLDivElement>} className={className} style={style} />;
  };
}

/**
 * Generic microfrontend component that can be configured for any MFE
 */
export interface GenericMicrofrontendProps<T = any> extends MicrofrontendWrapperProps {
  moduleName: RemoteEntries;
  mountProps?: T;
  onLoad?: () => void;
  isReady?: boolean;
  dependencies?: any[];
  updatePropsOnChange?: boolean;
}

export function GenericMicrofrontend<T = any>(props: GenericMicrofrontendProps<T>) {
  const {
    moduleName,
    mountProps,
    className,
    style,
    onLoad,
    isReady,
    dependencies,
    updatePropsOnChange
  } = props;

  const { elementRef } = useMicrofrontend({
    moduleName,
    mountProps,
    onLoad,
    isReady,
    dependencies,
    updatePropsOnChange
  });

  return <div ref={elementRef as React.RefObject<HTMLDivElement>} className={className} style={style} />;
}
