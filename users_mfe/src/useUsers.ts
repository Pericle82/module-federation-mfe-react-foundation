import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useUsers - state layer of USERS_MFE (users list).
 *
 * Mirror image of MFE_1's `useItems`, but on the 'users' channel. The MFE owns
 * no data: everything goes through the `serviceApi` injected by the host.
 *
 *   1. on mount we ask the host for the current users (`fetchUsers`);
 *   2. mutations (`addUser` / `removeUser`) are only *requests* sent to the host;
 *   3. the resulting new list comes back through the `onDataChange('users')`
 *      broadcast, which is what actually updates state.
 *
 * That is why the mutation handlers below never call `setUsers` themselves.
 */

interface UseUsersProps {
  /** Shared API exposed by the host. Undefined until the host has wired it up. */
  serviceApi?: any;
}

interface UseUsersReturn {
  users: any[];
  newUser: string;
  setNewUser: (value: string) => void;
  handleAdd: () => Promise<void>;
  handleRemove: (id: string | number) => Promise<void>;
  /** Per-operation loading flags, owned by the host service. */
  loaders: {
    fetchUsers: boolean;
    addUser: boolean;
    removeUser: boolean;
    filterUsers: boolean;
  };
  /** Per-operation error messages, owned by the host service. */
  errors: {
    fetchUsers: string | null;
    addUser: string | null;
    removeUser: string | null;
    filterUsers: string | null;
  };
  /** Aggregated stats broadcast by notifications_mfe (null until it publishes). */
  notificationStats: any;
}

export const useUsers = ({ serviceApi }: UseUsersProps): UseUsersReturn => {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState("");
  const [notificationStats, setNotificationStats] = useState<any>(null);

  // Set as soon as a broadcast delivers users, so a slower initial fetch knows
  // its result is already stale and must not overwrite the newer data.
  const gotBroadcastRef = useRef(false);

  // Fetch users when component mounts or serviceApi becomes available
  useEffect(() => {
    // Guard against setting state after unmount (or after serviceApi changed).
    let cancelled = false;
    gotBroadcastRef.current = false;

    const fetchUsers = async () => {
      if (serviceApi?.fetchUsers) {
        try {
          const result = await serviceApi.fetchUsers();
          // Drop the response if we unmounted meanwhile, or if a broadcast has
          // already delivered a fresher list while this request was in flight.
          if (!cancelled && !gotBroadcastRef.current) setUsers(result);
        } catch (error) {
          console.error('Failed to fetch users:', error);
        }
      }
    };

    fetchUsers();

    return () => { cancelled = true; };
  }, [serviceApi]);

  // Subscribe to data changes - specifically listen to 'users' data type.
  // This is the single source of truth for `users` after the first load: any
  // MFE mutating users makes the host re-broadcast the whole list here.
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('users', (updatedUsers: any[]) => {
      console.log('USERS_MFE received users data change notification:', updatedUsers);
      gotBroadcastRef.current = true;
      setUsers(updatedUsers);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [serviceApi]);

  // Read-only channel: notifications_mfe aggregates counters for the whole app
  // and republishes them on the 'notifications' channel. We only display them.
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('notifications', (stats: any) => {
      console.log('USERS_MFE received notification stats:', stats);
      setNotificationStats(stats);
    });

    return unsubscribe;
  }, [serviceApi]);

  const handleAdd = useCallback(async () => {
    // Ignore empty input, and no-op while the host API is not available yet.
    if (!newUser.trim() || !serviceApi?.addUser) return;

    try {
      await serviceApi.addUser(newUser);
      setNewUser("");
      // Note: Users will be updated via onDataChange notification
    } catch (error) {
      console.error('Failed to add user:', error);
    }
  }, [newUser, serviceApi]);

  const handleRemove = useCallback(async (id: string | number) => {
    if (!serviceApi?.removeUser) return;

    try {
      await serviceApi.removeUser(id);
      // Note: Users will be updated via onDataChange notification
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }, [serviceApi]);

  // Loading/error state lives in the host service so that every MFE sees the
  // same status. The literals below are just the "host not ready yet" fallback,
  // which keeps the UI from having to null-check these objects.
  const loaders = serviceApi?.loaders || {
    fetchUsers: false,
    addUser: false,
    removeUser: false,
    filterUsers: false,
  };

  const errors = serviceApi?.errors || {
    fetchUsers: null,
    addUser: null,
    removeUser: null,
    filterUsers: null,
  };

  return {
    users,
    newUser,
    setNewUser,
    handleAdd,
    handleRemove,
    loaders,
    errors,
    notificationStats,
  };
};
