import { createApp } from 'vue'
import App from './App.vue'
import './styles/app.css'
import './styles/mount.css'
import { telegram } from './lib/telegram'

telegram.init()

createApp(App).mount('#app')
