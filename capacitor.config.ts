import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dorm.app',
  appName: 'Dorm',
  webDir: 'frontend/dist',

  ios: {
    contentInset: 'always',
    scheme: 'dorm',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
