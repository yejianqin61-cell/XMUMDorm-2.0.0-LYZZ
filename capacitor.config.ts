import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yejianqin.xmum.dorm',
  appName: '厦马小筑',
  webDir: 'frontend-app/dist',

  ios: {
    contentInset: 'always',
    scheme: 'dorm',
  },
  android: {
    // Production API and uploaded media are HTTPS; keep cleartext traffic off.
    allowMixedContent: false,
  },
  plugins: {
    CapacitorAssets: {
      iconBackgroundColor: '#E6F4FE',
      iconBackgroundColorDark: '#0a0a0f',
      splashBackgroundColor: '#E6F4FE',
      splashBackgroundColorDark: '#0a0a0f',
    },
  },
};

export default config;
