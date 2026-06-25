import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Globe,
  Search,
  ExternalLink,
  Github,
  RefreshCw,
  ChevronDown,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldOff,
  Wifi,
  WifiOff,
  Tag,
  Filter,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PublicApi {
  name: string;
  url: string;
  description: string;
  auth: string;       // 'apiKey' | 'OAuth' | 'No' | 'X-Mashape-Key' | 'User-Agent' | ''
  https: boolean;
  cors: string;       // 'Yes' | 'No' | 'Unknown'
  category: string;
}

// ── README markdown parser ───────────────────────────────────────────────────

function parseReadme(markdown: string): PublicApi[] {
  const entries: PublicApi[] = [];
  let currentCategory = '';

  const categoryHeaderRe = /^###\s+(.+)$/;
  // Table data row: starts with | but not |---
  const tableRowRe = /^\|\s*\[(.+?)\]\((https?:\/\/[^)]+)\)\s*\|\s*(.+?)\s*\|\s*(`?[^|`]*`?)\s*\|\s*(Yes|No)\s*\|\s*(Yes|No|Unknown)\s*\|/;

  for (const line of markdown.split('\n')) {
    const catMatch = line.match(categoryHeaderRe);
    if (catMatch) {
      currentCategory = catMatch[1].trim();
      continue;
    }
    if (!currentCategory) continue;
    if (line.startsWith('|---') || line.startsWith('| ---') || line.trim() === '') continue;

    const rowMatch = line.match(tableRowRe);
    if (rowMatch) {
      const rawAuth = rowMatch[4].replace(/`/g, '').trim();
      entries.push({
        name: rowMatch[1].trim(),
        url: rowMatch[2].trim(),
        description: rowMatch[3].trim(),
        auth: rawAuth === 'No' ? '' : rawAuth,
        https: rowMatch[5].trim() === 'Yes',
        cors: rowMatch[6].trim(),
        category: currentCategory,
      });
    }
  }
  return entries;
}

// ── Constants ────────────────────────────────────────────────────────────────

const README_URL = 'https://raw.githubusercontent.com/public-apis/public-apis/master/README.md';
const GITHUB_URL = 'https://github.com/public-apis/public-apis';
const CACHE_KEY = 'fetchy_public_apis_cache';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

