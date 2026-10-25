import { BrowserAPI } from '../preload/browser-preload';

declare global {
  interface Window {
    browserAPI: BrowserAPI;
  }

  const __APP_VERSION__: string;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

export {};

