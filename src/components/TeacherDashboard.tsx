import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../supabase'
import { User } from 'lucide-react'
import jsPDF from 'jspdf'

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

export default function TeacherDashboard({ teacherId }: { teacherId: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reportGenerated, setReportGenerated] = useState<string | null>(null)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase.from('students').select()
        if (error) throw error
        setStudents(data || [])
      } catch (err) {
        setError('Failed to fetch students')
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

    fetchStudents()
    fetchSubjects()

    const subscription = supabase
      .channel('student_subjects')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_subjects' },
        (payload) => {
          if (selectedStudent) {
            fetchStudentSubjects(selectedStudent)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [selectedStudent])

  const fetchStudentSubjects = async (rollNo: string) => {
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

  const handleSubjectToggle = async (subjectId: number, semester: number) => {
    if (!selectedStudent) return
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
          .insert([{ roll_no: selectedStudent, subject_id: subjectId, semester, completed: true, saved: false }])
        if (error) throw error
      }
    } catch (err) {
      setError('Failed to update subject status')
      console.error(err)
    }
  }

  const calculateTotalCredits = () => {
    return studentSubjects
      .filter((ss) => ss.completed)
      .reduce((sum, ss) => {
        const subject = subjects.find((s) => s.id === ss.subject_id)
        return sum + (subject?.credits || 0)
      }, 0)
  }

  const calculateProgress = (semester: number) => {
    const semesterSubjects = subjects.filter((s) => s.semester === semester)
    const completed = studentSubjects.filter(
      (ss) => ss.semester === semester && ss.completed
    ).length
    return semesterSubjects.length ? Math.min((completed / semesterSubjects.length) * 100, 100) : 0
  }

  const generateReport = () => {
    if (!selectedStudent) {
      alert('Please select a student.')
      return
    }

    const student = students.find((s) => s.roll_no === selectedStudent)
    if (!student) return

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.setFillColor(0, 0, 0)
    doc.rect(0, 0, 210, 297, 'F')
    doc.text('Student Performance Report', 20, 20)
    doc.setFontSize(12)
    doc.setTextColor(224, 224, 224)
    doc.text(`Name: ${student.student_name}`, 20, 30)
    doc.text(`Roll No.: ${student.roll_no}`, 20, 35)
    doc.text(`Department: ${student.department}`, 20, 40)
    doc.text(`Year: ${student.year_of_study}`, 20, 45)
    doc.text(`Total Credits: ${calculateTotalCredits()} / 162`, 20, 50)

    let y = 60
    for (let semester = 1; semester <= 8; semester++) {
      const semesterSubjects = subjects.filter((s) => s.semester === semester)
      const progress = calculateProgress(semester)

      doc.setTextColor(77, 171, 247)
      doc.text(`Semester ${semester}`, 20, y)
      y += 5
      doc.setTextColor(224, 224, 224)
      doc.text(`Progress: ${Math.round(progress)}%`, 20, y)
      y += 5
      doc.text(`Credits: ${semesterSubjects.reduce((sum, s) => sum + (studentSubjects.find(ss => ss.subject_id === s.id && ss.completed) ? s.credits : 0), 0)}`, 20, y)
      y += 5
      semesterSubjects.forEach((subject) => {
        const isCompleted = studentSubjects.some(
          (ss) => ss.subject_id === subject.id && ss.completed
        )
        doc.text(`${subject.subject_code}: ${subject.subject_name} ${isCompleted ? '(Completed)' : ''}`, 30, y)
        y += 5
      })
      y += 5
    }

    doc.save(`${student.student_name}_report.pdf`)
    setReportGenerated(selectedStudent)
  }

  if (error) return <div className="text-red-500 p-6">Error: {error}</div>

  return (
    <motion.div
      className="p-6 min-h-screen bg-[#000000]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <motion.h2
        className="text-4xl font-extrabold mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        Welcome to Vidyalankar College
      </motion.h2>
      <motion.div
        className="card mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <label className="block font-medium mb-2 flex items-center gap-2">
          <User size={20} color="#4dabf7" />
          Select Student
        </label>
        <select
          className="w-full p-2 rounded"
          onChange={(e) => {
            setSelectedStudent(e.target.value)
            setReportGenerated(null)
            if (e.target.value) fetchStudentSubjects(e.target.value)
          }}
        >
          <option value="">Select a student</option>
          {students.map((student) => (
            <option key={student.roll_no} value={student.roll_no}>
              {student.student_name} ({student.roll_no})
            </option>
          ))}
        </select>
      </motion.div>

      {selectedStudent && (
        <motion.div
          className="card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-cool-blue">Student Report</h3>
            <motion.button
              className={`button ${reportGenerated === selectedStudent ? 'bg-gray-700 cursor-not-allowed text-[#ffffff]' : 'bg-cool-blue text-[#ffffff]'}`}
              onClick={generateReport}
              disabled={reportGenerated === selectedStudent}
              whileHover={{ scale: reportGenerated === selectedStudent ? 1 : 1.1, rotate: reportGenerated === selectedStudent ? 0 : 2 }}
              whileTap={{ scale: reportGenerated === selectedStudent ? 1 : 0.9 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              Download Report
            </motion.button>
          </div>
          <p className="text-[#ffffff] mb-4">Total Credits: {calculateTotalCredits()}</p>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
            <div key={semester} className="mt-4">
              <h4 className="text-lg font-semibold text-cool-blue">Semester {semester}</h4>
              <p className="text-[#ffffff] mb-2">{Math.round(calculateProgress(semester))}% Completed</p>
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
                    <th className="p-2 text-left text-[#ffffff]">Completed</th>
                    <th className="p-2 text-left text-[#ffffff]">Saved</th>
                  </motion.tr>
                </thead>
                <tbody>
                  {subjects
                    .filter((s) => s.semester === semester)
                    .map((subject) => {
                      const studentSubject = studentSubjects.find(
                        (ss) => ss.subject_id === subject.id && ss.semester === semester
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
                              onChange={() => handleSubjectToggle(subject.id, semester)}
                              className="h-5 w-5 text-cool-blue"
                            />
                          </td>
                          <td className="p-2 text-[#ffffff]">{studentSubject?.saved ? 'Yes' : 'No'}</td>
                        </motion.tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}