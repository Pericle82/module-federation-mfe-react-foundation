/**
 * The only place in the whole system that knows a backend URL
 * (COMPREHENSIVE_GUIDE.md § 1). Thin wrappers over `fetch` against the
 * json-server mock on :4000 - no state, no React, no error surfacing beyond a
 * console message.
 *
 * Read operations swallow failures and resolve to `[]`, so a backend that is
 * down renders an empty list instead of breaking the MFE. Writes let the error
 * propagate: useApi turns it into an entry in `errors`.
 */

export function fetchItems(): Promise<any[]> {
    return fetch('http://localhost:4000/items')
        .then(res => res.json())
        .catch((e) => {
            console.error('Failed to fetch items:', e);
            return []
        });
}

// Writes return immediately, without refetching: the follow-up GET is
// service_mfe's job (§ 6.2), which is what keeps every MFE in sync.
export function addItemImmediate(item: any): Promise<any> {
    return fetch('http://localhost:4000/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
    })
        .then(res => res.json()); // Return the created item with ID
}

export function removeItemImmediate(id: string | number): Promise<void> {
    return fetch(`http://localhost:4000/items/${id}`, {
        method: 'DELETE'
    })
        .then(() => {}); // No refetch
}

// Server-side search: json-server's `?q=` does a full-text match on the record
// (§ 6.3). mfe_2 re-filters client-side afterwards, on `name` only.
export function filterItems(query: string): Promise<any[]> {
    return fetch(`http://localhost:4000/items?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .catch((e) => {
            console.error('Failed to filter items:', e);
            return [];
        });
}

// Users API functions
export function fetchUsers(): Promise<any[]> {
    return fetch('http://localhost:4000/users')
        .then(res => res.json())
        .catch((e) => {
            console.error('Failed to fetch users:', e);
            return []
        });
}

export function addUserImmediate(user: any): Promise<any> {
    return fetch('http://localhost:4000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    })
        .then(res => res.json()); // Return the created user with ID
}

export function removeUserImmediate(id: string | number): Promise<void> {
    return fetch(`http://localhost:4000/users/${id}`, {
        method: 'DELETE'
    })
        .then(() => {}); // No refetch
}

export function filterUsers(query: string): Promise<any[]> {
    return fetch(`http://localhost:4000/users?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .catch((e) => {
            console.error('Failed to filter users:', e);
            return [];
        });
}

