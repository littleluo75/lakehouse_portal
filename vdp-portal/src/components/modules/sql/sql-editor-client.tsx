'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { sql as sqlLang } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { PlayIcon, Trash2Icon, HistoryIcon, ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RoleGuard } from '@/components/role-guard'
import { SchemaBrowser } from './schema-browser'
import { ResultsPanel } from './results-panel'
import { apiCall } from '@/lib/api-client'
import type { SqlEngine, QueryResult, QueryHistoryItem } from '@/types/sql'

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false })

const HISTORY_KEY = 'lighthouse-portal_query_history'
const MAX_HISTORY = 20

const queryClient = new QueryClient()

function loadHistory(): QueryHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as QueryHistoryItem[]
  } catch {
    return []
  }
}

function saveToHistory(item: Omit<QueryHistoryItem, 'id'>) {
  const history = loadHistory()
  const newItem: QueryHistoryItem = { ...item, id: String(Date.now()) }
  const updated = [newItem, ...history.filter((h) => h.sql !== item.sql)].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  return updated
}

function SqlEditorInner() {
  const [engine, setEngine] = useState<SqlEngine>('trino')
  const [catalog, setCatalog] = useState('iceberg')
  const [schema, setSchema] = useState('default')
  const [sqlValue, setSqlValue] = useState('SELECT 1')
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      setHistory(loadHistory())
    })
  }, [])

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    }
  }, [])

  const runQuery = useCallback(async () => {
    const trimmedSql = sqlValue.trim()
    if (!trimmedSql || isRunning) return

    setIsRunning(true)
    setResult(null)
    setQueryError(null)
    setElapsed(0)

    const start = Date.now()
    elapsedTimerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 500)

    const endpoint = engine === 'trino' ? '/trino/query' : '/starrocks/query'
    const body =
      engine === 'trino'
        ? { sql: trimmedSql, catalog, schema }
        : { sql: trimmedSql }

    try {
      const json = await apiCall<{ success: boolean; data?: QueryResult; error?: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (!json.success) {
        setQueryError(json.error ?? 'Lỗi không xác định')
      } else {
        setResult(json.data ?? null)
        const newHistory = saveToHistory({ sql: trimmedSql, engine, timestamp: Date.now() })
        setHistory(newHistory)
      }
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Lỗi kết nối')
    } finally {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      setIsRunning(false)
    }
  }, [sqlValue, isRunning, engine, catalog, schema])

  function handleTableClick(cat: string, sch: string, table: string) {
    setSqlValue(`SELECT * FROM "${cat}"."${sch}"."${table}" LIMIT 100`)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Schema Browser Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-white lg:flex">
        <div className="border-b px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Schema Browser
          </p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          <SchemaBrowser onTableClick={handleTableClick} />
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-white px-4 py-2">
          {/* Engine toggle */}
          <div className="flex rounded-lg border p-0.5">
            {(['trino', 'starrocks'] as SqlEngine[]).map((eng) => (
              <button
                key={eng}
                onClick={() => setEngine(eng)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  engine === eng
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {eng === 'trino' ? 'Trino' : 'StarRocks'}
              </button>
            ))}
          </div>

          {/* Catalog / Schema (Trino only) */}
          {engine === 'trino' && (
            <>
              <input
                value={catalog}
                onChange={(e) => setCatalog(e.target.value)}
                placeholder="catalog"
                className="h-7 w-28 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <input
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                placeholder="schema"
                className="h-7 w-28 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* History dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory((v) => !v)}
                className="h-7 gap-1 text-xs"
              >
                <HistoryIcon className="size-3" />
                Lịch sử
                <ChevronDownIcon className="size-3" />
              </Button>
              {showHistory && history.length > 0 && (
                <div className="absolute right-0 top-full z-10 mt-1 w-96 rounded-lg border bg-white shadow-lg">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSqlValue(item.sql)
                          setEngine(item.engine)
                          setShowHistory(false)
                        }}
                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="truncate font-mono text-xs text-slate-700">{item.sql}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.engine} · {new Date(item.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showHistory && history.length === 0 && (
                <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border bg-white p-3 shadow-lg">
                  <p className="text-xs text-slate-400">Chưa có lịch sử query</p>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSqlValue('')}
              className="h-7 gap-1 text-xs"
            >
              <Trash2Icon className="size-3" />
              Xóa
            </Button>

            <RoleGuard
              roles={['DE', 'DS', 'Admin', 'SuperAdmin']}
              fallback={
                <Button size="sm" disabled className="h-7 gap-1 text-xs" title="Chỉ xem — không có quyền chạy query">
                  <PlayIcon className="size-3" />
                  Chỉ xem
                </Button>
              }
            >
              <Button
                size="sm"
                onClick={runQuery}
                disabled={isRunning || !sqlValue.trim()}
                className="h-7 gap-1 text-xs"
              >
                <PlayIcon className="size-3" />
                {isRunning ? `Đang chạy... (${elapsed}s)` : 'Chạy (Ctrl+Enter)'}
              </Button>
            </RoleGuard>
          </div>
        </div>

        {/* Editor */}
        <div className="shrink-0 border-b" style={{ height: '240px' }}>
          <CodeMirror
            value={sqlValue}
            height="240px"
            theme={oneDark}
            extensions={[sqlLang()]}
            onChange={(val) => setSqlValue(val)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault()
                runQuery()
              }
            }}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              syntaxHighlighting: true,
            }}
          />
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-hidden bg-white">
          <ResultsPanel
            isRunning={isRunning}
            elapsed={elapsed}
            result={result}
            error={queryError}
          />
        </div>
      </div>

      {/* Close history dropdown on outside click */}
      {showHistory && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

export function SqlEditorClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <SqlEditorInner />
    </QueryClientProvider>
  )
}
