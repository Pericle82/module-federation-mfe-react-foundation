import { useState } from "react";
import { fetchItems, addItem, removeItem } from "./api";

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
            const updated = await addItem({ name: newItem });
            console.log('Item added:', updated);
            return updated;
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
            const updated = await removeItem(id);
            console.log('Item removed:', updated);
            return updated;
        } catch (error) {
            console.error('Error removing item:', error);
            throw error;
        } finally {
            setLoaders(prev => new Map(prev).set('remove', false));
        }
    };

    return {loaders, addItemHandler, removeItemHandler, fetchItemsHandler };
}
