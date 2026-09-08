import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './styles/base.css'
import './styles/training.css'
import './styles/persistence.css'
import './styles/pwa.css'
import { registerPwa } from './pwa/register'

createApp(App).use(createPinia()).use(router).mount('#app')
registerPwa()
