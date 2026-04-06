declare module '*.css';

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => {
        card: () => Promise<{
          attach: (element: HTMLElement) => Promise<void>;
          tokenize: () => Promise<{ status: string; token?: string }>;
        }>;
      };
    };
  }
}

export {};
