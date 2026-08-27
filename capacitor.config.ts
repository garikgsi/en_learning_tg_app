/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.enlearning.app',
  appName: 'English Learning',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['sound', 'alert'],
    },
  },
}

export default config
