/**
 * notifications_mfe - public module of the dashboard remote
 * (COMPREHENSIVE_GUIDE.md § 5.8).
 *
 * Consumer *and* producer: it reads the `items` and `users` channels, and
 * republishes an aggregate on the `notifications` channel that the other three
 * remotes display in their headers. No HTTP of its own beyond the initial load.
 */

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

  // Maps an activity type to an icon; the `default` branch keeps the feed
  // rendering if a new type is added to the hook before this switch.
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_added': return '👤➕';
      case 'user_removed': return '👤➖';
      case 'user_updated': return '👤✏️';
      case 'item_added': return '📦➕';
      case 'item_removed': return '📦➖';
      case 'item_updated': return '📦✏️';
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