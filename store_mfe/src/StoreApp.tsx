import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from './store';

export const StoreApp: React.FC = () => {
  const data = useSelector((state: RootState) => state.global.data);
  return (
    <div style={{ border: '2px solid #28a745', padding: 16, borderRadius: 8, margin: 8 }}>
      <h2>Store MFE - Global Data</h2>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
