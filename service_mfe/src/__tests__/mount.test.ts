import { mount, ServiceMfeApi } from '../mount';

// Mock DOM element for testing
const createMockElement = () => {
  const div = document.createElement('div');
  div.id = 'service-mfe-test';
  return div;
};

describe('Service MFE Mount Function', () => {
  let mockElement: HTMLDivElement;
  let serviceApi: ServiceMfeApi;

  beforeEach(() => {
    mockElement = createMockElement();
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    if (serviceApi) {
      serviceApi.unmount();
    }
    if (mockElement && mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement);
    }
  });

  test('should mount successfully and return API', () => {
    serviceApi = mount(mockElement);
    
    expect(serviceApi).toBeDefined();
    expect(typeof serviceApi.fetchItems).toBe('function');
    expect(typeof serviceApi.filterItems).toBe('function');
    expect(typeof serviceApi.addItem).toBe('function');
    expect(typeof serviceApi.removeItem).toBe('function');
    expect(typeof serviceApi.unmount).toBe('function');
  });

  test('should throw error when element is null', () => {
    expect(() => mount(null as any)).toThrow('Mount element is required');
  });

  test('should handle unmount gracefully', () => {
    serviceApi = mount(mockElement);
    expect(() => serviceApi.unmount()).not.toThrow();
  });

  test('should reuse same root for same element', () => {
    const api1 = mount(mockElement);
    api1.unmount();
    
    const api2 = mount(mockElement);
    expect(api2).toBeDefined();
    api2.unmount();
  });
});

// Integration test example
describe('Service MFE API Integration', () => {
  let mockElement: HTMLDivElement;
  let serviceApi: ServiceMfeApi;

  beforeEach(() => {
    mockElement = createMockElement();
    document.body.appendChild(mockElement);
    serviceApi = mount(mockElement);
  });

  afterEach(() => {
    serviceApi.unmount();
    document.body.removeChild(mockElement);
  });

  test('should handle API errors gracefully', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    try {
      await serviceApi.fetchItems();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network error');
    }
  });

  test('should validate input parameters', async () => {
    await expect(serviceApi.addItem(null)).rejects.toThrow('Item is required');
    await expect(serviceApi.removeItem('')).rejects.toThrow('Item ID is required');
  });
});
