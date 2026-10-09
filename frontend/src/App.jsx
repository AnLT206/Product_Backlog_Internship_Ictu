import { AuthProvider } from './context/AuthContext'
import { SystemSettingsProvider } from './context/SystemSettingsContext'
import AppRoutes from './routes/index.jsx'

function App() {
  return (
    <AuthProvider>
      <SystemSettingsProvider>
        <AppRoutes />
      </SystemSettingsProvider>
    </AuthProvider>
  )
}

export default App
