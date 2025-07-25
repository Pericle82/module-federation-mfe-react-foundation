import { useState, useEffect } from "react";

export function fetchItems(): Promise<any[]> {
    return fetch('http://localhost:4000/items')
        .then(res => res.json())
        .catch((e) => {
            console.error('Failed to fetch items:', e);
            return []
        });
}

export function addItem(item: any): Promise<any[]> {
    return fetch('http://localhost:4000/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    })
        .then(() => fetchItems());
}

export function removeItem(id: string | number): Promise<any[]> {
    return fetch(`http://localhost:4000/items/${id}`, {
        method: 'DELETE'
    })
        .then(() => fetchItems());
}

export function filterItems(query: string): Promise<any[]> {
    return fetch(`http://localhost:4000/items?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .catch((e) => {
            console.error('Failed to filter items:', e);
            return [];
        });
}

