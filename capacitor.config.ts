import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockai.ultra',
  appName: 'StockAI Ultra',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
