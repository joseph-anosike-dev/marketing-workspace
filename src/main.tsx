import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { seedDirectory } from './data/seed/seedDirectory'
import './index.css'

async function start() {
  try {
    await seedDirectory()
  } catch (error) {
    console.error('Could not load the tools directory', error)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  )
}

void start()