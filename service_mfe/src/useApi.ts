import { useState } from "react";
import { fetchItems, addItemImmediate, removeItemImmediate, filterItems, fetchUsers, addUserImmediate, removeUserImmediate, filterUsers } from "./api";

export const useAPI = () => {
    const [loaders, setLoaders] = useState({
        fetchItems: false,
        addItem: false,
        removeItem: false,
        filterItems: false,
        fetchUsers: false,
        addUser: false,
        removeUser: false,
        filterUsers: false,
    });

    const [errors, setErrors] = useState({
        fetchItems: null as string | null,
        addItem: null as string | null,
        removeItem: null as string | null,
        filterItems: null as string | null,
        fetchUsers: null as string | null,
        addUser: null as string | null,
        removeUser: null as string | null,
        filterUsers: null as string | null,
    });

    const fetchItemsHandler = async () => {
        setLoaders(prev => ({ ...prev, fetchItems: true }));
        setErrors(prev => ({ ...prev, fetchItems: null }));
        try {
            const data = await fetchItems();
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error fetching items';
            console.error('Error fetching items:', error);
            setErrors(prev => ({ ...prev, fetchItems: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, fetchItems: false }));
        }
    };

    const addItemHandler = async (newItem: string) => {
        if (!newItem.trim()) return;
        setLoaders(prev => ({ ...prev, addItem: true }));
        setErrors(prev => ({ ...prev, addItem: null }));
        try {
            const createdItem = await addItemImmediate({ name: newItem });
            console.log('Item added successfully:', createdItem);
            // Return the created item - ServiceContext will handle optimistic updates
            return [createdItem]; // Return array with the new item
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error adding item';
            console.error('Error adding item:', error);
            setErrors(prev => ({ ...prev, addItem: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, addItem: false }));
        }
    };

    const removeItemHandler = async (id: string) => {
        setLoaders(prev => ({ ...prev, removeItem: true }));
        setErrors(prev => ({ ...prev, removeItem: null }));
        try {
            await removeItemImmediate(id);
            console.log('Item removed successfully');
            // Don't refetch here - let the ServiceContext handle the state update
            return []; // Return empty array to satisfy the interface
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error removing item';
            console.error('Error removing item:', error);
            setErrors(prev => ({ ...prev, removeItem: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, removeItem: false }));
        }
    };

    const filterItemsHandler = async (query: string) => {
        setLoaders(prev => ({ ...prev, filterItems: true }));
        setErrors(prev => ({ ...prev, filterItems: null }));
        try {
            if (!query) {
                return fetchItemsHandler(); // Return all items if no query
            }
            const data = await filterItems(query);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error filtering items';
            console.error('Error filtering items:', error);
            setErrors(prev => ({ ...prev, filterItems: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, filterItems: false }));
        }
    };

    // Users handlers
    const fetchUsersHandler = async () => {
        setLoaders(prev => ({ ...prev, fetchUsers: true }));
        setErrors(prev => ({ ...prev, fetchUsers: null }));
        try {
            const data = await fetchUsers();
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error fetching users';
            console.error('Error fetching users:', error);
            setErrors(prev => ({ ...prev, fetchUsers: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, fetchUsers: false }));
        }
    };

    const addUserHandler = async (newUser: string) => {
        if (!newUser.trim()) return;
        setLoaders(prev => ({ ...prev, addUser: true }));
        setErrors(prev => ({ ...prev, addUser: null }));
        try {
            const createdUser = await addUserImmediate({ name: newUser, email: `${newUser.toLowerCase().replace(/\s+/g, '')}@example.com` });
            console.log('User added successfully:', createdUser);
            return [createdUser]; // Return array with the new user
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error adding user';
            console.error('Error adding user:', error);
            setErrors(prev => ({ ...prev, addUser: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, addUser: false }));
        }
    };

    const removeUserHandler = async (id: string) => {
        setLoaders(prev => ({ ...prev, removeUser: true }));
        setErrors(prev => ({ ...prev, removeUser: null }));
        try {
            await removeUserImmediate(id);
            console.log('User removed successfully');
            return []; // Return empty array to satisfy the interface
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error removing user';
            console.error('Error removing user:', error);
            setErrors(prev => ({ ...prev, removeUser: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, removeUser: false }));
        }
    };

    const filterUsersHandler = async (query: string) => {
        setLoaders(prev => ({ ...prev, filterUsers: true }));
        setErrors(prev => ({ ...prev, filterUsers: null }));
        try {
            if (!query) {
                return fetchUsersHandler(); // Return all users if no query
            }
            const data = await filterUsers(query);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error filtering users';
            console.error('Error filtering users:', error);
            setErrors(prev => ({ ...prev, filterUsers: errorMessage }));
            throw error;
        } finally {
            setLoaders(prev => ({ ...prev, filterUsers: false }));
        }
    };

    return { 
        loaders, 
        errors, 
        addItemHandler, 
        removeItemHandler, 
        fetchItemsHandler,
        filterItemsHandler,
        addUserHandler,
        removeUserHandler,
        fetchUsersHandler,
        filterUsersHandler
    };
}
