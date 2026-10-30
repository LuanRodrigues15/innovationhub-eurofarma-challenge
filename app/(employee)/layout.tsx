import RoleGuard from '@/components/shared/RoleGuard'

const ALLOW = ['funcionario' as const, 'gestor' as const]

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={ALLOW}>{children}</RoleGuard>
}
