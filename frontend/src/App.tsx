import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import { useAuth, type Role } from './auth/AuthContext'
import AdminDashboard from './pages/AdminDashboard'
import AdminLeaveManagement from './pages/AdminLeaveManagement'
import PatientDoctorSearch from './pages/PatientDoctorSearch'
import PatientBookingCalendar from './pages/PatientBookingCalendar'
import PatientSymptomIntake from './pages/PatientSymptomIntake'
import DoctorSchedule from './pages/DoctorSchedule'
import DoctorConsultation from './pages/DoctorConsultation'

const roleHome: Record<Role, string> = { ADMIN: '/admin', PATIENT: '/patient', DOCTOR: '/doctor' }
const card = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'

function RoleGate({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { role } = useAuth()
  return roles.includes(role) ? <>{children}</> : <Navigate to={roleHome[role]} replace />
}

function Layout({ children }: { children: React.ReactNode }) {
  const { role, setRole } = useAuth()
  
  if (role === 'ADMIN') {
    return (
      <div className="min-h-screen bg-pink-50">
        <header className="bg-white border-b-2 border-pink-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <span className="font-bold text-xl text-pink-700">CareFlow Admin</span>
              <nav className="flex gap-4">
                <NavLink 
                  to="/admin" 
                  end
                  className={({ isActive }) => `px-3 py-2 rounded-md font-medium transition-colors ${isActive ? 'bg-pink-100 text-pink-900' : 'text-pink-600 hover:bg-pink-50 hover:text-pink-800'}`}
                >
                  Dashboard
                </NavLink>
                <NavLink 
                  to="/admin/leaves" 
                  className={({ isActive }) => `px-3 py-2 rounded-md font-medium transition-colors ${isActive ? 'bg-pink-100 text-pink-900' : 'text-pink-600 hover:bg-pink-50 hover:text-pink-800'}`}
                >
                  Leave Management
                </NavLink>
              </nav>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-pink-800">
                Demo role:
                <select 
                  aria-label="Switch demo role" 
                  value={role} 
                  onChange={(event) => setRole(event.target.value as Role)} 
                  className="ml-2 rounded-md border border-pink-200 bg-white px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 text-pink-900"
                >
                  <option>ADMIN</option>
                  <option>PATIENT</option>
                  <option>DOCTOR</option>
                </select>
              </label>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  const links = role === 'PATIENT' ? [['Find doctors', '/patient'], ['Book a slot', '/patient/book'], ['Symptoms', '/patient/symptoms']] : [['Schedule', '/doctor'], ['Pre-visit', '/doctor/pre-visit'], ['Post-visit', '/doctor/post-visit']]
  
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <NavLink to={roleHome[role]} className="font-semibold text-sky-800">CareFlow</NavLink>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">
              Demo role
              <select aria-label="Switch demo role" value={role} onChange={(event) => setRole(event.target.value as Role)} className="ml-2 rounded border border-slate-300 bg-white px-2 py-1">
                <option>ADMIN</option>
                <option>PATIENT</option>
                <option>DOCTOR</option>
              </select>
            </label>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-6 py-8 md:grid-cols-[13rem_1fr]">
        <nav aria-label="Portal navigation" className="flex gap-2 md:flex-col">
          {links.map(([label, path]) => (
            <NavLink key={path} to={path} className={({ isActive }) => `rounded px-3 py-2 text-sm ${isActive ? 'bg-sky-100 font-medium text-sky-800' : 'text-slate-600 hover:bg-slate-100'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main>{children}</main>
      </div>
    </div>
  )
}

function Form({ fields, action, textarea = false }: { fields: string[]; action: string; textarea?: boolean }) { return <form onSubmit={(event) => event.preventDefault()} className="grid gap-4">{fields.map((field) => <label key={field} className="text-sm font-medium text-slate-700">{field}{textarea && field.toLowerCase().includes('symptom') || textarea && field.toLowerCase().includes('notes') ? <textarea className="mt-1 min-h-28 w-full rounded border border-slate-300 p-2" /> : <input className="mt-1 w-full rounded border border-slate-300 p-2" />}</label>)}<button className="w-fit rounded bg-sky-700 px-4 py-2 text-white">{action}</button></form> }
function Page({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) { return <section><h1 className="text-2xl font-semibold text-slate-900">{title}</h1><p className="mt-2 mb-6 text-slate-600">{intro}</p>{children}</section> }

export default function App() { return <Routes><Route path="/" element={<HomeRedirect />} /><Route path="/admin" element={<RoleGate roles={['ADMIN']}><Layout><AdminDashboard /></Layout></RoleGate>} /><Route path="/admin/leaves" element={<RoleGate roles={['ADMIN']}><Layout><AdminLeaveManagement /></Layout></RoleGate>} /><Route path="/patient" element={<RoleGate roles={['PATIENT']}><Layout><PatientDoctorSearch /></Layout></RoleGate>} /><Route path="/patient/book/:doctorId" element={<RoleGate roles={['PATIENT']}><Layout><PatientBookingCalendar /></Layout></RoleGate>} /><Route path="/patient/symptoms/:appointmentId" element={<RoleGate roles={['PATIENT']}><Layout><PatientSymptomIntake /></Layout></RoleGate>} /><Route path="/doctor" element={<RoleGate roles={['DOCTOR']}><Layout><DoctorSchedule /></Layout></RoleGate>} /><Route path="/doctor/consultation/:appointmentId" element={<RoleGate roles={['DOCTOR']}><Layout><DoctorConsultation /></Layout></RoleGate>} /><Route path="*" element={<HomeRedirect />} /></Routes> }
function HomeRedirect() { const { role } = useAuth(); return <Navigate to={roleHome[role]} replace /> }