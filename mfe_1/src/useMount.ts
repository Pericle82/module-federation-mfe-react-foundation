import React from 'react';
import ReactDOM from 'react-dom/client';

// Global WeakMap to store roots for all MFEs
const roots = new WeakMap<HTMLElement, ReturnType<typeof ReactDOM.createRoot>>();

// Utility functions for mounting/unmounting React components
export const mountUtils = {
  render: (el: HTMLElement, element: React.ReactElement) => {
    let root = roots.get(el);
    if (!root) {
      root = ReactDOM.createRoot(el);
      roots.set(el, root);
    }
    
    root.render(element);
    
    return {
      unmount: () => {
        root?.unmount();
        roots.delete(el);
      }
    };
  },

  unmount: (el: HTMLElement) => {
    const root = roots.get(el);
    if (root) {
      root.unmount();
      roots.delete(el);
    }
  }
};

// Factory to create mount functions for MFEs
export const createMountFunction = <T extends { el: HTMLElement }>(
  Component: React.ComponentType<Omit<T, 'el'>>
) => {
  return (props: T) => {
    const { el, ...componentProps } = props;
    return mountUtils.render(el, React.createElement(Component, componentProps as Omit<T, 'el'>));
  };
};
