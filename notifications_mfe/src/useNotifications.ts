import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useNotifications - state layer of NOTIFICATIONS_MFE.
 *
 * This MFE is the aggregator of the system: it listens to every dataset
 * ('users' and 'items') on the host bus, keeps global counters plus a short
 * activity feed, and republishes the whole thing on the 'notifications'
 * channel so the other MFEs can display it.
 *
 *   users/items broadcasts  ->  stats + activities  ->  'notifications' broadcast
 *
 * It never mutates data; it only reads and summarises it.
 */

interface UseNotificationsProps {
  /** Shared API exposed by the host. Undefined until the host has wired it up. */
  serviceApi?: any;
}

/** One line of the activity feed. */
interface ActivityItem {
  id: string;
  type:
    | 'user_added'
    | 'user_removed'
    | 'user_updated'
    | 'item_added'
    | 'item_removed'
    | 'item_updated';
  message: string;
  timestamp: string;
  /** Which MFE the change came from, shown in the feed. */
  source: string;
}

/** Global counters shown in the dashboard. */
interface Stats {
  totalUsers: number;
  totalItems: number;
  /** How many changes we have observed since mount (not a dataset size). */
  recentActivity: number;
}

export const useNotifications = ({ serviceApi }: UseNotificationsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalItems: 0,
    recentActivity: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // What we know about each dataset: whether a broadcast already refreshed it
  // (so the slower initial load must not overwrite it with stale numbers) and
  // the last length we saw (used to tell additions from removals).
  //
  // This lives in a ref rather than being read back from `stats` so that the
  // subscription effect below depends only on `serviceApi`: keeping the totals
  // in its dependency array would tear down and re-register both listeners on
  // every single change.
  const seenRef = useRef({
    users: { broadcast: false, count: 0 },
    items: { broadcast: false, count: 0 },
  });

  // Subscribe to all data changes and create activity notifications
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    // Both datasets are handled the same way, only the labels differ.
    const subscribe = (
      dataType: 'users' | 'items',
      entity: 'User' | 'Item',
      source: string
    ) =>
      serviceApi.onDataChange(dataType, (updated: any[]) => {
        console.log(`NOTIFICATIONS_MFE received ${dataType} change:`, updated);

        const seen = seenRef.current[dataType];
        const previousCount = seen.count;
        seen.broadcast = true;
        seen.count = updated.length;

        setStats(prev => ({
          ...prev,
          ...(dataType === 'users'
            ? { totalUsers: updated.length }
            : { totalItems: updated.length }),
          recentActivity: prev.recentActivity + 1,
        }));

        // The bus carries the whole list, not the single change, so the kind of
        // change is inferred from the length. An unchanged length means the list
        // was edited in place: report it as an update instead of a removal.
        const verb =
          updated.length > previousCount
            ? 'added'
            : updated.length < previousCount
              ? 'removed'
              : 'updated';

        const newActivity: ActivityItem = {
          id: `${entity.toLowerCase()}-${Date.now()}`,
          type: `${entity.toLowerCase()}_${verb}` as ActivityItem['type'],
          message: `${entity} ${verb}`,
          timestamp: new Date().toLocaleTimeString(),
          source,
        };

        setActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep last 10
      });

    const unsubscribeUsers = subscribe('users', 'User', 'Users MFE');
    const unsubscribeItems = subscribe('items', 'Item', 'Items MFE');

    return () => {
      unsubscribeUsers();
      unsubscribeItems();
    };
  }, [serviceApi]);

  // Initial data load: seeds the counters, since the bus only reports changes
  // and would leave them at zero until something is added or removed.
  useEffect(() => {
    // Guard against setting state after unmount (or after serviceApi changed).
    let cancelled = false;
    seenRef.current = {
      users: { broadcast: false, count: 0 },
      items: { broadcast: false, count: 0 },
    };

    const loadInitialData = async () => {
      if (serviceApi?.fetchUsers && serviceApi?.fetchItems) {
        try {
          const [users, items] = await Promise.all([
            serviceApi.fetchUsers(),
            serviceApi.fetchItems()
          ]);

          if (cancelled) return;

          // Keep any counter a broadcast already refreshed while we were loading.
          const { users: seenUsers, items: seenItems } = seenRef.current;
          setStats(prev => ({
            totalUsers: seenUsers.broadcast ? prev.totalUsers : users.length,
            totalItems: seenItems.broadcast ? prev.totalItems : items.length,
            recentActivity: prev.recentActivity
          }));

          // Seed the baselines too, otherwise the first broadcast after this
          // load would compare against 0 and always look like an addition.
          if (!seenUsers.broadcast) seenUsers.count = users.length;
          if (!seenItems.broadcast) seenItems.count = items.length;

          // Add initial activity, keeping anything the listeners already recorded
          const initialActivity: ActivityItem = {
            id: `init-${Date.now()}`,
            type: 'item_added',
            message: 'Notifications system initialized',
            timestamp: new Date().toLocaleTimeString(),
            source: 'System'
          };
          // Appended at the end: the feed is newest-first, and this is the
          // oldest event. Still capped at 10 entries.
          setActivities(prev => [...prev, initialActivity].slice(0, 10));
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
      }
    };

    loadInitialData();

    return () => { cancelled = true; };
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

  // Broadcast stats whenever they change: `broadcastStats` is recreated on
  // every stats/activities update, so this effect fires exactly on those.
  useEffect(() => {
    broadcastStats();
  }, [broadcastStats]);

  return {
    stats,
    activities
  };
};