// Auth badge colours
const AUTH_BADGE: Record<string, { label: string; className: string }> = {
  apiKey: { label: 'API Key', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/25' },
  OAuth: { label: 'OAuth', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/25' },
  'X-Mashape-Key': { label: 'Mashape', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' },
  'User-Agent': { label: 'User-Agent', className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25' },
};

// ── Sub-components ───────────────────────────────────────────────────────────

function AuthBadge({ auth }: { auth: string }) {
  if (!auth) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-fetchy-sidebar text-fetchy-text-muted border border-fetchy-border">
        <Unlock size={10} />
        Free
      </span>
    );
  }
  const badge = AUTH_BADGE[auth] ?? { label: auth, className: 'bg-fetchy-sidebar text-fetchy-text-muted border border-fetchy-border' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${badge.className}`}>
      <Lock size={10} />
      {badge.label}
    </span>
  );
}

function HttpsBadge({ https }: { https: boolean }) {
  return https ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">
      <ShieldCheck size={10} />
      HTTPS
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">
      <ShieldOff size={10} />
      HTTP
    </span>
  );
}

function CorsBadge({ cors }: { cors: string }) {
  if (cors === 'Yes') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-fetchy-accent/10 text-fetchy-accent border border-fetchy-accent/20">
        <Wifi size={10} />
        CORS
      </span>
    );
  }
  if (cors === 'No') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-fetchy-sidebar text-fetchy-text-muted border border-fetchy-border">
        <WifiOff size={10} />
        No CORS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-fetchy-sidebar text-fetchy-text-muted border border-fetchy-border">
      <Wifi size={10} />
      CORS?
    </span>
  );
}

function ApiCard({ api }: { api: PublicApi }) {
  const handleOpen = () => {
    window.electronAPI?.openExternalUrl(api.url);
  };

  return (
    <div className="group flex flex-col gap-2 p-3 rounded-lg border border-fetchy-border bg-fetchy-card hover:border-fetchy-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={handleOpen}
          className="text-sm font-semibold text-fetchy-accent hover:underline text-left flex items-center gap-1 min-w-0"
        >
          <span className="truncate">{api.name}</span>
          <ExternalLink size={11} className="shrink-0 opacity-60 group-hover:opacity-100" />
        </button>
      </div>
      <p className="text-xs text-fetchy-text-muted leading-relaxed line-clamp-2">{api.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-auto">
        <AuthBadge auth={api.auth} />
        <HttpsBadge https={api.https} />
        <CorsBadge cors={api.cors} />
      </div>
    </div>
  );
}

// ── Filter dropdown ──────────────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors ${
          value !== 'All'
            ? 'bg-fetchy-accent/15 text-fetchy-accent border-fetchy-accent/30'
            : 'bg-fetchy-sidebar border-fetchy-border text-fetchy-text-muted hover:text-fetchy-text'
        }`}
      >
        <Filter size={11} />
        <span>{value === 'All' ? label : value}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-fetchy-dropdown border border-fetchy-border rounded-lg shadow-xl min-w-[160px] py-1 max-h-60 overflow-y-auto">
          {['All', ...options].map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-fetchy-hover transition-colors ${
                value === opt ? 'text-fetchy-accent font-semibold' : 'text-fetchy-text'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────

interface PublicApisModalProps {
  onClose: () => void;
}

interface CacheEntry {
  data: PublicApi[];
  ts: number;
}

export default function PublicApisModal({ onClose }: PublicApisModalProps) {
  const [apis, setApis] = useState<PublicApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [authFilter, setAuthFilter] = useState('All');
  const [httpsFilter, setHttpsFilter] = useState('All');

  // ── Load data (with localStorage cache) ───────────────────────────────────
  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      if (!force) {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          if (Date.now() - entry.ts < CACHE_TTL_MS && entry.data.length > 0) {
            setApis(entry.data);
            setLoading(false);
            return;
          }
        }
      }

      const res = await fetch(README_URL);
      if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
      const text = await res.text();
      const parsed = parseReadme(text);
      if (parsed.length === 0) throw new Error('No APIs found — parsing may have failed');

      const entry: CacheEntry = { data: parsed, ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
      setApis(parsed);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Derived filter options ─────────────────────────────────────────────────
  const categories = useMemo(
    () => [...new Set(apis.map(a => a.category))].sort(),
    [apis]
  );

  const authOptions = useMemo(
    () => [...new Set(apis.map(a => a.auth || 'Free'))].sort(),
    [apis]
  );

  // ── Filtered results ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return apis.filter(api => {
      if (categoryFilter !== 'All' && api.category !== categoryFilter) return false;
      if (authFilter !== 'All') {
        const label = api.auth || 'Free';
        if (label !== authFilter) return false;
      }
      if (httpsFilter === 'HTTPS only' && !api.https) return false;
      if (httpsFilter === 'HTTP only' && api.https) return false;
      if (q && !api.name.toLowerCase().includes(q) && !api.description.toLowerCase().includes(q) && !api.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [apis, searchQuery, categoryFilter, authFilter, httpsFilter]);

  // ── Group filtered results by category ────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, PublicApi[]>();
    for (const api of filtered) {
      const list = map.get(api.category) ?? [];
      list.push(api);
      map.set(api.category, list);
    }
    return map;
  }, [filtered]);

  const hasFilters = categoryFilter !== 'All' || authFilter !== 'All' || httpsFilter !== 'All' || searchQuery.trim() !== '';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-fetchy-modal border border-fetchy-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '92vw', maxWidth: 1100, height: '90vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-fetchy-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-fetchy-accent/15 flex items-center justify-center">
              <Globe size={18} className="text-fetchy-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fetchy-text leading-none">Public APIs</h2>
              <p className="text-xs text-fetchy-text-muted mt-0.5">
                A collective list of free APIs — sourced from{' '}
                <button
                  onClick={() => window.electronAPI?.openExternalUrl(GITHUB_URL)}
                  className="text-fetchy-accent hover:underline inline-flex items-center gap-0.5"
                >
                  public-apis/public-apis <ExternalLink size={9} />
                </button>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="text-xs text-fetchy-text-muted tabular-nums">
                {filtered.length.toLocaleString()} / {apis.length.toLocaleString()} APIs
              </span>
            )}
            <button
              onClick={() => window.electronAPI?.openExternalUrl(GITHUB_URL)}
              className="p-1.5 hover:bg-fetchy-border rounded text-fetchy-text-muted hover:text-fetchy-text"
              title="View on GitHub"
            >
              <Github size={16} />
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="p-1.5 hover:bg-fetchy-border rounded text-fetchy-text-muted hover:text-fetchy-text disabled:opacity-50"
              title="Refresh list"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-fetchy-border rounded text-fetchy-text-muted hover:text-fetchy-text"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-fetchy-border bg-fetchy-sidebar shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fetchy-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search APIs by name, description or category…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-fetchy-input border border-fetchy-border text-sm text-fetchy-text placeholder-fetchy-text-muted focus:outline-none focus:border-fetchy-accent transition-colors"
              autoFocus
            />
          </div>
          <FilterDropdown
            label="Category"
            value={categoryFilter}
            options={categories}
            onChange={setCategoryFilter}
          />
          <FilterDropdown
            label="Auth"
            value={authFilter}
            options={authOptions}
            onChange={setAuthFilter}
          />
          <FilterDropdown
            label="Protocol"
            value={httpsFilter}
            options={['HTTPS only', 'HTTP only']}
            onChange={setHttpsFilter}
          />
          {hasFilters && (
            <button
              onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setAuthFilter('All'); setHttpsFilter('All'); }}
              className="px-2.5 py-1.5 rounded text-xs bg-fetchy-sidebar border border-fetchy-border text-fetchy-text-muted hover:text-fetchy-text hover:border-fetchy-text-muted transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-fetchy-text-muted">
              <RefreshCw size={32} className="animate-spin text-fetchy-accent" />
              <div className="text-center">
                <p className="text-sm font-medium text-fetchy-text">Loading public APIs…</p>
                <p className="text-xs mt-1">Fetching from github.com/public-apis/public-apis</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <Globe size={28} className="text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-fetchy-text">Failed to load</p>
                <p className="text-xs text-fetchy-text-muted mt-1 max-w-sm">{error}</p>
              </div>
              <button
                onClick={() => loadData(true)}
                className="px-4 py-2 rounded-lg bg-fetchy-accent text-white text-sm font-medium hover:bg-fetchy-accent-hover transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-fetchy-text-muted">
              <Search size={32} className="opacity-40" />
              <p className="text-sm">No APIs match your filters</p>
              <button
                onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setAuthFilter('All'); setHttpsFilter('All'); }}
                className="text-xs text-fetchy-accent hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="space-y-8">
              {[...grouped.entries()].map(([cat, items]) => (
                <section key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={13} className="text-fetchy-accent shrink-0" />
                    <h3 className="text-sm font-semibold text-fetchy-text">{cat}</h3>
                    <span className="text-xs text-fetchy-text-muted">({items.length})</span>
                    <div className="flex-1 h-px bg-fetchy-border" />
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                    {items.map(api => (
                      <ApiCard key={`${api.category}-${api.name}`} api={api} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="px-5 py-2 border-t border-fetchy-border bg-fetchy-sidebar shrink-0 flex items-center justify-between">
            <p className="text-xs text-fetchy-text-muted">
              Data sourced from the open-source{' '}
              <button
                onClick={() => window.electronAPI?.openExternalUrl(GITHUB_URL)}
                className="text-fetchy-accent hover:underline"
              >
                public-apis/public-apis
              </button>{' '}
              repository · Cached for 6 hours
            </p>
            <p className="text-xs text-fetchy-text-muted tabular-nums">
              {apis.length.toLocaleString()} total APIs · {categories.length} categories
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
