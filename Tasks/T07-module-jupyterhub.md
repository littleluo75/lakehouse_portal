# T07 — Module JupyterHub (Notebooks)

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành.

## Mục tiêu
Trang `/notebooks` — quản lý Jupyter Notebook server của user hiện tại.

## Roles được phép
`DE`, `DS`, `Admin`, `SuperAdmin`

## JupyterHub API endpoints
- `GET /hub/api/users/{username}` — trạng thái server của user
  Response: `{ name, server: { ready, url, started } | null, servers: {} }`
- `POST /hub/api/users/{username}/server` — start server
  Body: `{ profile_name: 'standard' | 'medium' | 'large' }`
- `DELETE /hub/api/users/{username}/server` — stop server

**Auth:** Bearer token của user (forward từ session). JupyterHub đã tích hợp Keycloak.
Username lấy từ `session.user.name` (hoặc `preferred_username` từ Keycloak token).

## BFF API Routes
```
GET    /api/jupyter/server         → status của server current user
POST   /api/jupyter/server/start   → { profile: 'standard' | 'medium' | 'large' }
DELETE /api/jupyter/server/stop    → stop server
```

BFF extract `username` từ session, không nhận từ client body (tránh giả mạo).

## Profile definitions (map từ role)

| Profile | Resources | Roles được chọn |
|---|---|---|
| `standard` | 1 CPU, 1GB RAM | DE, DS, Admin, SuperAdmin |
| `medium` | 2 CPU, 2GB RAM | DE, DS, Admin, SuperAdmin |
| `large` | 4 CPU, 4GB RAM | DS, Admin, SuperAdmin |

## UI Components

### Server Status Card (center của trang)
Card lớn, rõ ràng, 3 trạng thái:

**Trạng thái `stopped`:**
- Icon màu gray
- "Workspace chưa khởi động"
- Nút primary "Khởi động Workspace" → mở Profile Dialog

**Trạng thái `starting`:**
- Spinner + "Đang khởi động workspace..."
- Progress bar indeterminate
- Poll `/api/jupyter/server` mỗi 3 giây để check `server.ready`
- Nút "Huỷ" (gọi DELETE)

**Trạng thái `running`:**
- Icon màu green
- "Workspace đang chạy"
- Info: Profile đang dùng, thời gian đã chạy (tính từ `server.started`)
- Nút primary "Mở JupyterLab" → `window.open('https://jupyterhub.lakehouse.local/user/{username}/lab', '_blank')`
- Nút secondary "Tắt Workspace" → confirm dialog → gọi DELETE

### Profile Selection Dialog
Mở khi click "Khởi động Workspace". Hiển thị các profile user được phép:

```
[Radio] Standard   — 1 CPU / 1GB RAM  — Phù hợp: phân tích nhẹ, viết script
[Radio] Medium     — 2 CPU / 2GB RAM  — Phù hợp: xử lý dữ liệu vừa
[Radio] Large      — 4 CPU / 4GB RAM  — Phù hợp: training model, xử lý nặng
```

Nút "Khởi động" → gọi POST, chuyển sang trạng thái `starting`.

### Resource Info Box (khi running)
- CPU / RAM allocation của profile
- Thời gian đã chạy: "Đã chạy 2 giờ 15 phút"
- Note: "Workspace sẽ tự động tắt sau 8 giờ không hoạt động"

## Kiểm tra hoàn thành
- [x] Hiển thị đúng trạng thái server (stopped/starting/running)
- [x] Start server → chuyển sang starting → poll → running
- [x] Nút "Mở JupyterLab" mở đúng URL trong tab mới
- [x] Stop server → confirm → stopped
- [x] Profile Large không hiện với role `DE`
- [x] Role `BA`/`Viewer`/`DA`/`Op`/`PM` redirect `/403`
- [x] `pnpm build` không lỗi
