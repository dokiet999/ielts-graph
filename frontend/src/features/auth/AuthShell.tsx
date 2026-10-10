import { BookOpenCheck, Headphones, LineChart } from 'lucide-react'
import { Logo } from '@/components/Logo'

const POINTS = [
  { icon: BookOpenCheck, text: 'Luyện Reading với công cụ highlight, ghi chú và tra nghĩa' },
  { icon: Headphones, text: 'Luyện Listening theo đúng định dạng đề thi' },
  { icon: LineChart, text: 'Chấm điểm tức thì, xem lại đáp án và theo dõi band' },
]

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5" />
        <p className="relative text-lg font-bold">IELTS Graph</p>
        <div className="relative space-y-8">
          <h2 className="max-w-md text-4xl font-bold leading-tight">
            Học có lộ trình, luyện có kết quả.
          </h2>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/70">Đồ án tốt nghiệp · 2026</p>
      </div>

      <div className="flex items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
