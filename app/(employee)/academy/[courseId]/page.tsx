import Client from './CourseDetailClient'
import { courseIds } from '@/lib/mock/static-params'

export function generateStaticParams() {
  return courseIds().map((courseId) => ({ courseId }))
}

export default function Page({ params }: { params: { courseId: string } }) {
  return <Client params={params} />
}
