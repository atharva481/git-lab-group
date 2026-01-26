import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../supabase'
import { User } from 'lucide-react'

type Student = {
  roll_no: string
  student_name: string
  department: string
  year_of_study: string
}

type Subject = {
  id: number
  semester: number
  subject_code: string
  subject_name: string
  mode_of_study: string
  credits: number
}

type StudentSubject = {
  id: number
  roll_no: string
  subject_id: number
  semester: number
  completed: boolean
  saved: boolean
}

export default function StudentDashboard({ rollNo }: { rollNo: string }) {
  const [student, setStudent] = useState<Student | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([])
  const [activeSemester, setActiveSemester] = useState(1)
  const [showProfile, setShowProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select()
          .eq('roll_no', rollNo)
          .single()
        if (error) throw error
        setStudent(data)
      } catch (err) {
        setError('Failed to fetch student data')
        console.error(err)
      }
    }

    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase.from('subjects').select()
        if (error) throw error
        setSubjects(data || [])
      } catch (err) {
        setError('Failed to fetch subjects')
        console.error(err)
      }
    }

    const fetchStudentSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('student_subjects')
          .select()
          .eq('roll_no', rollNo)
        if (error) throw error
        setStudentSubjects(data || [])
      } catch (err) {
        setError('Failed to fetch student subjects')
        console.error(err)
      }
    }

    fetchStudent()
    fetchSubjects()
    fetchStudentSubjects()

    const subscription = supabase
      .channel('student_subjects')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_subjects', filter: `roll_no=eq.${rollNo}` },
        (payload) => {
          fetchStudentSubjects()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [rollNo])

  const handleSubjectToggle = async (subjectId: number, semester: number) => {
    const isSaved = studentSubjects.some(
      (ss) => ss.semester === semester && ss.saved
    )
    if (isSaved) {
      alert('This semester is saved and cannot be edited.')
      return
    }

    try {
      const existing = studentSubjects.find(
        (ss) => ss.subject_id === subjectId && ss.semester === semester
      )

      if (existing) {
        const { error } = await supabase
          .from('student_subjects')
          .update({ completed: !existing.completed })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('student_subjects')
          .insert([{ roll_no: rollNo, subject_id: subjectId, semester, completed: true, saved: false }])
        if (error) throw error
      }
    } catch (err) {
      setError('Failed to update subject status')
      console.error(err)
    }
  }

  const handleSaveProgress = async (semester: number) => {
    const confirm = window.confirm(`Are you sure you want to save progress for Semester ${semester}? You won't be able to edit it afterward.`)
    if (!confirm) return

    try {
      const { error } = await supabase
        .from('student_subjects')
        .update({ saved: true })
        .eq('roll_no', rollNo)
        .eq('semester', semester)
      if (error) throw error
      alert(`Progress for Semester ${semester} saved successfully!`)
    } catch (err) {
      setError('Failed to save progress')
      console.error(err)
    }
  }

  const getAccessibleSemesters = () => {
    if (!student) return []
    const yearMap: { [key: string]: number[] } = {
      First: [1, 2],
      Second: [1, 2, 3, 4],
      Third: [1, 2, 3, 4, 5, 6],
      Fourth: [1, 2, 3, 4, 5, 6, 7, 8],
    }
    return yearMap[student.year_of_study] || []
  }

  const calculateProgress = (semester: number) => {
    const semesterSubjects = subjects.filter((s) => s.semester === semester)
    const completed = studentSubjects.filter(
      (ss) => ss.semester === semester && ss.completed
    ).length
    return semesterSubjects.length ? Math.min((completed / semesterSubjects.length) * 100, 100) : 0
  }

  const calculateTotalCredits = () => {
    return studentSubjects
      .filter((ss) => ss.completed)
      .reduce((sum, ss) => {
        const subject = subjects.find((s) => s.id === ss.subject_id)
        return sum + (subject?.credits || 0)
      }, 0)
  }

  if (error) return <div className="text-red-500 p-6">Error: {error}</div>
  if (!student) return <div className="p-6 text-[#ffffff]">Loading...</div>

  const accessibleSemesters = getAccessibleSemesters()

  return (
    <motion.div
      className="p-6 min-h-screen bg-[#000000]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="flex justify-between items-center mb-8">
        <motion.h2
          className="text-4xl font-extrabold"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          Welcome to Vidyalankar College
        </motion.h2>
        <motion.button
          className="button bg-soft-red text-[#ffffff] flex items-center gap-2"
          onClick={() => setShowProfile(!showProfile)}
          whileHover={{ scale: 1.1, rotate: 2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <User size={20} color="#ffffff" />
          {showProfile ? 'Hide Profile' : 'Show Profile'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showProfile && (
          <motion.div
            className="card mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-semibold text-soft-red mb-2 flex items-center gap-2">
              <User size={20} color="#ff6b6b" />
              Profile
            </h3>
            <p className="text-[#ffffff]">Name: {student.student_name}</p>
            <p className="text-[#ffffff]">Roll No.: {rollNo}</p>
            <p className="text-[#ffffff]">Department: {student.department}</p>
            <p className="text-[#ffffff]">Year: {student.year_of_study}</p>
            <p className="text-[#ffffff]">Total Credits: {calculateTotalCredits()} / 162</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex space-x-3 mb-8 overflow-x-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem, index) => (
          <motion.button
            key={sem}
            className={`button ${
              accessibleSemesters.includes(sem)
                ? activeSemester === sem
                  ? 'bg-soft-red text-[#ffffff]'
                  : 'bg-[#2c2f33] text-[#ffffff] hover:bg-gray-700'
                : 'bg-gray-700 cursor-not-allowed opacity-50 text-[#ffffff]'
            }`}
            onClick={() => accessibleSemesters.includes(sem) && setActiveSemester(sem)}
            disabled={!accessibleSemesters.includes(sem)}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1, scale: activeSemester === sem ? 1.05 : 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ scale: accessibleSemesters.includes(sem) ? 1.1 : 1, rotate: accessibleSemesters.includes(sem) ? 2 : 0 }}
            whileTap={{ scale: accessibleSemesters.includes(sem) ? 0.9 : 1 }}
          >
            Semester {sem}
          </motion.button>
        ))}
      </div>

      <motion.div
        className="card"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-xl font-semibold mb-4 text-soft-red">Semester {activeSemester}</h3>
        <div className="mb-4">
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <motion.div
              className="bg-soft-red h-4 rounded-full"
              style={{ width: `${calculateProgress(activeSemester)}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${calculateProgress(activeSemester)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            ></motion.div>
          </div>
          <p className="text-[#ffffff] mt-1">{Math.round(calculateProgress(activeSemester))}% Completed</p>
        </div>
        <motion.button
          className="mb-4 button bg-green-600 text-[#ffffff]"
          onClick={() => handleSaveProgress(activeSemester)}
          disabled={studentSubjects.some((ss) => ss.semester === activeSemester && ss.saved)}
          whileHover={{ scale: 1.1, rotate: 2 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          Save Progress
        </motion.button>
        <table className="w-full">
          <thead>
            <motion.tr
              className="bg-gray-700"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <th className="p-2 text-left text-[#ffffff]">Code</th>
              <th className="p-2 text-left text-[#ffffff]">Subject</th>
              <th className="p-2 text-left text-[#ffffff]">Mode</th>
              <th className="p-2 text-left text-[#ffffff]">Credits</th>
              <th className="p-2 text-left text-[#ffffff]">Status</th>
            </motion.tr>
          </thead>
          <tbody>
            {subjects
              .filter((s) => s.semester === activeSemester)
              .map((subject) => {
                const studentSubject = studentSubjects.find(
                  (ss) => ss.subject_id === subject.id && ss.semester === activeSemester
                )
                const isSaved = studentSubjects.some(
                  (ss) => ss.semester === activeSemester && ss.saved
                )
                return (
                  <motion.tr
                    key={subject.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <td className="p-2 text-[#ffffff]">{subject.subject_code}</td>
                    <td className="p-2 text-[#ffffff]">{subject.subject_name}</td>
                    <td className="p-2 text-[#ffffff]">{subject.mode_of_study}</td>
                    <td className="p-2 text-[#ffffff]">{subject.credits}</td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={studentSubject?.completed || false}
                        onChange={() => handleSubjectToggle(subject.id, activeSemester)}
                        disabled={isSaved}
                        className="h-5 w-5 text-soft-red"
                      />
                    </td>
                  </motion.tr>
                )
              })}
          </tbody>
        </table>
      </motion.div>
    </motion.div>
  )
}