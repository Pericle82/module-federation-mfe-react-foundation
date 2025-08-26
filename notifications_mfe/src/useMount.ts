import React from 'react';
import { createRoot, Root } from 'react-dom/client';

let root: Root | null = null;

export const mountUtils = {
  render: (el: HTMLElement, component: React.ReactElement): { unmount: () => void } => {
    if (root) {
      mountUtils.unmount(el);
    }
    
    root = createRoot(el);
    root.render(component);
    
    return {
      unmount: () => mountUtils.unmount(el)
    };
  },
  
  unmount: (el: HTMLElement) => {
    if (root) {
      root.unmount();
      root = null;
      el.innerHTML = '';
    }
  }
};