import * as k8s from '@kubernetes/client-node'
import type { SparkApplication } from '@/types/spark'
import { lazyClient } from '@/lib/lazy-client'

// KubeConfig loading and API client construction are deferred to first use
// (not module load) so importing this module never touches kubeconfig/cluster
// state. This keeps it safe to have on the module graph in BA Draft mode,
// where these functions are never actually called.
interface K8sClients {
  customObjectsApi: k8s.CustomObjectsApi
  coreApi: k8s.CoreV1Api
}

let cached: K8sClients | null = null

function buildClients(): K8sClients {
  if (cached) return cached
  const kc = new k8s.KubeConfig()
  try {
    if (process.env.KUBERNETES_SERVICE_HOST) {
      kc.loadFromCluster()
    } else {
      kc.loadFromDefault()
    }
  } catch (err) {
    console.warn('[k8s] Không thể nạp KubeConfig (chạy ngoài K8s cluster):', err)
  }
  cached = {
    customObjectsApi: kc.makeApiClient(k8s.CustomObjectsApi),
    coreApi: kc.makeApiClient(k8s.CoreV1Api),
  }
  return cached
}

const customObjectsApi = lazyClient(() => buildClients().customObjectsApi)
const coreApi = lazyClient(() => buildClients().coreApi)

export async function listSparkApplications(namespace = 'spark-operator'): Promise<SparkApplication[]> {
  try {
    const result = await customObjectsApi.listNamespacedCustomObject({
      group: 'sparkoperator.k8s.io',
      version: 'v1beta2',
      namespace,
      plural: 'sparkapplications',
    })
    const list = result as { items?: unknown[] }
    return (list.items ?? []) as SparkApplication[]
  } catch {
    return []
  }
}

export async function getSparkApplication(name: string, namespace = 'spark-operator'): Promise<SparkApplication> {
  const result = await customObjectsApi.getNamespacedCustomObject({
    group: 'sparkoperator.k8s.io',
    version: 'v1beta2',
    namespace,
    plural: 'sparkapplications',
    name,
  })
  return result as SparkApplication
}

export async function getSparkDriverLogs(podName: string, namespace = 'spark-operator', tailLines = 100): Promise<string> {
  try {
    const result = await coreApi.readNamespacedPodLog({
      name: podName,
      namespace,
      tailLines,
    })
    return typeof result === 'string' ? result : String(result)
  } catch {
    return 'Logs unavailable outside Kubernetes environment.'
  }
}

export async function listVolcanoQueues() {
  try {
    return await customObjectsApi.listClusterCustomObject({
      group: 'scheduling.volcano.sh',
      version: 'v1beta1',
      plural: 'queues',
    })
  } catch {
    return { items: [] }
  }
}

export { customObjectsApi, coreApi }
