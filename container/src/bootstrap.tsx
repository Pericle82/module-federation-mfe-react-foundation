import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import Mfe_1 from './mfe/Mfe_1';
import Mfe_2 from './mfe/Mfe_2';
import { ServiceProvider, useServiceContext, useServiceFunctions } from './mfe/service/ServiceContext';

// ErrorBoundary to catch runtime errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any, info: any) {
    // You can log error here
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.error) {
      return <div style={{ color: 'red', padding: 20 }}><h2>Runtime Error</h2><pre>{String(this.state.error)}</pre></div>;
    }
    return this.props.children;
  }
}

// Main App component that uses the ServiceContext
const App: React.FC = () => {

  const { items, isReady, isLoading, error } = useServiceContext();
  const { filterItems, addItem, removeItem, fetchItems } = useServiceFunctions();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Container App - Micro Frontend Store</h1>
        <p>Welcome to the main container application</p>
        <div style={{ fontSize: '14px', margin: '10px 0' }}>
          <p>Service ready: {isReady ? '✅' : '❌'} | Items loaded: {items.length}</p>
          {isLoading && <p style={{ color: 'blue' }}>Loading items...</p>}
          {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
      </header>

      <main className="app-main">
        <section className="mfe-section">
          {/* Pass service data and functions to MFEs */}
          <Mfe_1
            addItem={addItem}
            removeItem={removeItem}
            onLoad={() => {console.log('MFE 1 loaded'); fetchItems();}}
            items={items}
            isReady={isReady}
          />
          <Mfe_2
            items={items}
            onFilter={isReady ? filterItems : undefined}
            onLoad={() => console.log('MFE 2 loaded')}
          />
      
        </section>
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 Micro Frontend Store POC</p>
      </footer>
    </div>
  );
};

// Render the app with ErrorBoundary and ServiceProvider
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <ErrorBoundary>
      <ServiceProvider>
        <App />
      </ServiceProvider>
    </ErrorBoundary>
  );
} else {
  console.error('Root container not found');
}

export default App;