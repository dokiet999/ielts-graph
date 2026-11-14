import { useEffect, useState } from 'react'
import { Award, Search, SearchX, Timer } from 'lucide-react'
import { CoursePageHeader } from '@/layouts/CourseLayout'
import { useCourseContext } from '@/layouts/courseContext'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { estimateBand, formatBand } from '@/lib/band'
import { useSectionMockTests } from '@/lib/queries'
import type { ExerciseSummary } from '@/lib/types'
import { ExerciseCard } from './ExerciseCard'
import { ProgressBanner } from './ProgressBanner'
import { useExerciseStats, type ExerciseStatus } from './exerciseStatus'

export const MOCK_TESTS_PAGE_SIZE = 6

function bestMockBandOf(list: ExerciseSummary[] | undefined): number | null {
  if (!list || list.length === 0) return null
  const bands = list
    .filter((e) => e.bestScore !== null)
    .map((e) =>
      e.skillType === 'WRITING' || e.skillType === 'SPEAKING'
        ? e.bestScore
        : estimateBand(e.skillType, e.bestScore ?? 0, e.questionCount),
    )
    .filter((b): b is number => b !== null)
  return bands.length > 0 ? Math.max(...bands) : null
}

export function MockTestsPage() {
  const { section } = useCourseContext()
  const { data, isLoading, error, refetch } = useSectionMockTests(section.id)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'' | ExerciseStatus>('')
  const [skill, setSkill] = useState('')
  const [page, setPage] = useState(1)
  const { statuses, done, inProgress } = useExerciseStats(data)
  const bestBand = bestMockBandOf(data)

  useEffect(() => {
    setPage(1)
  }, [section.id, query, status, skill])

  const filtered = (data ?? []).filter((e, i) => {
    if (query && !e.title.toLowerCase().includes(query.trim().toLowerCase())) return false
    if (status && statuses[i] !== status) return false
    if (skill && e.skillType !== skill) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / MOCK_TESTS_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedMockTests = filtered.slice(
    (safePage - 1) * MOCK_TESTS_PAGE_SIZE,
    safePage * MOCK_TESTS_PAGE_SIZE,
  )

  return (
    <div>
      <CoursePageHeader title="Mock test">
        {bestBand !== null && (
          <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2 text-sm font-semibold text-success">
            <Award className="size-4" />
            <span>Band cao nhất: {formatBand(bestBand)}</span>
          </div>
        )}
      </CoursePageHeader>
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-36" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : (
        <>
          <ProgressBanner
            done={done}
            inProgress={inProgress}
            total={data?.length ?? 0}
            noun="bài thi thử"
          />

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-info-soft px-4 py-3 text-sm text-info">
            <Timer className="size-4 shrink-0" />
            <span>
              Các bài Mock test áp dụng đồng hồ đếm ngược chuẩn thi thật và quy đổi kết quả sang
              IELTS Band Score (0.0 – 9.0).
            </span>
          </div>

          <h2 className="mb-4 mt-8 text-xl font-semibold">Danh sách bài thi thử</h2>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bài thi thử..."
                className="border-none bg-muted pl-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Tìm kiếm bài thi thử"
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
              <option value="WRITING">Writing</option>
              <option value="SPEAKING">Speaking</option>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Không có bài thi thử phù hợp"
              description="Thử đổi từ khóa hoặc bộ lọc."
            />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {pagedMockTests.map((e) => (
                  <ExerciseCard key={e.id} exercise={e} />
                ))}
              </div>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={filtered.length}
                pageSize={MOCK_TESTS_PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

