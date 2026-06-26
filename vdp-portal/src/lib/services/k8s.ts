import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()

if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster()
} else {
  kc.loadFromDefault()
}

const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
const coreApi = kc.makeApiClient(k8s.CoreV1Api)

export async function listSparkApplications(namespace = 'spark-operator') {
  return customObjectsApi.listNamespacedCustomObject({
    group: 'sparkoperator.k8s.io',
    version: 'v1beta2',
    namespace,
    plural: 'sparkapplications',
  })
}

export async function listVolcanoQueues() {
  return customObjectsApi.listClusterCustomObject({
    group: 'scheduling.volcano.sh',
    version: 'v1beta1',
    plural: 'queues',
  })
}

export { customObjectsApi, coreApi }
