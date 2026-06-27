export interface DataAsset {
  id: string
  name: string
  fullyQualifiedName: string
  description?: string
  tableType?: string
  columns?: Column[]
  tags?: Tag[]
  owner?: { name: string; type: string }
  database?: { name: string }
  databaseSchema?: { name: string }
  updatedAt?: number
}

export interface Column {
  name: string
  dataType: string
  description?: string
  tags?: Tag[]
  constraint?: string
}

export interface Tag {
  tagFQN: string
  labelType: string
}

export interface OmSearchHit {
  _source: DataAsset
}

export interface OmSearchResponse {
  hits: {
    total: { value: number }
    hits: OmSearchHit[]
  }
}

export interface OmTablesResponse {
  data: DataAsset[]
  paging: { total: number }
}

export interface LineageEdge {
  fromEntity: string
  toEntity: string
  lineageDetails?: Record<string, unknown>
}

export interface LineageNode {
  id: string
  type: string
  fullyQualifiedName: string
  name?: string
  description?: string
}

export interface LineageData {
  entity: DataAsset
  nodes: LineageNode[]
  edges: LineageEdge[]
  upstreamEdges: LineageEdge[]
  downstreamEdges: LineageEdge[]
}

export interface GlossaryTerm {
  id: string
  name: string
  fullyQualifiedName: string
  description?: string
  tags?: Tag[]
  glossary?: { name: string }
}

export interface GlossaryTermsResponse {
  data: GlossaryTerm[]
  paging: { total: number }
}
