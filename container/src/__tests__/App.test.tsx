import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock mfe_1 mount
jest.mock('mfe_1/mount', () => ({
  mount: (el: HTMLElement, options: any) => {
    // Simula il rendering del componente mfe_1
    const Comp = () => (
      <div data-testid="mfe1-list">
        <ul>
          {options.data.map((item: any) => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
        <button onClick={() => options.onAdd({ name: 'Test' })}>Aggiungi</button>
        <button onClick={() => options.onRemove(options.data[0]?.id)}>Elimina</button>
      </div>
    );
    render(<Comp />, { container: el });
    return {
      unmount: () => {},
      update: (newData: any[]) => {},
    };
  },
}));

// Mock service_mfe API
const mockAddItem = jest.fn(async (item) => [{ id: 1, name: item.name }]);
const mockRemoveItem = jest.fn(async (id) => []);

jest.mock('service_mfe/mount', () => ({
  mount: jest.fn(),
  addItem: mockAddItem,
  removeItem: mockRemoveItem,
  fetchItems: jest.fn(async () => [{ id: 1, name: 'Item1' }]),
}));

// Import App dopo i mock
import App from '../bootstrap';

describe('Container App integration', () => {
  test('visualizza la lista e aggiunge un oggetto', async () => {
    render(<App />);
    // Simula click su "Aggiungi"
    await waitFor(() => {
      const addBtn = screen.getByText('Aggiungi');
      fireEvent.click(addBtn);
    });
    expect(mockAddItem).toHaveBeenCalledWith({ name: 'Test' });
    // La lista deve mostrare l'oggetto aggiunto
    await waitFor(() => {
      expect(screen.getByTestId('mfe1-list')).toHaveTextContent('Test');
    });
  });

  test('rimuove un oggetto dalla lista', async () => {
    render(<App />);
    // Simula click su "Elimina"
    await waitFor(() => {
      const removeBtn = screen.getByText('Elimina');
      fireEvent.click(removeBtn);
    });
    expect(mockRemoveItem).toHaveBeenCalled();
    // La lista deve essere vuota
    await waitFor(() => {
      expect(screen.getByTestId('mfe1-list')).not.toHaveTextContent('Item1');
    });
  });
});
