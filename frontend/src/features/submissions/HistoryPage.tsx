import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { History } from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useMySubmissions } from '@/lib/queries'
import {
  EXERCISE_TYPE_LABEL,
  formatDateTime,
  formatDuration,
  percent,
  SKILL_LABEL,
} from '@/lib/utils'

export function HistoryPage() {
  const { data, isLoading, error, refetch } = useMySubmissions()
  const [skill, setSkill] = useState('')
  const navigate = useNavigate()
  const list = (data ?? []).filter((s) => !skill || s.skillType === skill)

  return (
    <div>
      <PageTitle title="Lịch sử làm bài" subtitle="Tất cả các lần nộp bài của bạn." />
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{list.length} lượt nộp</p>
        <Select
          value={skill}
          onChange={(e) => setSkill(e.target.value)}
          className="w-44"
          aria-label="Kỹ năng"
        >
          <option value="">Tất cả kỹ năng</option>
          <option value="READING">Reading</option>
          <option value="LISTENING">Listening</option>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={History}
          title="Chưa có lượt nộp bài nào"
          description="Hãy bắt đầu một bài luyện trong khóa học của bạn."
          className="bg-surface"
          action={
            <Button asChild>
              <Link to="/courses">Đến khóa học</Link>
            </Button>
          }
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Bài</th>
                <th className="px-5 py-3 font-medium">Kỹ năng</th>
                <th className="px-5 py-3 font-medium">Lần</th>
                <th className="px-5 py-3 font-medium">Kết quả</th>
                <th className="px-5 py-3 font-medium">Thời gian</th>
                <th className="px-5 py-3 font-medium">Ngày nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.map((s) => {
                const pct = percent(s.correctCount, s.questionCount)
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/submissions/${s.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <td className="px-5 py-3">
                      <Link to={`/submissions/${s.id}`} className="font-medium hover:text-primary">
                        {s.exerciseTitle}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {EXERCISE_TYPE_LABEL[s.exerciseType]}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={s.skillType === 'READING' ? 'primary' : 'info'}>
                        {SKILL_LABEL[s.skillType]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">#{s.attemptNumber}</td>
                    <td className="px-5 py-3">
                      <Badge tone={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger'}>
                        {s.correctCount}/{s.questionCount} · {pct}%
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDuration(s.timeSpent)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDateTime(s.submittedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
