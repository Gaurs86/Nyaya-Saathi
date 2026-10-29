import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent, type ReactNode } from 'react'
import {
  AlertTriangle, Archive, ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3, BriefcaseBusiness,
  Check, CircleCheck, Clock3, FilePlus2, FileText,
  Files, FolderOpen, Gavel, History, Home, LockKeyhole, LogOut, MessageSquareText, MoreHorizontal,
  Plus, RefreshCw, Search, Settings, ShieldCheck, Trash2, Upload, Users, X,
} from 'lucide-react'

type View = 'dashboard' | 'upload' | 'queue' | 'cases' | 'reports' | 'resources' | 'settings'
type CaseStatus = 'pending_review' | 'changes_requested' | 'approved' | 'rejected'
type Party = { role?: string | null; name?: string | null; source_quote?: string | null; page_number?: number | null }
type DateEntry = {
  label?: string | null
  original_text?: string | null
  date_as_written_iso?: string | null
  duration_days_as_written?: number | null
  duration_from_as_written?: string | null
  page_number?: number | null
  preliminary_assessment?: Record<string, unknown> | null
}
type Provision = { act?: string | null; section?: string | null; source_quote?: string | null; page_number?: number | null }
type Evidence = {
  field?: string
  value?: string
  quote?: string
  page_number?: number | null
  quote_match_status?: string
  verification_status?: string
}
type Brief = {
  schema_version?: string
  document?: { type?: string; type_confidence?: string; readable?: boolean; issuing_authority?: string; case_number?: string }
  summary?: string
  parties?: Party[]
  demands_or_claims?: string[]
  dates_and_periods?: DateEntry[]
  legal_provisions_cited?: Provision[]
  supporting_evidence?: Evidence[]
  urgency_flags?: { type?: string; reason?: string; priority?: string }[]
  information_to_confirm?: string[]
  [key: string]: unknown
}
type ReviewCase = {
  case_id: string
  title: string
  doc_type: string | null
  status: CaseStatus
  revision: number
  created_at: string
  updated_at: string
  created_by: string
  brief?: Brief
}
type Counts = { total: number } & Record<CaseStatus, number>
type AuditEvent = { event_id: number; actor_label: string; action: string; event_at: string; details: Record<string, unknown> }
type AnalysisResult = { session_id: string; answer_markdown: string; urgent: boolean; lawyer_brief: Brief }
type UploadDocument = { files: File[]; language: string; receivedDate: string; district: string }

const EMPTY_COUNTS: Counts = { total: 0, pending_review: 0, changes_requested: 0, approved: 0, rejected: 0 }
const STATUSES: CaseStatus[] = ['pending_review', 'approved', 'changes_requested', 'rejected']
const STATUS_LABEL: Record<CaseStatus, string> = {
  pending_review: 'Pending review',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  rejected: 'Rejected',
}
const DOC_TYPES: Record<string, string> = {
  court_summons: 'Court summons',
  eviction_or_rent: 'Rental dispute',
  cheque_bounce_138: 'Negotiable instruments',
  labour_or_wage: 'Labour & employment',
  scheme_rejection: 'Government scheme',
  family_or_maintenance: 'Family matter',
  other: 'Other legal notice',
}

function pretty(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—'
}

function dateLabel(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, options ?? { day: '2-digit', month: 'short', year: 'numeric' })
}

async function readError(response: Response) {
  try {
    const body = await response.json() as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
  } catch {
    // Keep an HTTP fallback for non-JSON responses.
  }
  return `Request failed (${response.status}).`
}

function statusStyle(status: CaseStatus) {
  return {
    pending_review: 'bg-amber-50 text-amber-800 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    changes_requested: 'bg-orange-50 text-orange-800 ring-orange-200',
    rejected: 'bg-rose-50 text-rose-800 ring-rose-200',
  }[status]
}

function StatusBadge({ status }: { status: CaseStatus }) {
  const Icon = status === 'approved' ? CircleCheck : status === 'rejected' ? X : status === 'changes_requested' ? AlertTriangle : Clock3
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusStyle(status)}`}><Icon size={12} />{STATUS_LABEL[status]}</span>
}

function IconButton({ label, onClick, children, className = '' }: { label: string; onClick: () => void; children: ReactNode; className?: string }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${className}`}>{children}</button>
}

function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`grid shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 ${small ? 'h-9 w-9' : 'h-10 w-10'}`}><Gavel size={small ? 18 : 20} aria-hidden="true" /></span>
}

