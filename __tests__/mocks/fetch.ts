import { jest } from '@jest/globals';

export function createMockFetch() {
  // Type the mock to match fetch signature
  const mockFetch = jest.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>();

  return {
    mock: mockFetch,

    mockSuccess: (data: unknown) => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data),
      } as Response);
    },

    mockError: (status: number, message: string) => {
      mockFetch.mockResolvedValue({
        ok: false,
        status,
        statusText: message,
        json: async () => ({ message }),
        text: async () => JSON.stringify({ message }),
      } as Response);
    },

    mockNetworkError: () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
    },

    install: () => {
      global.fetch = mockFetch as unknown as typeof fetch;
    },
  };
}
