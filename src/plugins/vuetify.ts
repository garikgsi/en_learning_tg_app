/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import {VCalendar} from 'vuetify/labs/VCalendar'
import {ru} from 'vuetify/locale'

const brandLight = {
  dark: false,
  colors: {
    background: '#FFF8FB',
    surface: '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#FFF2F8',
    'surface-variant': '#EADAE4',
    'on-surface-variant': '#5E4357',
    primary: '#B72F70',
    'primary-darken-1': '#8E1F55',
    'on-primary': '#FFFFFF',
    secondary: '#6E5BD7',
    'secondary-darken-1': '#5643B8',
    'on-secondary': '#FFFFFF',
    error: '#B3261E',
    info: '#6E5BD7',
    success: '#2E7D32',
    warning: '#A65A00',
    'brand-substrate': '#FFF2F8',
    'brand-container': '#4B2142',
    'brand-primary': '#E85D9E',
    'brand-secondary': '#9B8AFB',
  },
}

const brandDark = {
  dark: true,
  colors: {
    background: '#170D16',
    surface: '#241321',
    'surface-bright': '#3B2336',
    'surface-light': '#321C2D',
    'surface-variant': '#5E4357',
    'on-surface-variant': '#E8CEDD',
    primary: '#FF8FC3',
    'primary-darken-1': '#E85D9E',
    'on-primary': '#3B0823',
    secondary: '#B9ACFF',
    'secondary-darken-1': '#9B8AFB',
    'on-secondary': '#251757',
    error: '#FFB4AB',
    info: '#B9ACFF',
    success: '#81C784',
    warning: '#FFB870',
    'brand-substrate': '#FFF2F8',
    'brand-container': '#4B2142',
    'brand-primary': '#E85D9E',
    'brand-secondary': '#9B8AFB',
  },
}

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  components: {
    VCalendar,
  },
  defaults: {
    VBtn: {
      variant: 'outlined',
    },
  },
  locale: {
    locale: 'ru',
    fallback: 'en',
    messages: {
      ru,
    },
  },
  date: {
    locale: {
      ru: 'ru-RU',
    },
  },
  theme: {
    defaultTheme: 'brandLight',
    themes: {
      brandLight,
      brandDark,
    },
  },
})
