import React from 'react';
import { useNotifications } from './useNotifications';
import { mountUtils } from './useMount';
import {
  NotificationContainer,
  NotificationTitle,
  StatsGrid,
  StatCard,
  StatNumber,
  StatLabel,
  ActivityFeed,
  ActivityItem,
  ActivityTime
} from './components';

type NotificationsMfeProps = {
  serviceApi?: any;
};

const NotificationsMfeApp: React.FC<NotificationsMfeProps> = (props) => {
  const { serviceApi } = props;
  const { stats, activities } = useNotifications({ serviceApi });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_added': return '👤➕';
      case 'user_removed': return '👤➖';
      case 'item_added': return '📦➕';
      case 'item_removed': return '📦➖';
      default: return '📢';
    }
  };

  return (
    <NotificationContainer>
      <NotificationTitle>
        <span>🔔</span>
        System Notifications & Stats
      </NotificationTitle>

      <StatsGrid>
        <StatCard>
          <StatNumber>{stats.totalUsers}</StatNumber>
          <StatLabel>👥 Total Users</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.totalItems}</StatNumber>
          <StatLabel>📦 Total Items</StatLabel>
        </StatCard>
      </StatsGrid>

      <ActivityFeed>
        <div style={{ padding: '10px 15px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', color: '#6c757d' }}>
          Recent Activity
        </div>
        {activities.length > 0 ? (
          activities.map(activity => (
            <ActivityItem key={activity.id}>
              <span>{getActivityIcon(activity.type)}</span>
              <span>{activity.message}</span>
              <span style={{ fontSize: '12px', color: '#6c757d' }}>({activity.source})</span>
              <ActivityTime>{activity.timestamp}</ActivityTime>
            </ActivityItem>
          ))
        ) : (
          <ActivityItem>
            <span>📭</span>
            <span style={{ fontStyle: 'italic', color: '#6c757d' }}>No recent activity</span>
          </ActivityItem>
        )}
      </ActivityFeed>
    </NotificationContainer>
  );
};

// Mount interface
interface NotificationsMfeMountProps {
  el: HTMLElement;
  serviceApi?: any;
}

// Export mount and unmount functions
export function mount({ el, serviceApi }: NotificationsMfeMountProps): { unmount: () => void } {
  return mountUtils.render(el, <NotificationsMfeApp serviceApi={serviceApi} />);
}

export function unmount(el: HTMLElement) {
  mountUtils.unmount(el);
}