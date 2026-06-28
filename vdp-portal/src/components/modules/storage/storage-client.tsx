'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatBytes } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FolderIcon,
  FileIcon,
  DownloadIcon,
  CopyIcon,
  DatabaseIcon,
  BarChartIcon,
  ClipboardIcon,
  Code2Icon,
  ChevronRightIcon,
  RefreshCwIcon,
  HardDriveIcon,
} from 'lucide-react'

interface Bucket {
  name: string
  creationDate: string
}

interface StorageObject {
  folders: { prefix: string; name: string }[]
  files: { key: string; name: string; size: number; lastModified: string; etag: string }[]
  prefix: string
}

function getFileIcon(name: string) {
  if (name.endsWith('.parquet')) return <BarChartIcon className="size-4 text-blue-500" />
  if (name.endsWith('.json') || name.endsWith('.yaml') || name.endsWith('.yml'))
    return <ClipboardIcon className="size-4 text-orange-500" />
  if (name.endsWith('.py') || name.endsWith('.scala') || name.endsWith('.sql'))
    return <Code2Icon className="size-4 text-green-500" />
  return <FileIcon className="size-4 text-slate-400" />
}

export function StorageClient() {
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const [currentPrefix, setCurrentPrefix] = useState<string>('')

  const { data: bucketsResponse, isLoading: isLoadingBuckets, refetch: refetchBuckets } = useQuery({
    queryKey: ['minio-buckets'],
    queryFn: () => apiFetch<{ success: boolean; data: Bucket[] }>('/minio/buckets'),
  })

  const buckets = bucketsResponse?.data ?? []

  const { data: objectsResponse, isLoading: isLoadingObjects, refetch: refetchObjects } = useQuery({
    queryKey: ['minio-objects', selectedBucket, currentPrefix],
    queryFn: () =>
      apiFetch<{ success: boolean; data: StorageObject }>(
        `/minio/buckets/${selectedBucket}/objects?prefix=${encodeURIComponent(currentPrefix)}`
      ),
    enabled: !!selectedBucket,
  })

  const objects = objectsResponse?.data ?? { folders: [], files: [], prefix: '' }

  async function handleDownload(key: string) {
    if (!selectedBucket) return
    try {
      const res = await apiFetch<{ success: boolean; data: { url: string } }>(
        `/minio/buckets/${selectedBucket}/download?key=${encodeURIComponent(key)}`
      )
      if (res.data?.url) {
        window.open(res.data.url, '_blank')
      } else {
        toast.error('Không lấy được URL tải xuống')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tải xuống')
    }
  }

  function handleCopyPath(key: string) {
    if (!selectedBucket) return
    const s3Path = `s3a://${selectedBucket}/${key}`
    navigator.clipboard.writeText(s3Path)
    toast.success('Đã copy path')
  }

  const breadcrumbs = currentPrefix.split('/').filter(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Storage Browser</h1>
          <p className="text-sm text-slate-500">Duyệt dữ liệu object storage trên MinIO</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refetchBuckets()
            if (selectedBucket) refetchObjects()
          }}
        >
          <RefreshCwIcon className="size-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
              <span>Buckets</span>
              <DatabaseIcon className="size-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBuckets ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-slate-900">{buckets.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
              <span>Đang chọn</span>
              <HardDriveIcon className="size-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 truncate">
              {selectedBucket ?? 'Chưa chọn'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center justify-between">
              <span>Thư mục hiện tại</span>
              <FolderIcon className="size-4 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 truncate">
              {currentPrefix ? `/${currentPrefix}` : '/'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Sidebar Buckets */}
        <div className="space-y-3 md:col-span-1">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Danh sách Buckets</h2>
          {isLoadingBuckets ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : buckets.length === 0 ? (
            <p className="text-sm text-slate-400">Không tìm thấy bucket nào.</p>
          ) : (
            <div className="space-y-1">
              {buckets.map((b) => {
                const isSelected = selectedBucket === b.name
                return (
                  <button
                    key={b.name}
                    onClick={() => {
                      setSelectedBucket(b.name)
                      setCurrentPrefix('')
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DatabaseIcon className={`size-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <div className="text-sm truncate">{b.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(b.creationDate).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                    <ChevronRightIcon className="size-4 shrink-0 opacity-50" />
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* File Browser Table */}
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="pb-3 border-b">
              {/* Breadcrumb */}
              <div className="flex items-center flex-wrap gap-1 text-sm font-medium">
                <button
                  onClick={() => setCurrentPrefix('')}
                  disabled={!selectedBucket}
                  className={`flex items-center gap-1 ${
                    selectedBucket ? 'text-blue-600 hover:underline' : 'text-slate-400'
                  }`}
                >
                  <DatabaseIcon className="size-4" />
                  <span>{selectedBucket ?? 'Chọn Bucket'}</span>
                </button>

                {breadcrumbs.map((segment, idx) => {
                  const targetPrefix = breadcrumbs.slice(0, idx + 1).join('/') + '/'
                  return (
                    <div key={targetPrefix} className="flex items-center gap-1">
                      <ChevronRightIcon className="size-4 text-slate-400" />
                      <button
                        onClick={() => setCurrentPrefix(targetPrefix)}
                        className="text-blue-600 hover:underline truncate max-w-[150px]"
                      >
                        {segment}
                      </button>
                    </div>
                  )
                })}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {!selectedBucket ? (
                <div className="py-16 text-center text-slate-400">
                  <FolderIcon className="size-12 mx-auto mb-2 opacity-30" />
                  <p>Vui lòng chọn một bucket bên trái để xem dữ liệu</p>
                </div>
              ) : isLoadingObjects ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : objects.folders.length === 0 && objects.files.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <FolderIcon className="size-12 mx-auto mb-2 opacity-30" />
                  <p>Thư mục này trống</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="w-[100px]">Kích thước</TableHead>
                      <TableHead className="w-[160px]">Cập nhật lần cuối</TableHead>
                      <TableHead className="text-right w-[160px]">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {objects.folders.map((folder) => (
                      <TableRow key={folder.prefix} className="cursor-pointer hover:bg-slate-50">
                        <TableCell>
                          <FolderIcon className="size-4 text-yellow-500" />
                        </TableCell>
                        <TableCell className="font-medium text-slate-800">
                          <button
                            onClick={() => setCurrentPrefix(folder.prefix)}
                            className="hover:underline flex items-center text-left"
                          >
                            {folder.name}/
                          </button>
                        </TableCell>
                        <TableCell className="text-slate-400">—</TableCell>
                        <TableCell className="text-slate-400">—</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}

                    {objects.files.map((file) => (
                      <TableRow key={file.key} className="hover:bg-slate-50">
                        <TableCell>{getFileIcon(file.name)}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-700">{file.name}</TableCell>
                        <TableCell className="text-sm text-slate-600 tabular-nums">
                          {formatBytes(file.size)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(file.lastModified).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Tải xuống"
                              onClick={() => handleDownload(file.key)}
                            >
                              <DownloadIcon className="size-4 text-slate-600 hover:text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Copy S3 Path"
                              onClick={() => handleCopyPath(file.key)}
                            >
                              <CopyIcon className="size-4 text-slate-600 hover:text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
