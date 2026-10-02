import { useNavigate } from 'react-router-dom'
import InternTrainingMaterials from './components/InternTrainingMaterials'
import './InternDashboardPage.css'

export default function InternTrainingPage() {
  const navigate = useNavigate()

  return (
    <div className="intern-dashboard-container">
      <InternTrainingMaterials
        onNavigateToReports={() => navigate('/intern/reports')}
      />
    </div>
  )
}