function Sidebar({ view, setView, counts }: { view: View; setView: (view: View) => void; counts: Counts }) {
  const primary: { id: View; label: string; icon: typeof Home }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'upload', label: 'Upload document', icon: Upload },
    { id: 'queue', label: 'Review queue', icon: Archive },
    { id: 'cases', label: 'All cases', icon: Files },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'resources', label: 'Legal resources', icon: Gavel },
  ]
  return <aside className="hidden min-h-[calc(100vh-68px)] w-[232px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 md:flex">
    <div className="mb-7 flex items-center gap-2.5 px-2"><BrandMark small /><div className="leading-tight"><strong className="block text-sm font-extrabold tracking-tight">Nyaya-Saathi</strong><span className="text-[10px] text-slate-500">Legal Notice Assistant</span></div></div>
    <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">Workspace</p>
    <nav className="grid gap-1" aria-label="Main navigation">
      {primary.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setView(id)} aria-current={view === id ? 'page' : undefined} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition ${view === id ? 'bg-indigo-50 text-indigo-800 ring-1 ring-inset ring-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={17} />{label}{id === 'queue' && counts.pending_review > 0 && <span className="ml-auto min-w-5 rounded-full bg-rose-100 px-1.5 text-center text-[10px] font-bold text-rose-700">{counts.pending_review}</span>}</button>)}
    </nav>
    <div className="mt-auto">
      <button type="button" onClick={() => setView('settings')} className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold ${view === 'settings' ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-50'}`}><Settings size={17} />Settings</button>
      <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-[11px] leading-5 text-amber-900"><strong className="block text-xs">Review carefully</strong>AI-extracted facts and dates must be checked against the original notice.</div>
    </div>
  </aside>
}

function Header({ reviewer, onDisconnect, onNavigate }: { reviewer: string; onDisconnect: () => void; onNavigate: (view: View) => void }) {
  return <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
    <div className="flex items-center gap-2.5 md:hidden"><BrandMark small /><div className="leading-tight"><strong className="block text-sm font-extrabold">Nyaya-Saathi</strong><span className="text-[10px] text-slate-500">Legal Notice Assistant</span></div></div>
    <div className="hidden text-xs font-medium text-slate-500 md:block">Lawyer workspace <span className="mx-1 text-slate-300">/</span> Private prototype</div>
    <div className="ml-auto flex items-center gap-2 sm:gap-3">
      <button type="button" onClick={() => onNavigate('upload')} className="hidden min-h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 sm:inline-flex"><Plus size={15} />New analysis</button>
      <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-[11px] font-extrabold text-indigo-800">{(reviewer || 'R').slice(0, 2).toUpperCase()}</span>
      <span className="hidden max-w-32 truncate text-xs font-semibold text-slate-700 sm:block">{reviewer || 'Reviewer'}</span>
      <button type="button" onClick={onDisconnect} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50" title="Disconnect"><LogOut size={14} /><span className="hidden sm:inline">Disconnect</span></button>
    </div>
  </header>
}

function PageTitle({ eyebrow = 'Workspace', title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-indigo-700">{eyebrow}</p><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p></div>{action}</div>
}

function SummaryCard({ label, value, icon: Icon, tone, onClick }: { label: string; value: number; icon: typeof Clock3; tone: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-[0_1px_4px_rgba(15,23,42,.03)] transition hover:border-indigo-200 hover:shadow-sm sm:p-4"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={17} /></span><span className="min-w-0"><span className="block text-xl font-extrabold leading-tight text-slate-900">{value}</span><span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-500 sm:text-xs">{label}</span></span></button>
}

function CaseTable({ items, onOpen, compact = false }: { items: ReviewCase[]; onOpen: (id: string) => void; compact?: boolean }) {
  return <div className="overflow-x-auto">
    <table className="w-full min-w-[690px] border-collapse text-left text-xs">
      <thead><tr className="border-y border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wide text-slate-500"><th className="px-3 py-2.5">Title</th><th className="px-3 py-2.5">Document type</th><th className="px-3 py-2.5">Updated</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5 text-right">Action</th></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {items.length ? items.map((item) => <tr key={item.case_id} className="hover:bg-slate-50/70">
          <td className="max-w-[230px] px-3 py-3"><button type="button" onClick={() => onOpen(item.case_id)} className="block max-w-full truncate text-left font-bold text-slate-800 hover:text-indigo-700">{item.title}</button><span className="mt-1 block font-mono text-[9px] text-slate-400">#{item.case_id.slice(0, 10)}</span></td>
          <td className="px-3 py-3 text-slate-600">{DOC_TYPES[item.doc_type ?? ''] ?? pretty(item.doc_type)}</td><td className="whitespace-nowrap px-3 py-3 text-slate-500">{dateLabel(item.updated_at)}</td><td className="px-3 py-3"><StatusBadge status={item.status} /></td>
          <td className="px-3 py-3 text-right"><button type="button" onClick={() => onOpen(item.case_id)} className="rounded-md border border-indigo-100 bg-white px-3 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50">{item.status === 'pending_review' || item.status === 'changes_requested' ? 'Review' : 'View'}</button>{!compact && <button type="button" onClick={() => onOpen(item.case_id)} className="ml-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="More case actions"><MoreHorizontal size={15} /></button>}</td>
        </tr>) : <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No cases match these filters.</td></tr>}
      </tbody>
    </table>
  </div>
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-[0_1px_5px_rgba(15,23,42,.035)] ${className}`}>{children}</section>
}

function App() {
  const [token, setToken] = useState('')
  const [reviewer, setReviewer] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [reviewerInput, setReviewerInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [view, setViewState] = useState<View>(() => viewFromUrl())
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS)
  const [cases, setCases] = useState<ReviewCase[]>([])
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null)
  const [audit, setAudit] = useState<AuditEvent[]>([])
  const [edited, setEdited] = useState<Brief | null>(null)
  const [caseSearch, setCaseSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [correctionNote, setCorrectionNote] = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const [confirmSource, setConfirmSource] = useState(false)
  const [confirmFacts, setConfirmFacts] = useState(false)
  const [confirmDeadline, setConfirmDeadline] = useState(false)
  const [upload, setUpload] = useState<UploadDocument>({ files: [], language: 'en', receivedDate: '', district: '' })
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [ephemeralSource, setEphemeralSource] = useState<File[]>([])
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'history'>('details')
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sync = () => {
      setViewState(viewFromUrl())
      setSelectedCase(null)
      setEdited(null)
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const visibleCases = useMemo(() => cases.filter((item) => {
    const term = caseSearch.trim().toLowerCase()
    const matchesText = !term || `${item.title} ${item.doc_type ?? ''} ${item.case_id} ${item.created_by}`.toLowerCase().includes(term)
    const matchesStatus = !statusFilter || item.status === statusFilter
    const matchesType = !typeFilter || item.doc_type === typeFilter
    const matchesDate = !dateFilter || new Date(item.updated_at) >= new Date(`${dateFilter}T00:00:00`)
    const matchesQueue = view !== 'queue' || item.status === 'pending_review' || item.status === 'changes_requested'
    return matchesText && matchesStatus && matchesType && matchesDate && matchesQueue
  }), [cases, caseSearch, statusFilter, typeFilter, dateFilter, view])

  function apiHeaders(json = false) {
    const headers = new Headers({ 'X-Reviewer-Token': token, 'X-Reviewer-Label': reviewer || 'reviewer' })
    if (json) headers.set('Content-Type', 'application/json')
    return headers
  }

  async function api(path: string, init: RequestInit = {}) {
    const headers = apiHeaders(Boolean(init.body && typeof init.body === 'string'))
    new Headers(init.headers).forEach((value, key) => headers.set(key, value))
    const response = await fetch(path, { ...init, headers })
    if (!response.ok) throw new Error(await readError(response))
    return response
  }

  async function reloadData() {
    const [summaryResponse, listResponse] = await Promise.all([
      api('/review/summary'),
      api('/review/cases?limit=200'),
    ])
    const summary = await summaryResponse.json() as Counts
    const list = await listResponse.json() as { cases?: ReviewCase[] }
    setCounts(summary)
    setCases(list.cases ?? [])
    if (selectedCase) {
      const current = (list.cases ?? []).find((item) => item.case_id === selectedCase.case_id)
      if (current && current.revision !== selectedCase.revision) {
        const refreshed = await api(`/review/cases/${encodeURIComponent(current.case_id)}`)
        const full = await refreshed.json() as ReviewCase
        setSelectedCase(full)
        setEdited(structuredClone(full.brief ?? {}))
      }
    }
  }

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!tokenInput.trim()) { setAuthError('Enter the workspace token.'); return }
    setConnecting(true)
    setAuthError('')
    setToken(tokenInput.trim())
    setReviewer(reviewerInput.trim() || 'reviewer')
    try {
      const headers = new Headers({
        'X-Reviewer-Token': tokenInput.trim(),
        'X-Reviewer-Label': reviewerInput.trim() || 'reviewer',
      })
      const [summaryResponse, listResponse] = await Promise.all([
        fetch('/review/summary', { headers }),
        fetch('/review/cases?limit=200', { headers }),
      ])
      if (!summaryResponse.ok) throw new Error(await readError(summaryResponse))
      if (!listResponse.ok) throw new Error(await readError(listResponse))
      const summary = await summaryResponse.json() as Counts
      const list = await listResponse.json() as { cases?: ReviewCase[] }
      setCounts(summary)
      setCases(list.cases ?? [])
      setConnected(true)
      setTokenInput('')
      setReviewerInput('')
      const caseId = new URLSearchParams(location.search).get('case_id')
      if (caseId) {
        const [caseResponse, eventsResponse] = await Promise.all([
          fetch(`/review/cases/${encodeURIComponent(caseId)}`, { headers }),
          fetch(`/review/cases/${encodeURIComponent(caseId)}/events`, { headers }),
        ])
        if (!caseResponse.ok) throw new Error(await readError(caseResponse))
        if (!eventsResponse.ok) throw new Error(await readError(eventsResponse))
        const item = await caseResponse.json() as ReviewCase
        const eventData = await eventsResponse.json() as { events?: AuditEvent[] }
        setSelectedCase(item)
        setViewState(view === 'queue' ? 'queue' : 'cases')
        setEdited(structuredClone(item.brief ?? {}))
        setAudit(eventData.events ?? [])
      }
    } catch (caught) {
      setToken('')
      setReviewer('')
      setAuthError(caught instanceof Error ? caught.message : 'Could not connect to the review workspace.')
    } finally {
      setConnecting(false)
    }
  }

  function disconnect() {
    setToken('')
    setReviewer('')
    setConnected(false)
    setCases([])
    setCounts(EMPTY_COUNTS)
    setSelectedCase(null)
    setEdited(null)
    setAudit([])
    setEphemeralSource([])
    setNotice('')
    setError('')
    setView('dashboard')
  }

  function setView(next: View) {
    setViewState(next)
    setSelectedCase(null)
    setEdited(null)
    setError('')
    setNotice('')
    const url = new URL(window.location.href)
    url.pathname = '/'
    url.searchParams.set('view', next)
    url.searchParams.delete('case_id')
    window.history.pushState(null, '', url.pathname + url.search)
  }

  async function openCase(id: string) {
    setError('')
    setNotice('')
    try {
      const [caseResponse, eventsResponse] = await Promise.all([
        api(`/review/cases/${encodeURIComponent(id)}`),
        api(`/review/cases/${encodeURIComponent(id)}/events`),
      ])
      const item = await caseResponse.json() as ReviewCase
      const eventData = await eventsResponse.json() as { events?: AuditEvent[] }
      setSelectedCase(item)
      setViewState(view === 'queue' ? 'queue' : 'cases')
      setEdited(structuredClone(item.brief ?? {}))
      setAudit(eventData.events ?? [])
      setCorrectionNote('')
      setDecisionNote('')
      setConfirmSource(false)
      setConfirmFacts(false)
      setConfirmDeadline(false)
      setActiveTab('details')
      const url = new URL(window.location.href)
      url.pathname = '/'
      url.searchParams.set('view', view === 'queue' ? 'queue' : 'cases')
      url.searchParams.set('case_id', id)
      window.history.pushState(null, '', url.pathname + url.search)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open this case.')
    }
  }

  async function refresh() {
    setError('')
    try { await reloadData(); setNotice('Workspace refreshed.') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not refresh cases.') }
  }

  function addUploadFiles(incoming: File[]) {
    setUploadError('')
    if (!incoming.length) return
    const pdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const image = (file: File) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || /\.(jpe?g|png|gif|webp)$/i.test(file.name)
    if (incoming.some((file) => !pdf(file) && !image(file))) { setUploadError('Choose a PDF, JPEG, PNG, GIF or WebP file.'); return }
    if (incoming.filter(pdf).length > 1 || (incoming.some(pdf) && incoming.length > 1)) { setUploadError('Upload one PDF by itself, or up to three images.'); return }
    const next = incoming.some(pdf) ? incoming : [...upload.files.filter((file) => !pdf(file)), ...incoming]
    if (next.length > 3) { setUploadError('Choose one PDF or up to three images.'); return }
    if (next.some((file) => file.size > 12 * 1024 * 1024)) { setUploadError('Each file must be 12 MB or less.'); return }
    if (next.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) { setUploadError('Combined file size must be 20 MB or less.'); return }
    setUpload({ ...upload, files: next })
  }

  function updateUpload(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addUploadFiles(Array.from(event.target.files))
    event.target.value = ''
  }

  async function analyzeAndCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUploadError('')
    if (!upload.files.length) { setUploadError('Choose at least one document.'); return }
    setUploading(true)
    try {
      const body = new FormData()
      upload.files.forEach((file) => body.append('files', file, file.name))
      body.append('language', upload.language)
      body.append('received_date', upload.receivedDate)
      body.append('district', upload.district)
      const response = await fetch('/analyze', { method: 'POST', headers: apiHeaders(), body })
      if (!response.ok) throw new Error(await readError(response))
      const result = await response.json() as AnalysisResult
      if (!result.lawyer_brief?.schema_version) throw new Error('Analysis returned no lawyer brief.')
      const title = window.prompt('Matter title (avoid unnecessary personal identifiers):', `${DOC_TYPES[String(result.lawyer_brief.document?.type)] ?? 'Legal notice'} intake`)
      if (title === null) return
      const createdResponse = await api('/review/cases', {
        method: 'POST',
        body: JSON.stringify({ brief: result.lawyer_brief, title }),
      })
      const created = await createdResponse.json() as ReviewCase
      setEphemeralSource(upload.files)
      setUpload({ files: [], language: upload.language, receivedDate: '', district: '' })
      await reloadData()
      await openCase(created.case_id)
      setNotice('Analysis complete. The extracted brief was saved as a draft for lawyer review.')
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : 'The document could not be analyzed or saved.')
    } finally {
      setUploading(false)
    }
  }

  function updateBrief<K extends keyof Brief>(key: K, value: Brief[K]) {
    setEdited((current) => current ? { ...current, [key]: value } : current)
  }

  async function saveCorrections() {
    if (!selectedCase || !edited) return
    setSaving(true)
    setError('')
    try {
      const changes = {
        summary: String(edited.summary ?? ''),
        parties: edited.parties ?? [],
        demands_or_claims: edited.demands_or_claims ?? [],
        dates_and_periods: normalizeDates(edited.dates_and_periods ?? [], selectedCase.brief?.dates_and_periods ?? []),
        legal_provisions_cited: edited.legal_provisions_cited ?? [],
        information_to_confirm: edited.information_to_confirm ?? [],
      }
      const response = await api(`/review/cases/${encodeURIComponent(selectedCase.case_id)}/brief`, {
        method: 'PUT',
        body: JSON.stringify({ changes, expected_revision: selectedCase.revision, note: correctionNote }),
      })
      const saved = await response.json() as ReviewCase
      setSelectedCase(saved)
      setEdited(structuredClone(saved.brief ?? {}))
      setAudit((await (await api(`/review/cases/${encodeURIComponent(saved.case_id)}/events`)).json() as { events?: AuditEvent[] }).events ?? [])
      await reloadData()
      setNotice('Corrections saved. The brief is pending review again.')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save corrections.') }
    finally { setSaving(false) }
  }

  async function decide(decision: 'approved' | 'changes_requested' | 'rejected') {
    if (!selectedCase) return
    if (decision === 'approved' && !(confirmSource && confirmFacts && confirmDeadline)) {
      setError('Confirm the source, extracted facts, and date/deadline review before approving.')
      return
    }
    if (decision === 'changes_requested' && !decisionNote.trim()) {
      setError('Add a note describing the changes requested.')
      return
    }
    const message = decision === 'approved' ? 'Approve this draft for your workflow?' : decision === 'rejected' ? 'Reject this intake?' : 'Request changes to this draft?'
    if (!window.confirm(`${message} This decision will be added to the audit history.`)) return
    setSaving(true)
    setError('')
    try {
      const response = await api(`/review/cases/${encodeURIComponent(selectedCase.case_id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          expected_revision: selectedCase.revision,
          note: decisionNote,
          confirmations: { source_checked: confirmSource, facts_checked: confirmFacts, deadline_reviewed: confirmDeadline },
        }),
      })
      const updated = await response.json() as ReviewCase
      setSelectedCase(updated)
      setEdited(structuredClone(updated.brief ?? {}))
      setAudit((await (await api(`/review/cases/${encodeURIComponent(updated.case_id)}/events`)).json() as { events?: AuditEvent[] }).events ?? [])
      await reloadData()
      setNotice(`Decision recorded: ${STATUS_LABEL[decision]}.`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not record this decision.') }
    finally { setSaving(false) }
  }

  async function exportCase(format: 'pdf' | 'docx') {
    if (!selectedCase || selectedCase.status !== 'approved') return
    try {
      const response = await api(`/review/cases/${encodeURIComponent(selectedCase.case_id)}/export?format=${format}`)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `nyaya-saathi-${selectedCase.case_id.slice(0, 12)}-reviewed.${format}`
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not export this brief.') }
  }

  async function deleteCase() {
    if (!selectedCase || !window.confirm('Permanently delete this case and its audit history? This cannot be undone.')) return
    try {
      await api(`/review/cases/${encodeURIComponent(selectedCase.case_id)}?confirm=true`, { method: 'DELETE' })
      setSelectedCase(null)
      setEdited(null)
      setAudit([])
      setEphemeralSource([])
      await reloadData()
      setNotice('Case and its audit history were deleted.')
      setView('cases')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not delete the case.') }
  }

  function updateRow<T>(key: 'parties' | 'dates_and_periods' | 'legal_provisions_cited', index: number, field: string, value: string) {
    if (!edited) return
    const rows = [...(edited[key] as T[] ?? [])] as (T & Record<string, unknown>)[]
    const old = rows[index] as T & Record<string, unknown>
    let parsed: unknown = value === '' ? null : value
    if (field === 'page_number' || field === 'duration_days_as_written') parsed = value === '' ? null : Number(value)
    rows[index] = { ...old, [field]: parsed }
    updateBrief(key, rows as Brief[typeof key])
  }

  function addRow(key: 'parties' | 'dates_and_periods' | 'legal_provisions_cited') {
    if (!edited) return
    const defaults = {
      parties: { role: 'other', name: '', source_quote: '', page_number: null },
      dates_and_periods: { label: '', original_text: '', date_as_written_iso: '', duration_days_as_written: null, duration_from_as_written: '', page_number: null, preliminary_assessment: null },
      legal_provisions_cited: { act: '', section: '', source_quote: '', page_number: null },
    }
    updateBrief(key, [...(edited[key] as unknown[] ?? []), defaults[key]] as Brief[typeof key])
  }

  function removeRow(key: 'parties' | 'dates_and_periods' | 'legal_provisions_cited', index: number) {
    if (!edited) return
    updateBrief(key, (edited[key] as unknown[] ?? []).filter((_, itemIndex) => itemIndex !== index) as Brief[typeof key])
  }

  const isSelected = Boolean(selectedCase)

  if (!connected) return <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
    <header className="flex h-[68px] items-center border-b border-slate-200 bg-white px-5 sm:px-8"><div className="flex items-center gap-3"><BrandMark /><div><strong className="block text-sm font-extrabold">Nyaya-Saathi</strong><span className="text-[11px] text-slate-500">Lawyer workspace</span></div></div></header>
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-7">
      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-[1fr_.85fr]">
        <section className="p-6 sm:p-10"><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-indigo-700">Private workspace</p><h1 className="text-3xl font-extrabold tracking-tight">Connect to case review</h1><p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">Sign in with the workspace token configured by the administrator. The token stays in this page’s memory and is cleared when you disconnect or close the tab.</p>
          <form onSubmit={(event) => void connect(event)} className="mt-7 grid gap-4">
            <div><label htmlFor="token" className="mb-1.5 block text-xs font-bold text-slate-700">Workspace token</label><input id="token" type="password" autoComplete="off" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100" required /></div>
            <div><label htmlFor="reviewer" className="mb-1.5 block text-xs font-bold text-slate-700">Reviewer name or label</label><input id="reviewer" maxLength={80} value={reviewerInput} onChange={(event) => setReviewerInput(event.target.value)} placeholder="e.g. Gaurang" className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-100" /></div>
            {authError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{authError}</p>}
            <button type="submit" disabled={connecting} className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{connecting ? <RefreshCw size={16} className="animate-spin" /> : <LockKeyhole size={16} />}Connect and load cases</button>
          </form>
        </section>
        <aside className="border-t border-slate-100 bg-slate-50/80 p-6 sm:p-10 md:border-l md:border-t-0"><div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><ShieldCheck size={23} /></div><h2 className="mt-4 text-lg font-extrabold">Private prototype</h2><p className="mt-2 text-sm leading-6 text-slate-600">Reviewer labels are self-reported, not verified identities. Case details are stored in local SQLite by this prototype; the original upload is not retained.</p><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Before using client matters:</strong> confirm your organization’s data-handling requirements and use an approved identity and storage setup.</div></aside>
      </div>
    </main>
  </div>

  return <div className="min-h-screen bg-[#f7f8fb] text-slate-900">
    <Header reviewer={reviewer} onDisconnect={disconnect} onNavigate={setView} />
    <div className="flex min-h-[calc(100vh-68px)]">
      <Sidebar view={view} setView={setView} counts={counts} />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px]">
          {error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          {notice && <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={16} /></button></div>}

          {view === 'dashboard' && !isSelected && <Dashboard counts={counts} cases={cases} onNavigate={setView} onOpen={openCase} onRefresh={() => void refresh()} />}
          {view === 'upload' && !isSelected && <UploadPage upload={upload} setUpload={setUpload} error={uploadError} uploading={uploading} dragging={dragging} setDragging={setDragging} fileInput={fileInput} addFiles={addUploadFiles} updateFiles={updateUpload} removeFile={(index) => setUpload({ ...upload, files: upload.files.filter((_, itemIndex) => itemIndex !== index) })} onSubmit={analyzeAndCreate} />}
          {(view === 'queue' || view === 'cases') && !isSelected && <CasesPage view={view} cases={visibleCases} counts={counts} total={counts.total} search={caseSearch} setSearch={setCaseSearch} status={statusFilter} setStatus={setStatusFilter} type={typeFilter} setType={setTypeFilter} date={dateFilter} setDate={setDateFilter} onOpen={openCase} onUpload={() => setView('upload')} onRefresh={() => void refresh()} />}
          {isSelected && selectedCase && edited && <CaseDetail item={selectedCase} brief={edited} audit={audit} sourceFiles={ephemeralSource} activeTab={activeTab} setActiveTab={setActiveTab} updateBrief={updateBrief} updateRow={updateRow} addRow={addRow} removeRow={removeRow} correctionNote={correctionNote} setCorrectionNote={setCorrectionNote} decisionNote={decisionNote} setDecisionNote={setDecisionNote} confirmations={{ source: confirmSource, facts: confirmFacts, deadline: confirmDeadline }} setConfirmations={(key, checked) => { if (key === 'source') setConfirmSource(checked); if (key === 'facts') setConfirmFacts(checked); if (key === 'deadline') setConfirmDeadline(checked) }} saving={saving} onSave={() => void saveCorrections()} onDiscard={() => { if (selectedCase) void openCase(selectedCase.case_id) }} onDecide={(decision) => void decide(decision)} onExport={(format) => void exportCase(format)} onDelete={() => void deleteCase()} onBack={() => { setSelectedCase(null); setEdited(null); setEphemeralSource([]); setView(view) }} />}
          {view === 'reports' && !isSelected && <PlaceholderPage title="Reports" subtitle="Usage and extraction quality" icon={BarChart3} message="Reporting is not available in this prototype. The current events endpoint is aggregate usage data, not an authenticated case-reporting dashboard, so this page does not display invented totals or accuracy figures." />}
          {view === 'resources' && !isSelected && <ResourcesPage />}
          {view === 'settings' && !isSelected && <PlaceholderPage title="Settings" subtitle="Workspace and data handling" icon={Settings} message={`Connected as ${reviewer}. The reviewer token is held in memory only. This prototype uses a shared token and local SQLite; configure authentication, retention and protected storage before using live client records.`} />}
        </div>
      </main>
    </div>
    <MobileNav view={view} setView={setView} />
  </div>
}

function viewFromUrl(): View {
  const value = new URLSearchParams(window.location.search).get('view')
  return ['dashboard', 'upload', 'queue', 'cases', 'reports', 'resources', 'settings'].includes(value ?? '') ? value as View : 'dashboard'
}

function Dashboard({ counts, cases, onNavigate, onOpen, onRefresh }: { counts: Counts; cases: ReviewCase[]; onNavigate: (view: View) => void; onOpen: (id: string) => void; onRefresh: () => void }) {
  return <>
    <PageTitle title="Welcome to your workspace" subtitle="Manage legal documents and review AI-generated intake briefs." action={<button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"><RefreshCw size={14} />Refresh</button>} />
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <SummaryCard label="Pending review" value={counts.pending_review} icon={Clock3} tone="bg-amber-50 text-amber-700" onClick={() => onNavigate('queue')} />
      <SummaryCard label="Approved" value={counts.approved} icon={CircleCheck} tone="bg-emerald-50 text-emerald-700" onClick={() => onNavigate('cases')} />
      <SummaryCard label="Changes requested" value={counts.changes_requested} icon={MessageSquareText} tone="bg-orange-50 text-orange-700" onClick={() => onNavigate('queue')} />
      <SummaryCard label="Total cases" value={counts.total} icon={BriefcaseBusiness} tone="bg-blue-50 text-blue-700" onClick={() => onNavigate('cases')} />
    </div>
    <Panel>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5"><div><h2 className="text-sm font-extrabold">Recent cases</h2><p className="mt-0.5 text-[11px] text-slate-500">Latest saved briefs in the review workspace</p></div><button type="button" onClick={() => onNavigate('cases')} className="text-[11px] font-bold text-indigo-700 hover:underline">View all <ArrowRight size={13} className="ml-1 inline" /></button></div>
      <CaseTable items={cases.slice(0, 6)} onOpen={onOpen} compact />
      <div className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-3 sm:p-4">
        <ActionTile icon={FilePlus2} title="Upload a document" description="Analyze a notice and create a draft intake case." action="New analysis" onClick={() => onNavigate('upload')} />
        <ActionTile icon={Users} title="Review pending cases" description={`${counts.pending_review} case(s) awaiting review.`} action="Open queue" onClick={() => onNavigate('queue')} />
        <ActionTile icon={BarChart3} title="View reports" description="Reporting is not yet available in this prototype." action="View status" onClick={() => onNavigate('reports')} />
      </div>
    </Panel>
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs leading-5 text-amber-950"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-700" /><p><strong>Review boundary.</strong> AI-generated facts and date calculations are drafts. Check the original source before approving or relying on a brief.</p></div>
  </>
}

function ActionTile({ icon: Icon, title, description, action, onClick }: { icon: typeof Home; title: string; description: string; action: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-24 items-start gap-3 rounded-lg border border-slate-100 bg-white p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/30"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Icon size={16} /></span><span><strong className="block text-xs font-bold text-slate-800">{title}</strong><span className="mt-1 block text-[10px] leading-4 text-slate-500">{description}</span><span className="mt-1.5 block text-[10px] font-bold text-indigo-700">{action} →</span></span></button>
}

function UploadPage({ upload, setUpload, error, uploading, dragging, setDragging, fileInput, addFiles, updateFiles, removeFile, onSubmit }: {
  upload: UploadDocument; setUpload: (next: UploadDocument) => void; error: string; uploading: boolean; dragging: boolean; setDragging: (value: boolean) => void; fileInput: React.RefObject<HTMLInputElement | null>; addFiles: (files: File[]) => void; updateFiles: (event: ChangeEvent<HTMLInputElement>) => void; removeFile: (index: number) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <>
    <PageTitle title="Upload document" subtitle="Analyze a notice or correspondence and create a reviewable draft brief." />
    <form onSubmit={onSubmit} className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,.8fr)]">
      <Panel className="p-4 sm:p-5">
        <div onDragOver={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files)) }} onClick={() => fileInput.current?.click()} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput.current?.click() } }} role="button" tabIndex={0} className={`grid min-h-52 cursor-pointer place-items-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50/70 hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
          <input ref={fileInput} type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp,.pdf,application/pdf" multiple onChange={updateFiles} />
          <div><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-700"><Upload size={23} /></span><p className="mt-3 text-sm font-bold text-slate-800">Drag and drop your files here</p><p className="mt-1 text-[11px] text-slate-500">or click to browse</p><span className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white">Choose files</span><p className="mt-3 text-[10px] leading-4 text-slate-500">Supports PDF, JPG, PNG, GIF and WebP · Max 12 MB per file · PDF up to 20 pages</p></div>
        </div>
        {upload.files.length > 0 && <div className="mt-3 grid gap-2">{upload.files.map((file, index) => <div key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5"><FileText size={17} className="shrink-0 text-rose-600" /><span className="min-w-0 flex-1 truncate text-xs font-semibold">{file.name}</span><span className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span><IconButton label={`Remove ${file.name}`} onClick={() => removeFile(index)}><X size={15} /></IconButton></div>)}</div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div><label htmlFor="doc-language" className="mb-1 block text-[10px] font-bold text-slate-600">Document language</label><select id="doc-language" value={upload.language} onChange={(event) => setUpload({ ...upload, language: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs"><option value="en">English</option><option value="hi">Hindi</option><option value="kn">Kannada</option></select></div>
          <div><label htmlFor="jurisdiction" className="mb-1 block text-[10px] font-bold text-slate-600">District / jurisdiction</label><input id="jurisdiction" value={upload.district} onChange={(event) => setUpload({ ...upload, district: event.target.value })} placeholder="Optional" className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-xs" /></div>
          <div><label htmlFor="received-date" className="mb-1 block text-[10px] font-bold text-slate-600">Date of receipt</label><input id="received-date" type="date" value={upload.receivedDate} onChange={(event) => setUpload({ ...upload, receivedDate: event.target.value })} className="h-10 w-full rounded-lg border border-slate-200 px-2.5 text-xs" /></div>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
        <button type="submit" disabled={uploading} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{uploading ? <><RefreshCw size={16} className="animate-spin" />Analyzing and creating case…</> : <>Analyze document <ArrowRight size={16} /></>}</button>
        <p className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-slate-500"><LockKeyhole size={13} className="mt-0.5 shrink-0" />Uploads are sent to Gemini for analysis and not stored by this app. The extracted brief is saved to the review database after analysis; original files remain only in this browser session.</p>
      </Panel>
      <aside className="space-y-3">
        <Panel className="border-amber-100 bg-amber-50/70 p-4"><h2 className="flex items-center gap-2 text-xs font-extrabold text-amber-950"><AlertTriangle size={15} />Tips for better results</h2><ul className="mt-3 grid gap-2 text-[11px] leading-5 text-slate-700"><li>✓ Ensure document is clear and readable.</li><li>✓ Include all relevant pages.</li><li>✓ Supported formats: PDF, JPG, PNG, GIF, WebP.</li><li>✓ One PDF or up to three images.</li></ul></Panel>
        <Panel className="p-4"><h2 className="text-xs font-extrabold">Processing steps</h2><ol className="mt-3 grid gap-3 text-[11px] text-slate-600"><li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">1</span>Extract facts and evidence passages</li><li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">2</span>Generate a draft intake brief</li><li className="flex gap-2"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700">3</span>Save as pending review for lawyer verification</li></ol></Panel>
      </aside>
    </form>
  </>
}

function CasesPage({ view, cases, counts, total, search, setSearch, status, setStatus, type, setType, date, setDate, onOpen, onUpload, onRefresh }: {
  view: 'queue' | 'cases'; cases: ReviewCase[]; counts: Counts; total: number; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; type: string; setType: (value: string) => void; date: string; setDate: (value: string) => void; onOpen: (id: string) => void; onUpload: () => void; onRefresh: () => void
}) {
  const tab = status || (view === 'queue' ? 'pending_review' : '')
  const tabs: { value: string; label: string; status?: CaseStatus; count: number }[] = [
    { value: '', label: 'All cases', count: total }, { value: 'pending_review', label: 'Pending review', status: 'pending_review', count: counts.pending_review },
    { value: 'approved', label: 'Approved', status: 'approved', count: counts.approved }, { value: 'changes_requested', label: 'Changes requested', status: 'changes_requested', count: counts.changes_requested }, { value: 'rejected', label: 'Rejected', status: 'rejected', count: counts.rejected },
  ]
  return <>
    <PageTitle title={view === 'queue' ? 'Review queue' : 'All cases'} subtitle={view === 'queue' ? 'Prioritize drafts that need lawyer attention.' : 'View and manage saved case briefs.'} action={<div className="flex gap-2"><button type="button" onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><RefreshCw size={14} />Refresh</button><button type="button" onClick={onUpload} className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white"><Plus size={14} />Upload new</button></div>} />
    <Panel>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">{tabs.map((item) => <button type="button" key={item.value} onClick={() => setStatus(item.status ?? '')} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[11px] font-bold ${tab === item.value ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item.label}<span className="ml-1.5 text-slate-400">({item.count})</span></button>)}</div>
      <div className="flex flex-wrap gap-2.5 p-3 sm:p-4">
        <label className="relative min-w-[190px] flex-1"><span className="sr-only">Search cases</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or case ID…" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs" /></label>
        <select aria-label="Document type" value={type} onChange={(event) => setType(event.target.value)} className="h-9 min-w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="">All document types</option>{Object.entries(DOC_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <select aria-label="Case status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 min-w-[130px] rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABEL[value]}</option>)}</select>
        <input aria-label="Updated after" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-9 rounded-lg border border-slate-200 px-2 text-xs" />
      </div>
      <div className="border-t border-slate-100"><CaseTable items={cases} onOpen={onOpen} /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500"><span>Showing {cases.length} matching entries from the latest 200 of {total} total cases</span></div>
    </Panel>
  </>
}

function CaseDetail({ item, brief, audit, sourceFiles, activeTab, setActiveTab, updateBrief, updateRow, addRow, removeRow, correctionNote, setCorrectionNote, decisionNote, setDecisionNote, confirmations, setConfirmations, saving, onSave, onDiscard, onDecide, onExport, onDelete, onBack }: {
  item: ReviewCase; brief: Brief; audit: AuditEvent[]; sourceFiles: File[]; activeTab: 'details' | 'evidence' | 'history'; setActiveTab: (tab: 'details' | 'evidence' | 'history') => void; updateBrief: <K extends keyof Brief>(key: K, value: Brief[K]) => void; updateRow: (key: 'parties' | 'dates_and_periods' | 'legal_provisions_cited', index: number, field: string, value: string) => void; addRow: (key: 'parties' | 'dates_and_periods' | 'legal_provisions_cited') => void; removeRow: (key: 'parties' | 'dates_and_periods' | 'legal_provisions_cited', index: number) => void; correctionNote: string; setCorrectionNote: (value: string) => void; decisionNote: string; setDecisionNote: (value: string) => void; confirmations: { source: boolean; facts: boolean; deadline: boolean }; setConfirmations: (key: 'source' | 'facts' | 'deadline', value: boolean) => void; saving: boolean; onSave: () => void; onDiscard: () => void; onDecide: (decision: 'approved' | 'changes_requested' | 'rejected') => void; onExport: (format: 'pdf' | 'docx') => void; onDelete: () => void; onBack: () => void
}) {
  const currentSource = sourceFiles[0]
  const sourceUrl = useMemo(() => currentSource ? URL.createObjectURL(currentSource) : '', [currentSource])
  useEffect(() => {
    return () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl) }
  }, [sourceUrl])
  const provisions = brief.legal_provisions_cited ?? []
  const dates = brief.dates_and_periods ?? []
  const parties = brief.parties ?? []
  const evidence = brief.supporting_evidence ?? []
  return <>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={13} />Back to cases</button><h1 className="truncate text-xl font-extrabold tracking-tight">{item.title}</h1><p className="mt-1 text-[10px] text-slate-500">#{item.case_id.slice(0, 12)} · Updated {dateLabel(item.updated_at)} · Revision {item.revision}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={item.status !== 'approved'} onClick={() => onExport('pdf')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 text-[11px] font-bold text-indigo-700 disabled:opacity-40"><ArrowDownToLine size={14} />Download PDF</button><button type="button" disabled={item.status !== 'approved'} onClick={() => onExport('docx')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 text-[11px] font-bold text-indigo-700 disabled:opacity-40"><ArrowDownToLine size={14} />Download DOCX</button><StatusBadge status={item.status} /></div>
    </div>
    <div className="mb-4 flex border-b border-slate-200">
      {(['details', 'evidence', 'history'] as const).map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`border-b-2 px-4 py-2.5 text-xs font-bold capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{tab === 'details' ? 'Case details' : tab === 'evidence' ? `Evidence & quotes (${evidence.length})` : 'Review history'}</button>)}
    </div>
    {activeTab === 'history' ? <Panel className="p-4 sm:p-5"><h2 className="text-sm font-extrabold">Review history</h2><AuditList events={audit} /></Panel> : activeTab === 'evidence' ? <Panel className="p-4 sm:p-5"><h2 className="text-sm font-extrabold">Evidence and source quotations</h2><p className="mt-1 text-[11px] text-slate-500">Quotes are extracted pointers, not verified evidence. Check each against the original source.</p><EvidenceList items={evidence} /></Panel> : <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,.82fr)]">
      <div className="space-y-3">
        <Panel className="p-4 sm:p-5"><PanelHeading icon={FileText} title="Basic information" action={<span className="text-[10px] text-slate-500">Editable draft</span>} />
          <label className="mt-3 block text-[10px] font-bold text-slate-500">Plain-language summary</label><textarea rows={3} value={String(brief.summary ?? '')} onChange={(event) => updateBrief('summary', event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-xs leading-5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><ReadField label="Document type" value={DOC_TYPES[String(brief.document?.type)] ?? pretty(brief.document?.type)} /><ReadField label="Issuing authority" value={brief.document?.issuing_authority || 'Not extracted'} /><ReadField label="Case number" value={brief.document?.case_number || 'Not extracted'} /><ReadField label="Classification confidence" value={pretty(brief.document?.type_confidence)} /></div>
          <EditorSection title={`Parties (${parties.length})`} onAdd={() => addRow('parties')}>
            {parties.map((party, index) => <div key={index} className="mb-2 grid gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-[.7fr_1fr_auto]"><SelectField label="Role" value={party.role ?? ''} options={['sender', 'recipient', 'petitioner', 'respondent', 'other']} onChange={(value) => updateRow('parties', index, 'role', value)} /><TextField label="Name" value={party.name ?? ''} onChange={(value) => updateRow('parties', index, 'name', value)} /><button type="button" onClick={() => removeRow('parties', index)} className="self-end rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label="Remove party"><Trash2 size={15} /></button><div className="sm:col-span-3"><TextField label="Source quote" value={party.source_quote ?? ''} onChange={(value) => updateRow('parties', index, 'source_quote', value)} /></div></div>)}
          </EditorSection>
          <EditorSection title="Demands & claims" onAdd={() => updateBrief('demands_or_claims', [...(brief.demands_or_claims ?? []), ''])}>
            {(brief.demands_or_claims ?? []).map((value, index) => <div key={index} className="mb-2 flex gap-2"><input value={value} onChange={(event) => updateBrief('demands_or_claims', (brief.demands_or_claims ?? []).map((item, i) => i === index ? event.target.value : item))} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-xs" /><IconButton label="Remove demand" onClick={() => updateBrief('demands_or_claims', (brief.demands_or_claims ?? []).filter((_, i) => i !== index))}><X size={14} /></IconButton></div>)}
            {!(brief.demands_or_claims ?? []).length && <p className="text-[10px] text-slate-400">No demands extracted.</p>}
          </EditorSection>
          <EditorSection title={`Important dates (${dates.length})`} onAdd={() => addRow('dates_and_periods')}>
            <p className="mb-2 text-[10px] leading-4 text-amber-800">Dates and periods are not verified legal deadlines. Editing a date clears its preliminary calculation.</p>
            {dates.map((date, index) => <div key={index} className="mb-2 grid gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2"><TextField label="Date / period label" value={date.label ?? ''} onChange={(value) => updateRow('dates_and_periods', index, 'label', value)} /><TextField label="Date stated" type="date" value={date.date_as_written_iso ?? ''} onChange={(value) => updateRow('dates_and_periods', index, 'date_as_written_iso', value)} /><div className="sm:col-span-2"><TextField label="Exact wording in notice" value={date.original_text ?? ''} onChange={(value) => updateRow('dates_and_periods', index, 'original_text', value)} /></div>{date.preliminary_assessment && <p className="sm:col-span-2 text-[10px] leading-4 text-amber-800">Preliminary calculation: {String(date.preliminary_assessment.due_date ?? 'No date calculated')} · requires lawyer verification.</p>}<button type="button" onClick={() => removeRow('dates_and_periods', index)} className="justify-self-start text-[10px] font-semibold text-rose-700">Remove date</button></div>)}
          </EditorSection>
          <EditorSection title={`Legal provisions (${provisions.length})`} onAdd={() => addRow('legal_provisions_cited')}>
            {provisions.map((provision, index) => <div key={index} className="mb-2 grid gap-2 rounded-lg border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-2"><TextField label="Act / rule" value={provision.act ?? ''} onChange={(value) => updateRow('legal_provisions_cited', index, 'act', value)} /><TextField label="Section / clause" value={provision.section ?? ''} onChange={(value) => updateRow('legal_provisions_cited', index, 'section', value)} /><div className="sm:col-span-2"><TextField label="Source quote" value={provision.source_quote ?? ''} onChange={(value) => updateRow('legal_provisions_cited', index, 'source_quote', value)} /></div><button type="button" onClick={() => removeRow('legal_provisions_cited', index)} className="justify-self-start text-[10px] font-semibold text-rose-700">Remove provision</button></div>)}
          </EditorSection>
          <EditorSection title="Information to confirm" onAdd={() => updateBrief('information_to_confirm', [...(brief.information_to_confirm ?? []), ''])}>
            {(brief.information_to_confirm ?? []).map((value, index) => <div key={index} className="mb-2 flex gap-2"><input value={value} onChange={(event) => updateBrief('information_to_confirm', (brief.information_to_confirm ?? []).map((item, i) => i === index ? event.target.value : item))} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-xs" /><IconButton label="Remove item" onClick={() => updateBrief('information_to_confirm', (brief.information_to_confirm ?? []).filter((_, i) => i !== index))}><X size={14} /></IconButton></div>)}
          </EditorSection>
          <div className="mt-4 border-t border-slate-100 pt-4"><label className="mb-1 block text-[10px] font-bold text-slate-600">Correction note</label><input maxLength={2000} value={correctionNote} onChange={(event) => setCorrectionNote(event.target.value)} placeholder="Optional: describe corrections" className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs" /><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={onSave} className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-50">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}Save changes</button><button type="button" disabled={saving} onClick={onDiscard} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600">Discard edits</button><button type="button" onClick={onDelete} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"><Trash2 size={14} />Delete</button></div></div>
        </Panel>
      </div>
      <div className="space-y-3 2xl:sticky 2xl:top-[84px]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-xs font-extrabold">Document preview</h2><p className="text-[10px] text-slate-500">{currentSource ? currentSource.name : 'Original document is not stored'}</p></div><span className="text-[10px] text-slate-400">{currentSource ? 'Temporary' : 'Source required'}</span></div>
          <div className="grid min-h-64 place-items-center bg-slate-100 p-3">
            {sourceUrl && currentSource?.type === 'application/pdf' ? <iframe title="Uploaded source PDF preview" src={sourceUrl} className="h-[420px] w-full rounded-lg bg-white" /> : sourceUrl && currentSource?.type.startsWith('image/') ? <img src={sourceUrl} alt="Uploaded source document page" className="max-h-[440px] max-w-full rounded-lg object-contain shadow-sm" /> : <div className="max-w-xs text-center"><FolderOpen size={30} className="mx-auto text-slate-400" /><p className="mt-3 text-xs font-bold text-slate-700">Source document not available here</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Original uploads are not retained. Open the source in your approved document system and compare it with these extracted fields.</p></div>}
          </div>
        </Panel>
        <Panel className="p-4"><PanelHeading icon={ShieldCheck} title="Review confirmation" /><p className="mt-1 text-[10px] leading-4 text-slate-500">Approval requires all checks. It is not a guarantee of legal validity.</p><div className="mt-3 grid gap-2"><ReviewCheck checked={confirmations.source} onChange={(value) => setConfirmations('source', value)} label="Original source and passages checked" /><ReviewCheck checked={confirmations.facts} onChange={(value) => setConfirmations('facts', value)} label="Parties, demands, amounts and dates checked" /><ReviewCheck checked={confirmations.deadline} onChange={(value) => setConfirmations('deadline', value)} label="Date triggers and deadline wording reviewed" /></div><label className="mb-1 mt-3 block text-[10px] font-bold text-slate-600">Review note</label><textarea rows={2} maxLength={2000} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Reason or review notes" className="w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 text-xs" /><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={() => onDecide('approved')} className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2 text-[11px] font-bold text-white disabled:opacity-50"><Check size={14} />Approve</button><button type="button" disabled={saving} onClick={() => onDecide('changes_requested')} className="h-9 rounded-lg border border-amber-200 bg-amber-50 px-2 text-[11px] font-bold text-amber-800 disabled:opacity-50">Request changes</button><button type="button" disabled={saving} onClick={() => onDecide('rejected')} className="col-span-2 h-9 rounded-lg border border-rose-200 px-2 text-[11px] font-bold text-rose-700 disabled:opacity-50">Reject intake</button></div></Panel>
        <Panel className="p-4"><PanelHeading icon={History} title="Recent activity" action={<button type="button" onClick={() => setActiveTab('history')} className="text-[10px] font-bold text-indigo-700">View all</button>} /><AuditList events={audit.slice(0, 3)} /></Panel>
      </div>
    </div>}
  </>
}

function normalizeDates(dates: DateEntry[], originals: DateEntry[]) {
  return dates.map((item, index) => {
    const original = originals[index]
    const comparable = (value: DateEntry) => JSON.stringify({
      label: value.label || 'Date / period',
      original_text: value.original_text || null,
      date_as_written_iso: value.date_as_written_iso || null,
      duration_days_as_written: value.duration_days_as_written ?? null,
      duration_from_as_written: value.duration_from_as_written || null,
      page_number: value.page_number ?? null,
    })
    const originalCalculation = original?.preliminary_assessment ?? null
    return { ...item, preliminary_assessment: original && comparable(item) === comparable(original) ? originalCalculation : null }
  })
}

function PanelHeading({ icon: Icon, title, action }: { icon: typeof Home; title: string; action?: ReactNode }) {
  return <div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-xs font-extrabold text-slate-800"><Icon size={15} className="text-indigo-700" />{title}</h2>{action}</div>
}

function ReadField({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate text-[11px] font-semibold text-slate-700">{value}</p></div>
}

function EditorSection({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }) {
  return <section className="mt-4 border-t border-slate-100 pt-3"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-[11px] font-extrabold text-slate-800">{title}</h3><button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-md border border-indigo-100 px-2 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-50"><Plus size={12} />Add</button></div>{children}</section>
}

function TextField({ label, value, type = 'text', onChange }: { label: string; value: string | number; type?: string; onChange: (value: string) => void }) {
  return <label className="block text-[9px] font-bold text-slate-500">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-800" /></label>
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block text-[9px] font-bold text-slate-500">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-800">{options.map((option) => <option key={option} value={option}>{pretty(option)}</option>)}</select></label>
}

function ReviewCheck({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <label className="flex items-start gap-2 text-[10px] leading-4 text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 accent-indigo-600" />{label}</label>
}

function EvidenceList({ items }: { items: Evidence[] }) {
  if (!items.length) return <p className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">No evidence passages were extracted. Verify important facts directly against the source.</p>
  return <div className="mt-3 grid gap-2 md:grid-cols-2">{items.map((item, index) => <article key={`${item.field}-${index}`} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-[11px] text-slate-800">{pretty(item.field)}</strong><span className="text-[9px] text-slate-500">{item.page_number ? `Page ${item.page_number}` : 'Page not identified'}</span></div><p className="mt-2 text-xs leading-5 text-slate-700">“{item.quote}”</p><p className="mt-2 text-[9px] leading-4 text-amber-800">Quote match: {pretty(item.quote_match_status)} · {pretty(item.verification_status)}</p></article>)}</div>
}

function AuditList({ events }: { events: AuditEvent[] }) {
  if (!events.length) return <p className="mt-3 text-[10px] text-slate-500">No review activity recorded yet.</p>
  return <div className="mt-2 divide-y divide-slate-100">{events.map((event) => <div key={event.event_id} className="py-2"><p className="text-[10px] font-bold text-slate-800">{pretty(event.action)}</p><p className="mt-0.5 text-[9px] text-slate-500">{event.actor_label} · {dateLabel(event.event_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>{typeof event.details.note === 'string' && event.details.note && <p className="mt-1 text-[10px] leading-4 text-slate-600">{event.details.note}</p>}</div>)}</div>
}

function PlaceholderPage({ title, subtitle, icon: Icon, message }: { title: string; subtitle: string; icon: typeof Home; message: string }) {
  return <><PageTitle title={title} subtitle={subtitle} /><Panel className="grid min-h-64 place-items-center p-8 text-center"><div className="max-w-md"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon size={22} /></span><h2 className="mt-4 text-sm font-extrabold">Not available yet</h2><p className="mt-2 text-xs leading-5 text-slate-500">{message}</p></div></Panel></>
}

function ResourcesPage() {
  return <><PageTitle eyebrow="Support" title="Legal resources" subtitle="Professional support and helpline information." /><div className="grid gap-3 md:grid-cols-2"><Panel className="p-5"><div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-700"><Gavel size={19} /></div><h2 className="mt-3 text-sm font-extrabold">NALSA legal aid helpline</h2><p className="mt-2 text-xs leading-5 text-slate-600">Contact the National Legal Services Authority for legal aid information and help locating an appropriate service.</p><a href="tel:15100" className="mt-4 inline-flex h-9 items-center rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white">Call 15100</a></Panel><Panel className="p-5"><div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 text-amber-700"><AlertTriangle size={19} /></div><h2 className="mt-3 text-sm font-extrabold">Prototype limitation</h2><p className="mt-2 text-xs leading-5 text-slate-600">The district legal-aid dataset contains placeholder entries. Confirm contacts independently before sharing them with clients.</p></Panel></div></>
}

function MobileNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  const nav: { view: View; label: string; icon: typeof Home }[] = [{ view: 'dashboard', label: 'Home', icon: Home }, { view: 'upload', label: 'Upload', icon: Upload }, { view: 'queue', label: 'Queue', icon: Archive }, { view: 'cases', label: 'Cases', icon: Files }]
  return <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur md:hidden">{nav.map(({ view: id, label, icon: Icon }) => <button type="button" key={id} onClick={() => setView(id)} className={`grid justify-items-center gap-0.5 py-1 text-[9px] font-bold ${view === id ? 'text-indigo-700' : 'text-slate-500'}`}><Icon size={17} />{label}</button>)}</nav>
}

export default App
