import * as k8s from '@kubernetes/client-node'
import type { SparkApplication } from '@/types/spark'

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

const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
const coreApi = kc.makeApiClient(k8s.CoreV1Api)

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
