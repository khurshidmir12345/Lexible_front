import { createApp } from 'vue'
import App from './App.vue'
// v1 stylesheet still dresses the screens that have not been converted yet;
// tokens.css comes after so the new language wins where they overlap.
import './styles/app.css'
import './styles/tokens.css'
import { telegram } from './lib/telegram'

telegram.init()

createApp(App).mount('#app')
