export type SparkAppState = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUBMITTED' | 'PENDING' | 'UNKNOWN'

export interface SparkApplication {
  metadata: {
    name: string
    namespace: string
    creationTimestamp: string
    labels?: Record<string, string>
  }
  spec: {
    type: 'Scala' | 'Java' | 'Python' | 'R'
    mainClass?: string
    mainApplicationFile: string
    sparkVersion?: string
  }
  status?: {
    applicationState: {
      state: SparkAppState
      errorMessage?: string
    }
    sparkWebUI?: {
      ingressURL?: string
    }
    driverInfo?: {
      podName?: string
      webUIAddress?: string
    }
    lastSubmissionAttemptTime?: string
    terminationTime?: string
  }
}

export interface SparkApplicationsResponse {
  items: SparkApplication[]
  total: number
}
