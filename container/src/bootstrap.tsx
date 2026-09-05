import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import Mfe_1 from './mfe/Mfe_1';
import Mfe_2 from './mfe/Mfe_2';
import Users_Mfe from './mfe/Users_Mfe';
import Notifications_Mfe from './mfe/Notifications_Mfe';
import Service_Mfe, { ServiceMfeRef } from './mfe/Service_Mfe';

/**
 * The host application (COMPREHENSIVE_GUIDE.md § 6.1).
 *
 * The container owns no domain data. Its whole job is lifecycle orchestration:
 *
 *   1. mount `service_mfe` first - it is headless (no UI) and returns the
 *      `ServiceMfeApi` object, which is the *only* channel between MFEs;
 *   2. hold that object in state together with an `isReady` gate;
 *   3. pass it down to the four UI micro-frontends, which stay unmounted until
 *      the gate opens.
 *
 * Nothing React-shaped ever crosses the boundary: only plain JS objects, which
 * is why the two separate React instances (§ 3.5, § 8) are harmless here.
 */

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
  // Imperative handle on the service wrapper (remount/getApi); currently unused
  // by the app itself, kept as the escape hatch for manual lifecycle control.
  const serviceMfeRef = useRef<ServiceMfeRef>(null);
  // The shared API, null until service_mfe has mounted and handed it over.
  const [serviceApi, setServiceApi] = useState<any>(null);
  // Gate for the UI micro-frontends: `useMicrofrontend` will not mount while false.
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
        {/* Headless data layer + event bus. Mounted into a hidden div by
            Service_Mfe and consumed only through its return value. */}
        <Service_Mfe 
          ref={serviceMfeRef}
          onLoad={() => console.log('Service MFE loaded')}
          onApiReady={(api) => {
            console.log('Service API ready:', api);
            // Both setters are batched by React 18 into a single re-render, so
            // the UI MFEs see `serviceApi` and `isReady` change together.
            setServiceApi(api);
            setIsReady(true);
          }}
        />
        
        <section className="mfe-section">
          {/* Every UI remote gets the same two props: the shared API and the
              readiness gate. They know nothing about each other - all
              cross-MFE traffic goes through the bus inside `serviceApi`.
              NOTE: `serviceApi` is passed straight through, so each render of
              <App> rebuilds the mountProps literal and remounts the remotes
              (§ 10.2); harmless today because <App> renders exactly twice. */}
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

// Bootstrap the host's own React root. This is React instance #1; each remote
// creates its own root inside the <div> the container hands to `mount()`.
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

console.log('Bootstrap loaded, attempting to render...');

export default App;