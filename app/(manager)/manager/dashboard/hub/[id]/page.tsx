import Client from './ManagerIdeaDetailClient'
import { ideaIds } from '@/lib/mock/static-params'

export function generateStaticParams() {
  return ideaIds().map((id) => ({ id }))
}

export default function Page() {
  return <Client />
}
