import IdeaDetailRedirect from './IdeaRedirect'
import { ideaIds } from '@/lib/mock/static-params'

export function generateStaticParams() {
  return ideaIds().map((id) => ({ id }))
}

export default function Page({ params }: { params: { id: string } }) {
  return <IdeaDetailRedirect id={params.id} />
}
