import { requireAuth } from '@/lib/require-auth'
import { GlossaryBrowser } from '@/components/modules/openmetadata/glossary-browser'
import { isBaDraftMode } from '@/lib/ba-draft/config'
import { DataToolbar, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid } from '@/components/product/enterprise-page'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function GlossaryPage() {
  if (isBaDraftMode()) {
    const terms = [['Doanh thu thuần','Sales','Data Steward Alpha','Approved','fact_sales_daily'],['Khách hàng hoạt động','Customer','Data Steward Alpha','In review','customer_360'],['Freshness SLA','Platform','Platform Governance','Approved','All published products']]
    return <div className="page-stack"><PageHeader eyebrow="Catalog & governance · controlled vocabulary" title="Business Glossary" description="Định nghĩa thuật ngữ, steward, domain, trạng thái phê duyệt và data products liên quan trong phạm vi mock-only." /><SummaryGrid><SummaryCard label="Terms" value={terms.length} detail="2 approved · 1 review" tone="info"/><SummaryCard label="Domains" value="3" detail="Sales · Customer · Platform" tone="success"/><SummaryCard label="Needs review" value="1" detail="Review due in 5 days" tone="warning"/><SummaryCard label="Related products" value="4" detail="Catalog relationships" tone="info"/></SummaryGrid><DataToolbar placeholder="Tìm term, definition, domain hoặc steward" /><SectionCard title="Controlled terms" description="Deterministic glossary content; OpenMetadata is never contacted"><Table><TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Definition</TableHead><TableHead>Domain</TableHead><TableHead>Steward</TableHead><TableHead>Status</TableHead><TableHead>Related data</TableHead></TableRow></TableHeader><TableBody>{terms.map((term)=><TableRow key={term[0]}><TableCell className="font-medium">{term[0]}</TableCell><TableCell>Định nghĩa nghiệp vụ giả lập được kiểm soát phiên bản.</TableCell><TableCell>{term[1]}</TableCell><TableCell>{term[2]}</TableCell><TableCell><StatusChip tone={term[3]==='Approved'?'success':'warning'}>{term[3]}</StatusChip></TableCell><TableCell className="font-mono text-[10px]">{term[4]}</TableCell></TableRow>)}</TableBody></Table></SectionCard></div>
  }
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <GlossaryBrowser />
}
