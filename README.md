# VNPT Data Lighthouse

Giao diện web hợp nhất (Unified Web Portal) cho VNPT Data Platform (VDP), được xây dựng theo mô hình **Backend-For-Frontend (BFF)** nhằm đảm bảo bảo mật tối đa và tích hợp mượt mà với các dịch vụ lõi trong cụm Kubernetes RKE2.

![Dashboard](docs/assets/dashboard.png)

## Tech Stack

Dự án được xây dựng trên nền tảng công nghệ hiện đại, đảm bảo hiệu năng cao và type safety tuyệt đối:
- **Core Framework:** [Next.js 16.2.9](https://nextjs.org/) (App Router) + [TypeScript 5](https://www.typescriptlang.org/) strict mode.
- **Authentication & Authorization:** [Auth.js v5](https://authjs.dev/) (`next-auth@5.0.0-beta.31`) tích hợp với **Keycloak OIDC** (Realm `lakehouse`).
- **Styling & UI Components:** [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (dựa trên Radix UI primitives & Lucide icons).
- **State Management & Data Fetching:** [Zustand v5](https://zustand-demo.pmnd.rs/) + [TanStack React Query v5](https://tanstack.com/query) + [TanStack Table v8](https://tanstack.com/table).
- **Domain Specific Libraries:**
  - SQL Editor: `@uiw/react-codemirror` + `@codemirror/lang-sql` (CodeMirror 6).
  - Database Driver: `mysql2` (cho StarRocks TCP connection).
  - Object Storage: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (cho MinIO S3 path-style).
  - Kubernetes API: `@kubernetes/client-node` (cho Spark Operator CRD queries).

---

## Prerequisites

Để phát triển hoặc triển khai VNPT Data Lighthouse, hệ thống cần đáp ứng các yêu cầu sau:
- **Node.js:** `>= 20.0.0`
- **Package Manager:** `pnpm >= 9.0.0`
- **Hạ tầng mạng:** Đã cấu hình phân dải DNS hoặc `/etc/hosts` trỏ các domain `*.lakehouse.local` tới Bastion Host (`10.167.70.16`).
- **Quyền truy cập:** Keycloak Client credentials (`vdp-portal`) thuộc realm `lakehouse` trong cụm K8s.

---

## Quick Start (Local Development)

1. **Clone repository:**
   ```bash
   git clone https://github.com/vnpt/lakehouse_portal.git
   cd lakehouse_portal/vdp-portal
   ```

2. **Cấu hình biến môi trường:**
   Copy file mẫu và điền các thông số kết nối nội bộ (hoặc proxy local):
   ```bash
   cp .env.example .env.local
   ```

3. **Cài đặt dependencies:**
   ```bash
   pnpm install
   ```

4. **Khởi chạy Development Server:**
   ```bash
   pnpm dev
   ```
   Mở trình duyệt tại [http://localhost:3000](http://localhost:3000) để truy cập cổng thông tin.

---

## Architecture Overview

VNPT Data Lighthouse áp dụng triệt để mô hình **Backend-For-Frontend (BFF)**. Trình duyệt của người dùng **không bao giờ** kết nối trực tiếp với các API nội bộ (trừ một số iframe/link tĩnh); mọi request đều đi qua lớp API Route của Next.js (`/api/*`), nơi thực hiện kiểm tra quyền (RBAC), đính kèm token xác thực (Bearer/Basic Auth) và proxy tới ClusterIP của các service trong Kubernetes.

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                BROWSER CLIENT                                        │
│  (Next.js React UI — Không chứa Credentials, chỉ lưu HTTP-Only Session Cookie)       │
└──────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │ Request tới /api/* (kèm Cookie)
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                NEXT.JS BFF LAYER                                     │
│  ┌───────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────┐  │
│  │  Auth & RBAC Guard    │──▶│ Internal Client Factory  │──▶│ Error Mapping Layer │  │
│  │  (Validate JWT Role)  │   │ (+ Timeout & Auth Inject)│   │ (Map 401/503/504)   │  │
│  └───────────────────────┘   └──────────────────────────┘   └─────────────────────┘  │
└──────────────────────────────────────────┬───────────────────────────────────────────┘
                                           │ Internal HTTP / TCP Forwarding
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                            KUBERNETES CLUSTER SERVICES                               │
│  Airflow (8080) │ Trino (8080) │ StarRocks (30030) │ MinIO (9000) │ OpenMetadata (8585)│
└──────────────────────────────────────────────────────────────────────────────────────┘
```

Xem chi tiết kiến trúc tại [docs/architecture.md](docs/architecture.md).

---

## Danh Sách Module & Phân Quyền (RBAC)

Ma trận phân quyền dưới đây phản ánh ánh xạ thực tế từ cấu hình `ROUTE_PERMISSIONS` trong proxy của portal:

| Module | Đường Dẫn (Route) | Vai Trò Được Phép Truy Cập (Keycloak Roles) | Dịch Vụ Đích Tích Hợp |
|---|---|---|---|
| **Workflows** | `/workflows` | `DE`, `Op`, `Admin`, `SuperAdmin` | Apache Airflow REST API |
| **Data Catalog** | `/catalog` | `DE`, `DS`, `DA`, `BA`, `Admin`, `SuperAdmin` | OpenMetadata API v1 |
| **SQL Editor** | `/query` | `DE`, `DS`, `DA`, `Admin`, `SuperAdmin` *(Lưu ý: `DA` bị block thao tác WRITE)* | Trino OLAP & StarRocks Data Warehouse |
| **Notebooks** | `/notebooks` | `DE`, `DS`, `Admin`, `SuperAdmin` | JupyterHub Hub API |
| **Storage Browser** | `/storage` | `DE`, `DS`, `Op`, `Admin`, `SuperAdmin` | MinIO S3 API (Path-style access) |
| **Data Streams** | `/streams` | `DE`, `Op`, `Admin`, `SuperAdmin` | Kafka Monitor / Streams Service |
| **Spark Jobs** | `/jobs` | `DE`, `Op`, `Admin`, `SuperAdmin` | Spark Operator K8s CRD (`v1beta2`) |
| **Observability** | `/observability` | `Op`, `Admin`, `SuperAdmin`, `PM` | Grafana Dashboards & Prometheus Health |
| **Admin Panel** | `/admin` | `SuperAdmin` | Keycloak Admin REST API |

---

## Documentation

Hệ thống tài liệu kỹ thuật đầy đủ được lưu trữ tại thư mục `docs/`:
- [Kiến Trúc & Luồng Dữ Liệu (Architecture)](docs/architecture.md)
- [Hướng Dẫn Triển Khai & DevOps (Deployment)](docs/deployment.md)
- [Chi Tiết Từng Module Chức Năng](docs/modules/)
- [Quy Chuẩn Đóng Góp & Phát Triển (Contributing)](docs/contributing.md)
- [Xử Lý Sự Cố Thường Gặp (Troubleshooting)](docs/troubleshooting.md)