# T05 — Module OpenMetadata (Data Catalog)

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành.

## Mục tiêu
Trang `/catalog` — tìm kiếm và khám phá data assets trong OpenMetadata.

## Roles được phép
`DE`, `DS`, `DA`, `BA`, `Admin`, `SuperAdmin`

## OpenMetadata API endpoints
- `GET /api/v1/search/query?q={query}&index=table_search_index&from=0&size=25` — full-text search
- `GET /api/v1/tables?limit=25&fields=columns,tags,owner` — list tables
- `GET /api/v1/tables/{id}?fields=columns,tags,owner,followers` — table detail
- `GET /api/v1/lineage/table/{id}?upstreamDepth=2&downstreamDepth=2` — lineage graph
- `GET /api/v1/glossaryTerms?limit=50` — glossary terms

**Auth:** Basic Auth `admin:admin` từ BFF — KHÔNG expose ra client.
(TODO sau khi merge PR-4 OIDC: đổi sang Bearer token)

## BFF API Routes
```
GET /api/openmetadata/search?q=&limit=25&page=0
GET /api/openmetadata/tables
GET /api/openmetadata/tables/[id]
GET /api/openmetadata/lineage/[id]
GET /api/openmetadata/glossary
```

## TypeScript types — `src/types/openmetadata.ts`
```typescript
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
```

## UI Components

### Search Bar (đầu trang, nổi bật)
- Input lớn placeholder "Tìm kiếm tables, schemas, datasets..."
- Debounce 300ms trước khi gọi API
- Hiển thị số kết quả: "Tìm thấy X kết quả cho '{query}'"

### Results Grid (card layout)
Mỗi card hiển thị:
- Tên table (bold) + fullyQualifiedName (mờ)
- Database.Schema
- Mô tả (truncate 2 dòng)
- Tags (badge list, tối đa 3 + "+N more")
- Owner
- Click card → mở Table Detail

### Filter Sidebar (bên trái)
- Filter theo Database (checkbox list)
- Filter theo Schema (checkbox list, phụ thuộc database đã chọn)
- Filter theo Tags (checkbox list)

### Table Detail View (trang riêng `/catalog/[id]`)

**Tab "Schema":**
- Bảng columns: Tên | Type | Nullable | Description | Tags
- Sortable theo tên cột

**Tab "Lineage":**
- Thử nhúng iframe: `https://openmetadata.lakehouse.local/explore/tables/{fqn}?activeTab=lineage`
- Nếu iframe bị block (X-Frame-Options): fallback hiển thị text list
  - Upstream: "← Dữ liệu từ: [table1], [table2]"
  - Downstream: "→ Dữ liệu tới: [table3]"

**Tab "Glossary":**
- List glossary terms liên quan đến table (nếu có tags match)

### Glossary Browser (`/catalog/glossary`)
- Danh sách terms dạng list: tên term, mô tả ngắn
- Search filter theo tên

## Kiểm tra hoàn thành
- [ ] Search trả về kết quả thực từ OpenMetadata
- [ ] Filter sidebar thu hẹp kết quả đúng
- [ ] Table detail hiển thị đúng columns
- [ ] Lineage tab hiển thị (iframe hoặc text fallback)
- [ ] Basic Auth credentials không xuất hiện trong browser Network tab
- [ ] Loading skeleton + empty state
- [ ] `pnpm build` không lỗi
