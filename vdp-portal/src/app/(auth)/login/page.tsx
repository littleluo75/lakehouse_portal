import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { signIn } from '@/lib/auth'

const errorMessages: Record<string, string> = {
  OAuthSignin: 'Không thể kết nối tới máy chủ SSO.',
  OAuthCallback: 'Lỗi xử lý phản hồi từ máy chủ SSO.',
  OAuthCreateAccount: 'Không thể tạo tài khoản.',
  OAuthAccountNotLinked: 'Tài khoản đã được liên kết với phương thức đăng nhập khác.',
  SessionRequired: 'Vui lòng đăng nhập để tiếp tục.',
  Default: 'Đăng nhập thất bại. Vui lòng thử lại.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (errorMessages[error] ?? errorMessages.Default) : null

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">VDP Portal</CardTitle>
          <CardDescription>
            VNPT Data Platform — Cổng quản trị dữ liệu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <p className="text-sm text-slate-500 text-center">
            Đăng nhập bằng tài khoản VNPT của bạn
          </p>
          <form
            action={async () => {
              'use server'
              await signIn('keycloak', { redirectTo: '/' })
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Đăng nhập bằng VNPT SSO
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
