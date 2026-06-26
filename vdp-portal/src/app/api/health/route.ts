import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()

  return Response.json({
    success: true,
    data: {
      portal: 'ok',
      authenticated: !!session,
      user: session?.user?.name ?? null,
      timestamp: new Date().toISOString(),
    },
  })
}
