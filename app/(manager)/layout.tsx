import RoleGuard from '@/components/shared/RoleGuard'

const ALLOW = ['gestor' as const]

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={ALLOW}>{children}</RoleGuard>
}
