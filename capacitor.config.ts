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
  plugins: {
    CapacitorAssets: {
      iconBackgroundColor: '#E6F4FE',
      iconBackgroundColorDark: '#0a0a0f',
    },
  },
};

export default config;
