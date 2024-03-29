import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'go.gogol.horse',
  appName: 'SpeciesID',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
  android: {
    allowMixedContent: true
  },
};

export default config;
