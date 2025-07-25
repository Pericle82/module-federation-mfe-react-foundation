import { Provider } from 'react-redux';
import { setData, setStatus, store } from './store';
import {StoreApp} from './StoreApp';
import ReactDOM from 'react-dom/client';
import React from 'react';

export function mount(el: HTMLElement) {
  const root = ReactDOM.createRoot(el);
  root.render(
    <Provider store={store}>
      <StoreApp />
    </Provider>
  );
  return {
    unmount: () => root.unmount(),
  };
}

// Expose setDataGlobal for other MFEs to update global store
export function setDataGlobal(data: any) {
  store.dispatch(setData(data));
}

// Expose setStatusGlobal for other MFEs to update MFE status
export function setStatusGlobal(mfe: 'mfe_1' | 'mfe_2' | 'store_mfe' | 'service_mfe', status: string) {
  store.dispatch(setStatus({ mfe, status }));
}

