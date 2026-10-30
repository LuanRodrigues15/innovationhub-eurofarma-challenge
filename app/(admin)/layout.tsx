import RoleGuard from '@/components/shared/RoleGuard'

const ALLOW = ['admin' as const]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allow={ALLOW}>{children}</RoleGuard>
}
