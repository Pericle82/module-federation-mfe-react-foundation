
import React from 'react';
import { useUsers } from './useUsers';
import { mountUtils } from './useMount';

type UsersMfeProps = {
  serviceApi?: any; // Service API with loaders, errors, and methods
};

const UsersMfeApp: React.FC<UsersMfeProps> = (props) => {
  const { serviceApi } = props;
  
  const {
    users,
    newUser,
    setNewUser,
    handleAdd,
    handleRemove,
    loaders,
    errors,
  } = useUsers({ serviceApi });

  return (
    <div style={{ border: '2px solid #28a745', borderRadius: 8, padding: 16, margin: 16 }}>
      <h2>Users Micro-Frontend</h2>
      
      {/* Loading states */}
      {loaders.fetchUsers && <p style={{ color: 'blue' }}>Loading users...</p>}
      {loaders.addUser && <p style={{ color: 'blue' }}>Adding user...</p>}
      {loaders.removeUser && <p style={{ color: 'blue' }}>Removing user...</p>}
      
      {/* Error states */}
      {errors.fetchUsers && <p style={{ color: 'red' }}>Error loading users: {errors.fetchUsers}</p>}
      {errors.addUser && <p style={{ color: 'red' }}>Error adding user: {errors.addUser}</p>}
      {errors.removeUser && <p style={{ color: 'red' }}>Error removing user: {errors.removeUser}</p>}
      
      <ul>
        {users?.map((user: any) => (
          <li key={user.id}>
            <strong>{user.name}</strong> - {user.email}
            <button 
              style={{ marginLeft: 8 }} 
              onClick={() => handleRemove(user.id)}
              disabled={loaders.removeUser}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      
      <input
        type="text"
        value={newUser}
        onChange={e => setNewUser(e.target.value)}
        placeholder="New user name"
      />
      <button 
        onClick={handleAdd} 
        disabled={loaders.addUser || !newUser.trim()}
      >
        Add User
      </button>
    </div>
  );
};

// Mount interface
interface usersMfeMountProps {
  el: HTMLElement;
  serviceApi?: any;
}

// Export mount and unmount functions using the utility
export function mount({el, serviceApi}: usersMfeMountProps): { unmount: () => void } {
  return mountUtils.render(el, <UsersMfeApp serviceApi={serviceApi} />);
}

export function unmount(el: HTMLElement) {
  mountUtils.unmount(el);
}