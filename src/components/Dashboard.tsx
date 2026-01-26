import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentDashboard from './StudentDashboard'
import TeacherDashboard from './TeacherDashboard'

export default function Dashboard() {
  const [user, setUser] = useState<{ role: string; id: string } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      navigate('/login')
      return
    }
    setUser(JSON.parse(userData))
  }, [navigate])

  if (!user) return null

  return user.role === 'student' ? (
    <StudentDashboard rollNo={user.id} />
  ) : (
    <TeacherDashboard teacherId={user.id} />
  )
}