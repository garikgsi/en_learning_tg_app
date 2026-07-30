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
  theme: {
    defaultTheme: 'dark',
  },
})
