import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../supabase'

export default function Login() {
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const table = role === 'student' ? 'students' : 'teachers'
      const idField = role === 'student' ? 'roll_no' : 'teacher_id'

      const { data, error } = await supabase
        .from(table)
        .select()
        .eq(idField, id)
        .eq('password', password)
        .single()

      if (error) throw error
      if (!data) {
        setError('Invalid credentials')
        return
      }

      localStorage.setItem('user', JSON.stringify({ role, id }))
      navigate('/dashboard')
    } catch (err) {
      setError('Login failed. Please try again.')
      console.error(err)
    }
  }

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-[#000000]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <motion.div
        className="card max-w-md w-full"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-3xl font-bold mb-6 text-center">Welcome to Vidyalankar Bank of Credits</h2>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block font-medium mb-1">Role</label>
            <select
              className="w-full p-2 rounded"
              value={role}
              onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">
              {role === 'student' ? 'Roll No.' : 'Teacher ID'}
            </label>
            <input
              type="text"
              className="w-full p-2 rounded"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <motion.button
            type="submit"
            className="w-full button bg-soft-red text-[#ffffff]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Login
          </motion.button>
        </form>
        <p className="mt-4 text-center text-[#ffffff]">
          Don't have an account?{' '}
          <a href="/signup" className="text-soft-red hover:underline">
            Sign Up
          </a>
        </p>
      </motion.div>
    </motion.div>
  )
}