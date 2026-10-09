import { useState } from 'react'
import { Search, SearchX } from 'lucide-react'
import { CoursePageHeader } from '@/layouts/CourseLayout'
import { useCourseContext } from '@/layouts/courseContext'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useSectionExercises } from '@/lib/queries'
import { ExerciseCard } from './ExerciseCard'
import { ProgressBanner } from './ProgressBanner'
import { useExerciseStats, type ExerciseStatus } from './exerciseStatus'

export function ExercisesPage() {
  const { section } = useCourseContext()
  const { data, isLoading, error, refetch } = useSectionExercises(section.id)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | ExerciseStatus>('')
  const [skill, setSkill] = useState('')
  const [type, setType] = useState('')
  const { statuses, done, inProgress } = useExerciseStats(data)

  const filtered = (data ?? []).filter((e, i) => {
    if (query && !e.title.toLowerCase().includes(query.trim().toLowerCase())) return false
    if (status && statuses[i] !== status) return false
    if (skill && e.skillType !== skill) return false
    if (type && e.exerciseType !== type) return false
    return true
  })

  return (
    <div>
      <CoursePageHeader title="Bài luyện" />
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-36" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <ProgressBanner done={done} inProgress={inProgress} total={data?.length ?? 0} />

          <h2 className="mb-4 mt-10 text-xl font-semibold">Danh sách bài luyện</h2>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                className="border-none bg-muted pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Tìm kiếm bài luyện"
              />
            </div>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | ExerciseStatus)}
              aria-label="Trạng thái"
            >
              <option value="">Trạng thái</option>
              <option value="todo">Chưa làm</option>
              <option value="in-progress">Đang làm</option>
              <option value="done">Đã hoàn thành</option>
            </Select>
            <Select value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Kỹ năng">
              <option value="">Kỹ năng</option>
              <option value="READING">Reading</option>
              <option value="LISTENING">Listening</option>
            </Select>
            <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Phân loại">
              <option value="">Phân loại</option>
              <option value="LESSON">Bài tập nhanh</option>
              <option value="PRACTICE">Luyện tập</option>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Không có bài luyện phù hợp"
              description="Thử đổi từ khóa hoặc bộ lọc."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((e) => (
                <ExerciseCard key={e.id} exercise={e} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
