import { useState } from "react";
import { fetchItems, addItemImmediate, removeItemImmediate } from "./api";

export const useAPI = () => {

    const [loaders, setLoaders] = useState<Map<string, boolean>>(new Map());
    const fetchItemsHandler = async () => {
        setLoaders(prev => new Map(prev).set('fetch', true));
        try {
            const data = await fetchItems();
            return data;
        } catch (error) {
            console.error('Error fetching items:', error);
            throw error;
        } finally {
            setLoaders(prev => new Map(prev).set('fetch', false));
        }
    };

    const addItemHandler = async (newItem: string) => {
        if (!newItem.trim()) return;
        setLoaders(prev => new Map(prev).set('add', true));
        try {
            const createdItem = await addItemImmediate({ name: newItem });
            console.log('Item added successfully:', createdItem);
            // Return the created item - ServiceContext will handle optimistic updates
            return [createdItem]; // Return array with the new item
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        } finally {
            setLoaders(prev => new Map(prev).set('add', false));
        }
    };

    const removeItemHandler = async (id: string) => {
        setLoaders(prev => new Map(prev).set('remove', true));
        try {
            await removeItemImmediate(id);
            console.log('Item removed successfully');
            // Don't refetch here - let the ServiceContext handle the state update
            return []; // Return empty array to satisfy the interface
        } catch (error) {
            console.error('Error removing item:', error);
            throw error;
        } finally {
            setLoaders(prev => new Map(prev).set('remove', false));
        }
    };

    return {loaders, addItemHandler, removeItemHandler, fetchItemsHandler };
}
