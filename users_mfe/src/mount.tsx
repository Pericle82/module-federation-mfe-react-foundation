/**
 * users_mfe - public module of the users CRUD remote
 * (COMPREHENSIVE_GUIDE.md § 4.1).
 *
 * Structurally identical to mfe_1, on the `users` channel instead of `items`.
 * The two never talk to each other: what keeps them consistent is the bus in
 * service_mfe.
 */

import React from 'react';
import { useUsers } from './useUsers';
import { mountUtils } from './useMount';
import {
  MfeContainer,
  MfeTitle,
  StatusMessage,
  UsersList,
  UsersListItem,
  UserInfo,
  UserName,
  UserEmail,
  InputContainer,
  Input,
  Button,
  RemoveButton,
} from './components';

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
    notificationStats,
  } = useUsers({ serviceApi });

  return (
    <MfeContainer>
      <MfeTitle>
        <span>👥</span>
        Users Manager
        {/* The items count comes from notifications_mfe over the
            'notifications' channel (§ 5.8) - this remote never reads /items. */}
        {notificationStats && (
          <span style={{ fontSize: '12px', marginLeft: '10px', color: '#6c757d' }}>
            📊 Items: {notificationStats.stats?.totalItems || 0}
          </span>
        )}
      </MfeTitle>
      
      {/* KNOWN ISSUE (§ 10.1): same as mfe_1 - `loaders`/`errors` are
          snapshots with no subscription behind them, so these banners never
          appear. users_mfe has no `onLoadingChange` equivalent either (§ 10.7). */}
      {/* Loading states */}
      {loaders.fetchUsers && <StatusMessage variant="loading"><span>🔄</span> Loading users...</StatusMessage>}
      {loaders.addUser && <StatusMessage variant="loading"><span>➕</span> Adding user...</StatusMessage>}
      {loaders.removeUser && <StatusMessage variant="loading"><span>🗑️</span> Removing user...</StatusMessage>}
      
      {/* Error states */}
      {errors.fetchUsers && <StatusMessage variant="error"><span>❌</span> Error loading users: {errors.fetchUsers}</StatusMessage>}
      {errors.addUser && <StatusMessage variant="error"><span>❌</span> Error adding user: {errors.addUser}</StatusMessage>}
      {errors.removeUser && <StatusMessage variant="error"><span>❌</span> Error removing user: {errors.removeUser}</StatusMessage>}
      
      <UsersList>
        {users?.map((user: any) => (
          <UsersListItem key={user.id}>
            <UserInfo>
              <UserName>👤 {user.name}</UserName>
              {user.email && <UserEmail>✉️ {user.email}</UserEmail>}
            </UserInfo>
            <RemoveButton 
              onClick={() => handleRemove(user.id)}
              disabled={loaders.removeUser}
            >
              🗑️ Remove
            </RemoveButton>
          </UsersListItem>
        ))}
        {(!users || users.length === 0) && (
          <UsersListItem>
            <UserInfo>
              <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                👥 No users found. Add some users to get started!
              </span>
            </UserInfo>
          </UsersListItem>
        )}
      </UsersList>
      
      <InputContainer>
        <Input
          type="text"
          value={newUser}
          onChange={e => setNewUser(e.target.value)}
          placeholder="Enter new user name..."
        />
        <Button 
          onClick={handleAdd} 
          disabled={loaders.addUser || !newUser.trim()}
        >
          ➕ Add User
        </Button>
      </InputContainer>
    </MfeContainer>
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