import { createApp } from 'vue'
import App from './App.vue'
import './styles/tokens.css'
import './styles/teacher.css'
import './styles/desktop.css'
import { telegram } from './lib/telegram'

telegram.init()

createApp(App).mount('#app')
