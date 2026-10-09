import './assets/main.css'
import './assets/spectrum.css'
import './assets/imagery.css'
import './assets/product.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
