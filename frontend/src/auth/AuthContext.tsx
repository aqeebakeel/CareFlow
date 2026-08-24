import { createContext, useContext, useState, type ReactNode } from 'react'

export type Role = 'ADMIN' | 'PATIENT' | 'DOCTOR'
type AuthContextValue = { role: Role; setRole: (role: Role) => void }
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('PATIENT')
  return <AuthContext.Provider value={{ role, setRole }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}