import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './base.css'
import './style.css'
import './theme.css'
import './campus/campus.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
