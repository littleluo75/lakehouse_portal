import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { coreApi } from '@/lib/services/k8s'

export async function GET() {
  const { error } = await validateApiAuth(['SuperAdmin'])
  if (error) return error

  try {
    const [nodesRes, nsRes, podsRes] = await Promise.allSettled([
      coreApi.listNode(),
      coreApi.listNamespace(),
      coreApi.listPodForAllNamespaces(),
    ])

    if (nodesRes.status === 'rejected' && nsRes.status === 'rejected' && podsRes.status === 'rejected') {
      // Graceful fallback when not running inside K8s cluster or kubeconfig not reachable
      return Response.json({
        success: true,
        data: {
          connected: false,
          warning: 'Không thể kết nối đến Kubernetes API (môi trường dev ngoài cluster). Hiển thị dữ liệu giả định.',
          nodes: [
            { name: 'rke2-master-01', status: 'Ready', cpu: '8 / 16 cores', memory: '32 / 64 GB', role: 'control-plane' },
            { name: 'rke2-worker-01', status: 'Ready', cpu: '18 / 32 cores', memory: '90 / 128 GB', role: 'worker' },
            { name: 'rke2-worker-02', status: 'Ready', cpu: '20 / 32 cores', memory: '100 / 128 GB', role: 'worker' },
          ],
          namespacesCount: 12,
          pods: { total: 45, running: 42, pending: 2, failed: 1 },
        },
      })
    }

    const nodes = nodesRes.status === 'fulfilled' ? (nodesRes.value.items ?? []).map((n) => {
      const status = n.status?.conditions?.find((c) => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady'
      return {
        name: n.metadata?.name ?? 'unknown',
        status,
        cpu: n.status?.allocatable?.cpu ?? 'N/A',
        memory: n.status?.allocatable?.memory ?? 'N/A',
        role: Object.keys(n.metadata?.labels ?? {}).some((k) => k.includes('control-plane') || k.includes('master')) ? 'control-plane' : 'worker',
      }
    }) : []

    const namespacesCount = nsRes.status === 'fulfilled' ? (nsRes.value.items ?? []).length : 0
    const allPods = podsRes.status === 'fulfilled' ? (podsRes.value.items ?? []) : []

    const running = allPods.filter((p) => p.status?.phase === 'Running').length
    const pending = allPods.filter((p) => p.status?.phase === 'Pending').length
    const failed = allPods.filter((p) => p.status?.phase === 'Failed').length

    return Response.json({
      success: true,
      data: {
        connected: true,
        nodes,
        namespacesCount,
        pods: { total: allPods.length, running, pending, failed },
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
