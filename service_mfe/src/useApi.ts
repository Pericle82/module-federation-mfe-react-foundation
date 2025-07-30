import { useState } from "react";
import { fetchItems, addItemImmediate, removeItemImmediate, filterItems } from "./api";

export const useAPI = () => {
    const [loaders, setLoaders] = useState({
        fetchItems: false,
        addItem: false,
        removeItem: false,
        filterItems: false,
    });

    const [errors, setErrors] = useState({
        fetchItems: null as string | null,
        addItem: null as string | null,
        removeItem: null as string | null,
        filterItems: null as string | null,
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

    return { 
        loaders, 
        errors, 
        addItemHandler, 
        removeItemHandler, 
        fetchItemsHandler,
        filterItemsHandler 
    };
}
