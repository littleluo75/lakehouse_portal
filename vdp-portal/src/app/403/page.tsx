import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function ForbiddenPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-slate-300">403</h1>
        <h2 className="text-xl font-semibold text-slate-700">Không có quyền truy cập</h2>
        <p className="text-slate-500">Bạn không có quyền truy cập trang này.</p>
        <Link href="/" className={buttonVariants()}>
          Về trang chủ
        </Link>
      </div>
    </main>
  )
}
