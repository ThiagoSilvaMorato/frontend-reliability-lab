import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import { initLabFromUrl } from '@/mocks/lab'
import { startWebVitals } from '@/observability/webVitals'
import '@/styles/global.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

// A shared Lab link must be active before the first request, so this runs before rendering.
startWebVitals()

void initLabFromUrl(window.location.search).then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
