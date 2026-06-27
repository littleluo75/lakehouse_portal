export type JupyterProfile = 'standard' | 'medium' | 'large'

export type ServerStatus = 'stopped' | 'starting' | 'running'

export interface JupyterServerInfo {
  ready: boolean
  url: string
  started: string
  progress?: number
}

export interface JupyterUserResponse {
  name: string
  server: JupyterServerInfo | null
  servers: Record<string, JupyterServerInfo>
}

export interface JupyterServerStatus {
  status: ServerStatus
  server: JupyterServerInfo | null
  username: string
}
