import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import type { Highlight } from '@/lib/highlight'
import { useSubmission } from '@/lib/queries'
import { SplitPaneRunner } from '../runner/test/SplitPaneRunner'

/** Read-only replay of a graded submission with correct answers, explanations and transcript. */
export function ReviewPage() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const { data: sub, isLoading, error, refetch } = useSubmission(submissionId)
  const [highlights, setHighlights] = useState<Highlight[]>([])

  if (isLoading) return <PageLoader />
  if (error || !sub) {
    return (
      <div className="p-6">
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </div>
    )
  }

  const backToResult = () => navigate(`/submissions/${sub.id}`)
  return (
    <SplitPaneRunner
      exercise={sub.exercise}
      mode="review"
      answers={sub.answers}
      results={Object.fromEntries(sub.results.map((r) => [r.questionId, r]))}
      highlights={highlights}
      onHighlightsChange={setHighlights}
      status={
        <p className="truncate font-semibold">
          Xem lại ·{' '}
          <span className="text-success">
            {sub.correctCount}/{sub.questionCount} câu đúng
          </span>
        </p>
      }
      footerLabel="Xem lại"
      finalAction={<Button onClick={backToResult}>Kết quả</Button>}
      onExit={backToResult}
    />
  )
}
