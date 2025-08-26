
import React from 'react';
import styles from './MFEstatus.module.css';

type MfeKey = 'service_mfe' | 'mfe_1' | 'mfe_2' | 'users_mfe';

interface MFEstatusProps {
  mfeList: { key: MfeKey; label: string; status: 'loading' | 'ready' | 'error' }[];
}

const MFEstatus: React.FC<MFEstatusProps> = ({
  mfeList
}) => {
  const getMfeIcon = (key: MfeKey) => {
    switch (key) {
      case 'mfe_1': return '📦';
      case 'mfe_2': return '🔍';
      case 'service_mfe': return '🔧';
      case 'users_mfe': return '👥';
      default: return '⚙️';
    }
  };

  const getMfeClass = (key: MfeKey) => {
    switch (key) {
      case 'mfe_1': return styles.mfe1;
      case 'mfe_2': return styles.mfe2;
      case 'service_mfe': return styles.serviceMfe;
      case 'users_mfe': return styles.usersMfe;
      default: return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return '✅';
      case 'loading': return '⏳';
      case 'error': return '❌';
      default: return '⭕';
    }
  };

  return (
    <section className={styles.statusContainer}>
      <h2 className={styles.statusTitle}>
        <span>🏗️</span>
        Microfrontend Status Dashboard
      </h2>
      
      <div className={styles.statusGrid}>
        {mfeList.map(mfe => (
          <div key={mfe.key} className={`${styles.statusCard} ${getMfeClass(mfe.key)}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>{getMfeIcon(mfe.key)}</span>
              <h3 className={styles.cardTitle}>{mfe.label}</h3>
            </div>
            
            <div className={styles.cardContent}>
              <div className={`${styles.statusBadge} ${styles[mfe.status]}`}>
                <span>{getStatusIcon(mfe.status)}</span>
                <span>{mfe.status.toUpperCase()}</span>
              </div>
              
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                {mfe.status === 'ready' && '🚀 Fully loaded and operational'}
                {mfe.status === 'loading' && '🔄 Initializing components...'}
                {mfe.status === 'error' && '💥 Failed to load properly'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MFEstatus;