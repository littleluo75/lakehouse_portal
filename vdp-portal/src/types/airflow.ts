export type RunState = 'success' | 'failed' | 'running' | 'queued'

export interface DAGLastRunData {
  dag_run_id: string
  execution_date: string
  start_date: string | null
  end_date: string | null
  state: RunState
  data_interval_start: string | null
  data_interval_end: string | null
}

export interface DAG {
  dag_id: string
  description: string | null
  is_paused: boolean
  is_active: boolean
  schedule_interval: string | null
  tags: Array<{ name: string }>
  owners: string[]
  next_dagrun: string | null
  last_dagrun_data?: DAGLastRunData | null
}

export interface DAGRun {
  dag_run_id: string
  dag_id: string
  state: RunState
  start_date: string | null
  end_date: string | null
  execution_date: string
  conf: Record<string, unknown>
}

export interface TaskInstance {
  task_id: string
  state: string
  start_date: string | null
  end_date: string | null
  duration: number | null
  try_number: number
}

export interface AirflowDagsResponse {
  dags: DAG[]
  total_entries: number
}

export interface AirflowDagRunsResponse {
  dag_runs: DAGRun[]
  total_entries: number
}

export interface AirflowTaskInstancesResponse {
  task_instances: TaskInstance[]
  total_entries: number
}
