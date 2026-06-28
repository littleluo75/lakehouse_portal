'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRightIcon, DatabaseIcon, FolderIcon, TableIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiCall } from '@/lib/api-client'

interface SchemaBrowserProps {
  onTableClick: (catalog: string, schema: string, table: string) => void
}

interface TreeNode {
  name: string
  expanded: boolean
}

interface SchemaNode extends TreeNode {
  tables: string[]
  tablesLoaded: boolean
}

interface CatalogNode extends TreeNode {
  schemas: Record<string, SchemaNode>
  schemasLoaded: boolean
}

export function SchemaBrowser({ onTableClick }: SchemaBrowserProps) {
  const [catalogs, setCatalogs] = useState<Record<string, CatalogNode>>({})
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const { isLoading: isCatalogsLoading, error: catalogsError } = useQuery({
    queryKey: ['trino-catalogs'],
    queryFn: async () => {
      const json = await apiCall<{ success: boolean; data: string[] }>('/trino/catalogs')
      if (!json.success) throw new Error('Không thể tải catalogs')
      const initial: Record<string, CatalogNode> = {}
      json.data.forEach((name) => {
        initial[name] = { name, expanded: false, schemas: {}, schemasLoaded: false }
      })
      setCatalogs(initial)
      return json.data
    },
  })

  async function toggleCatalog(catalog: string) {
    const node = catalogs[catalog]
    if (!node) return

    if (node.expanded) {
      setCatalogs((prev) => ({
        ...prev,
        [catalog]: { ...prev[catalog], expanded: false },
      }))
      return
    }

    if (node.schemasLoaded) {
      setCatalogs((prev) => ({
        ...prev,
        [catalog]: { ...prev[catalog], expanded: true },
      }))
      return
    }

    setLoadingKey(catalog)
    try {
      const json = await apiCall<{ success: boolean; data: string[] }>(`/trino/schemas?catalog=${encodeURIComponent(catalog)}`)
      if (!json.success) return

      const schemas: Record<string, SchemaNode> = {}
      json.data.forEach((s) => {
        schemas[s] = { name: s, expanded: false, tables: [], tablesLoaded: false }
      })
      setCatalogs((prev) => ({
        ...prev,
        [catalog]: { ...prev[catalog], expanded: true, schemas, schemasLoaded: true },
      }))
    } finally {
      setLoadingKey(null)
    }
  }

  async function toggleSchema(catalog: string, schema: string) {
    const schemaNode = catalogs[catalog]?.schemas[schema]
    if (!schemaNode) return

    if (schemaNode.expanded) {
      setCatalogs((prev) => ({
        ...prev,
        [catalog]: {
          ...prev[catalog],
          schemas: {
            ...prev[catalog].schemas,
            [schema]: { ...schemaNode, expanded: false },
          },
        },
      }))
      return
    }

    if (schemaNode.tablesLoaded) {
      setCatalogs((prev) => ({
        ...prev,
        [catalog]: {
          ...prev[catalog],
          schemas: {
            ...prev[catalog].schemas,
            [schema]: { ...schemaNode, expanded: true },
          },
        },
      }))
      return
    }

    const key = `${catalog}.${schema}`
    setLoadingKey(key)
    try {
      const json = await apiCall<{ success: boolean; data: string[] }>(
        `/trino/tables?catalog=${encodeURIComponent(catalog)}&schema=${encodeURIComponent(schema)}`
      )
      if (!json.success) return

      setCatalogs((prev) => ({
        ...prev,
        [catalog]: {
          ...prev[catalog],
          schemas: {
            ...prev[catalog].schemas,
            [schema]: { ...schemaNode, expanded: true, tables: json.data, tablesLoaded: true },
          },
        },
      }))
    } finally {
      setLoadingKey(null)
    }
  }

  if (isCatalogsLoading) {
    return (
      <div className="flex items-center justify-center p-4 text-slate-400">
        <Loader2Icon className="size-4 animate-spin" />
      </div>
    )
  }

  if (catalogsError) {
    return (
      <p className="p-3 text-xs text-red-500">Không thể tải schema browser</p>
    )
  }

  return (
    <div className="select-none text-sm">
      {Object.values(catalogs).map((catalog) => (
        <div key={catalog.name}>
          <button
            onClick={() => toggleCatalog(catalog.name)}
            className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-slate-100"
          >
            <ChevronRightIcon
              className={cn('size-3.5 shrink-0 transition-transform text-slate-400', {
                'rotate-90': catalog.expanded,
              })}
            />
            <DatabaseIcon className="size-3.5 shrink-0 text-blue-500" />
            <span className="truncate font-medium text-slate-700">{catalog.name}</span>
            {loadingKey === catalog.name && (
              <Loader2Icon className="ml-auto size-3 animate-spin text-slate-400" />
            )}
          </button>

          {catalog.expanded &&
            Object.values(catalog.schemas).map((schema) => (
              <div key={schema.name} className="ml-4">
                <button
                  onClick={() => toggleSchema(catalog.name, schema.name)}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-slate-100"
                >
                  <ChevronRightIcon
                    className={cn('size-3.5 shrink-0 transition-transform text-slate-400', {
                      'rotate-90': schema.expanded,
                    })}
                  />
                  <FolderIcon className="size-3.5 shrink-0 text-amber-500" />
                  <span className="truncate text-slate-600">{schema.name}</span>
                  {loadingKey === `${catalog.name}.${schema.name}` && (
                    <Loader2Icon className="ml-auto size-3 animate-spin text-slate-400" />
                  )}
                </button>

                {schema.expanded &&
                  schema.tables.map((table) => (
                    <button
                      key={table}
                      onClick={() => onTableClick(catalog.name, schema.name, table)}
                      className="ml-6 flex w-full items-center gap-1.5 rounded px-2 py-1 text-left hover:bg-blue-50"
                    >
                      <TableIcon className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate font-mono text-xs text-slate-600">{table}</span>
                    </button>
                  ))}
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
