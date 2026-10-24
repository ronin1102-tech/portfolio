import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { analytics } from './app/lib/analytics'
import './styles.css'

// No-op until the project token/host are configured and consent is granted.
void analytics.init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
