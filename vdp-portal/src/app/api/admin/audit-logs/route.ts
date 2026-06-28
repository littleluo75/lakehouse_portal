import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'

export async function GET() {
  const { error } = await validateApiAuth(['SuperAdmin'])
  if (error) return error

  try {
    const logs = [
      { id: 'log-1', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), user: 'admin', action: 'LOGIN', detail: 'Đăng nhập vào hệ thống quản trị', status: 'SUCCESS' },
      { id: 'log-2', timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(), user: 'superadmin', action: 'UPDATE_ROLE', detail: 'Gán quyền DE cho user nguyenvan_a', status: 'SUCCESS' },
      { id: 'log-3', timestamp: new Date(Date.now() - 1000 * 3600).toISOString(), user: 'system', action: 'SYNC_CATALOG', detail: 'Đồng bộ metadata từ Trino sang OpenMetadata', status: 'SUCCESS' },
      { id: 'log-4', timestamp: new Date(Date.now() - 1000 * 3600 * 3).toISOString(), user: 'operator_1', action: 'TRIGGER_DAG', detail: 'Kích hoạt workflow daily_etl_pipeline', status: 'SUCCESS' },
      { id: 'log-5', timestamp: new Date(Date.now() - 1000 * 3600 * 6).toISOString(), user: 'data_engineer', action: 'SUBMIT_SPARK', detail: 'Gửi job spark-iceberg-compaction', status: 'SUCCESS' },
    ]

    return Response.json({ success: true, data: logs })
  } catch (err) {
    return handleApiError(err)
  }
}
