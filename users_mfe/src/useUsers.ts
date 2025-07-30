import { useCallback, useEffect, useState } from 'react';

interface UseUsersProps {
  serviceApi?: any;
}

interface UseUsersReturn {
  users: any[];
  newUser: string;
  setNewUser: (value: string) => void;
  handleAdd: () => Promise<void>;
  handleRemove: (id: string | number) => Promise<void>;
  loaders: {
    fetchUsers: boolean;
    addUser: boolean;
    removeUser: boolean;
    filterUsers: boolean;
  };
  errors: {
    fetchUsers: string | null;
    addUser: string | null;
    removeUser: string | null;
    filterUsers: string | null;
  };
}

export const useUsers = ({ serviceApi }: UseUsersProps): UseUsersReturn => {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState("");

  // Fetch users when component mounts or serviceApi becomes available
  useEffect(() => {
    const fetchUsers = async () => {
      if (serviceApi?.fetchUsers) {
        try {
          const result = await serviceApi.fetchUsers();
          setUsers(result);
        } catch (error) {
          console.error('Failed to fetch users:', error);
        }
      }
    };

    fetchUsers();
  }, [serviceApi]);

  // Subscribe to data changes - specifically listen to 'users' data type
  useEffect(() => {
    if (!serviceApi?.onDataChange) return;

    const unsubscribe = serviceApi.onDataChange('users', (updatedUsers: any[]) => {
      console.log('USERS_MFE received users data change notification:', updatedUsers);
      setUsers(updatedUsers);
    });

    return unsubscribe; // Cleanup subscription on unmount
  }, [serviceApi]);

  const handleAdd = useCallback(async () => {
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

  // Get loading and error states from service API
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
  };
};
