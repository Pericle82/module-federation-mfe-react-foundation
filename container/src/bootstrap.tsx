import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import Mfe_1 from './mfe/Mfe_1';
import Mfe_2 from './mfe/Mfe_2';
import Users_Mfe from './mfe/Users_Mfe';
import Notifications_Mfe from './mfe/Notifications_Mfe';
import Service_Mfe, { ServiceMfeRef } from './mfe/Service_Mfe';

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

// Main App component that manages service API directly
const App: React.FC = () => {
  const serviceMfeRef = useRef<ServiceMfeRef>(null);
  const [serviceApi, setServiceApi] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Container App - Micro Frontend Store</h1>
        <p>Welcome to the main container application</p>
        <div style={{ fontSize: '14px', margin: '10px 0' }}>
          <p>Service ready: {isReady ? '✅' : '❌'}</p>
          <p>Bidirectional dependencies system active</p>
        </div>
      </header>

      <main className="app-main">
        {/* Load Service MFE */}
        <Service_Mfe 
          ref={serviceMfeRef}
          onLoad={() => console.log('Service MFE loaded')}
          onApiReady={(api) => {
            console.log('Service API ready:', api);
            setServiceApi(api);
            setIsReady(true);
          }}
        />
        
        <section className="mfe-section">
          {/* Pass service API directly to MFEs */}
          <Notifications_Mfe
            serviceApi={serviceApi}
            onLoad={() => console.log('Notifications MFE loaded')}
            isReady={isReady}
          />
          <Mfe_1
            serviceApi={serviceApi}
            onLoad={() => console.log('MFE 1 loaded')}
            isReady={isReady}
          />
          <Mfe_2
            serviceApi={serviceApi}
            onLoad={() => console.log('MFE 2 loaded')}
            isReady={isReady}
          />
          <Users_Mfe
            serviceApi={serviceApi}
            onLoad={() => console.log('Users MFE loaded')}
            isReady={isReady}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 Micro Frontend Store POC</p>
      </footer>
    </div>
  );
};

// Render the app with ErrorBoundary only
const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} else {
  console.error('Root container not found');
}

// Remove dynamic import to test if it's causing issues
console.log('Bootstrap loaded, attempting to render...');

export default App;