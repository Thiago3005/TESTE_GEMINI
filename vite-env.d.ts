/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly BASE_URL: string;
    // Add other environment variables here if you have more
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  