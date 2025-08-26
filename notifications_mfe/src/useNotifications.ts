import { useCallback, useEffect, useState } from 'react';

interface UseNotificationsProps {
  serviceApi?: any;
}

interface ActivityItem {
  id: string;
  type: 'user_added' | 'user_removed' | 'item_added' | 'item_removed';
  message: string;
  timestamp: string;
  source: string;
}

interface Stats {
  totalUsers: number;
  totalItems: number;
  recentActivity: number;
}

export const useNotifications = ({ serviceApi }: UseNotificationsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalItems: 0,
    recentActivity: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Subscribe to all data changes and create activity notifications
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribeUsers = serviceApi.onDataChange('users', (updatedUsers: any[]) => {
      console.log('NOTIFICATIONS_MFE received users change:', updatedUsers);
      
      setStats(prev => ({
        ...prev,
        totalUsers: updatedUsers.length,
        recentActivity: prev.recentActivity + 1
      }));

      // Create activity item for user changes
      const now = new Date().toLocaleTimeString();
      const newActivity: ActivityItem = {
        id: `user-${Date.now()}`,
        type: updatedUsers.length > stats.totalUsers ? 'user_added' : 'user_removed',
        message: `User ${updatedUsers.length > stats.totalUsers ? 'added' : 'removed'}`,
        timestamp: now,
        source: 'Users MFE'
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep last 10
    });

    const unsubscribeItems = serviceApi.onDataChange('items', (updatedItems: any[]) => {
      console.log('NOTIFICATIONS_MFE received items change:', updatedItems);
      
      setStats(prev => ({
        ...prev,
        totalItems: updatedItems.length,
        recentActivity: prev.recentActivity + 1
      }));

      // Create activity item for item changes
      const now = new Date().toLocaleTimeString();
      const newActivity: ActivityItem = {
        id: `item-${Date.now()}`,
        type: updatedItems.length > stats.totalItems ? 'item_added' : 'item_removed',
        message: `Item ${updatedItems.length > stats.totalItems ? 'added' : 'removed'}`,
        timestamp: now,
        source: 'Items MFE'
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep last 10
    });

    return () => {
      unsubscribeUsers();
      unsubscribeItems();
    };
  }, [serviceApi, stats.totalUsers, stats.totalItems]);

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      if (serviceApi?.fetchUsers && serviceApi?.fetchItems) {
        try {
          const [users, items] = await Promise.all([
            serviceApi.fetchUsers(),
            serviceApi.fetchItems()
          ]);
          
          setStats({
            totalUsers: users.length,
            totalItems: items.length,
            recentActivity: 0
          });

          // Add initial activity
          const initialActivity: ActivityItem = {
            id: `init-${Date.now()}`,
            type: 'item_added',
            message: 'Notifications system initialized',
            timestamp: new Date().toLocaleTimeString(),
            source: 'System'
          };
          setActivities([initialActivity]);
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
      }
    };

    loadInitialData();
  }, [serviceApi]);

  // Broadcast aggregated stats back to other MFEs
  const broadcastStats = useCallback(() => {
    if (serviceApi?.notifyDataChange) {
      const aggregatedStats = {
        stats,
        lastActivity: activities[0]?.timestamp || null,
        totalActivity: activities.length
      };
      
      console.log('Broadcasting stats:', aggregatedStats);
      serviceApi.notifyDataChange('notifications', aggregatedStats);
    }
  }, [serviceApi, stats, activities]);

  // Broadcast stats whenever they change
  useEffect(() => {
    broadcastStats();
  }, [broadcastStats]);

  return {
    stats,
    activities
  };
};