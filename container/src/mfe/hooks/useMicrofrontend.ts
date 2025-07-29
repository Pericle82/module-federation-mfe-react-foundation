import { useEffect, useRef, useCallback } from 'react';
import { loadMicrofrontendModule, isValidModuleName, MicrofrontendModuleName } from './moduleLoader';

export interface MicrofrontendHookOptions<T = any> {
  /**
   * The name of the microfrontend module to import (e.g., 'mfe_1/mount')
   */
  moduleName: MicrofrontendModuleName;
  
  /**
   * Props to pass to the mount function
   */
  mountProps?: T;
  
  /**
   * Callback to execute when the microfrontend is successfully loaded
   */
  onLoad?: () => void;
  
  /**
   * Whether the microfrontend should be mounted (useful for conditional rendering)
   */
  isReady?: boolean;
  
  /**
   * Dependencies array for when to remount the microfrontend
   */
  dependencies?: any[];
  
  /**
   * Whether to update props on the instance when dependencies change
   */
  updatePropsOnChange?: boolean;
  
  /**
   * Whether to retry loading the microfrontend if it fails initially
   */
  retryOnFailure?: boolean;
  
  /**
   * Number of retry attempts (default: 3)
   */
  maxRetries?: number;
  
  /**
   * Delay between retry attempts in milliseconds (default: 1000)
   */
  retryDelay?: number;
}

export interface MicrofrontendInstance {
  unmount?: () => void;
  updateProps?: (props: any) => void;
}

/**
 * Custom hook for managing microfrontend mounting, unmounting, and lifecycle
 */
export function useMicrofrontend<T = any>(options: MicrofrontendHookOptions<T>) {
  const {
    moduleName,
    mountProps,
    onLoad,
    isReady = true,
    dependencies = [],
    updatePropsOnChange = false,
    retryOnFailure = true,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const elementRef = useRef<HTMLElement>(null);
  const instanceRef = useRef<MicrofrontendInstance | null>(null);
  const hasLoadedRef = useRef(false);
  const retryCountRef = useRef(0);

  // Function to attempt mounting with retry logic
  const attemptMount = useCallback(async (): Promise<void> => {
    if (!elementRef.current) return;
    
    // Validate module name before attempting to load
    if (!isValidModuleName(moduleName)) {
      console.error(`Invalid microfrontend module name: ${moduleName}`);
      return;
    }
    
    try {
      // Use the explicit module loader to help webpack understand the imports
      const module = await loadMicrofrontendModule(moduleName);
      const { mount } = module;
      
      // Prepare mount arguments with proper typing
      const mountArgs = {
        el: elementRef.current as HTMLElement,
        ...(mountProps || {})
      };
      
      // Mount the microfrontend with type assertion to handle dynamic typing
      instanceRef.current = (mount as any)(mountArgs);

      // Trigger onLoad callback if provided and this is the first mount
      if (onLoad && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        onLoad();
      }
      
      // Reset retry count on successful mount
      retryCountRef.current = 0;
      
    } catch (error) {
      console.error(`Error loading microfrontend ${moduleName}:`, error);
      
      // Retry logic
      if (retryOnFailure && retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        console.log(`Retrying to load ${moduleName} (attempt ${retryCountRef.current}/${maxRetries}) in ${retryDelay}ms...`);
        
        setTimeout(() => {
          attemptMount();
        }, retryDelay);
      } else if (retryCountRef.current >= maxRetries) {
        console.error(`Failed to load ${moduleName} after ${maxRetries} attempts`);
      }
    }
  }, [moduleName, mountProps, onLoad, retryOnFailure, maxRetries, retryDelay]);

  // Mount/unmount effect
  useEffect(() => {
    if (!isReady) return;
    
    let isMounted = true;
    
    // Reset retry count when effect runs
    retryCountRef.current = 0;
    
    if (isMounted) {
      attemptMount();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (instanceRef.current?.unmount) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, [moduleName, isReady, attemptMount, ...dependencies]);

  // Update props effect (only if updatePropsOnChange is true)
  useEffect(() => {
    if (updatePropsOnChange && instanceRef.current?.updateProps && mountProps) {
      instanceRef.current.updateProps(mountProps);
    }
  }, updatePropsOnChange ? [mountProps, ...dependencies] : []);

  return {
    elementRef,
    instance: instanceRef.current,
    isLoaded: hasLoadedRef.current
  };
}
