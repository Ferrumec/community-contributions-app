import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Users, Wallet, Clock, Plus, ChevronLeft,
  Receipt, X, CheckCircle2, XCircle, ChevronRight, Phone, Calendar, ShieldCheck,
  UserCircle2, ArrowUpRight, ArrowDownRight, Building2, Loader2, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ============================== CONFIG ============================== */
// This app treats the JSON below as if it were a real backend response.
// Swap MOCK_DATA_URL for a live API endpoint and the rest of the app is unchanged.
const MOCK_DATA_URL = "/mock-data/db.json";
const CURRENT_USER_ID = "m1"; // Wanjiru Kamau — logged-in user for this prototype

/* ============================== HELPERS ============================== */
const formatKES = (n) => `KES ${Math.round(n).toLocaleString("en-US")}`;

const formatDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const monthLabel = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

function memberById(community, id) {
  return community.members.find((m) => m.id === id) || { name: "Unknown", id };
}

function myRole(community) {
  const me = community.members.find((m) => m.id === CURRENT_USER_ID);
  return me ? me.role : null;
}

function communityCollected(community) {
  return community.contributions.reduce(
    (sum, c) => sum + c.contributions.filter((mc) => mc.status === "VERIFIED").reduce((s, mc) => s + mc.amount, 0),
    0
  );
}

function communitySpent(community) {
  return community.spendings.filter((s) => s.status === "APPROVED").reduce((s, sp) => s + sp.amount, 0);
}

function communityBalance(community) {
  return communityCollected(community) - communitySpent(community);
}

function pendingVerificationsCount(community) {
  return community.contributions.reduce(
    (sum, c) => sum + c.contributions.filter((mc) => mc.status === "PENDING").length,
    0
  );
}

function allMemberContributions(community) {
  const rows = [];
  community.contributions.forEach((c) => {
    c.contributions.forEach((mc) => rows.push({ ...mc, contributionName: c.name, contributionId: c.id }));
  });
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/* ============================== SMALL UI PRIMITIVES ============================== */
const STATUS_STYLES = {
  VERIFIED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PROPOSED: "bg-amber-50 text-amber-700 ring-amber-600/20",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  INACTIVE: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

const STATUS_ICON = {
  VERIFIED: CheckCircle2,
  APPROVED: CheckCircle2,
  PENDING: Clock,
  PROPOSED: Clock,
  REJECTED: XCircle,
};

function StatusBadge({ status }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status] || "bg-slate-100 text-slate-600"}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function RoleBadge({ role }) {
  const styles = {
    TREASURER: "bg-emerald-600 text-white",
    ADMIN: "bg-slate-800 text-white",
    MEMBER: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[role]}`}>
      {role === "TREASURER" && <ShieldCheck className="h-3.5 w-3.5" />}
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

function ProgressBar({ value, max, colorClass = "bg-emerald-600" }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500 font-body">
        <span>{pct}% funded</span>
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}>{children}</div>;
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-slate-700 mb-1.5 font-body">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-body text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500";

/* ============================== ROUTER ============================== */
function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "communities" };
  if (parts[0] === "community" && parts[1]) {
    if (parts[2] === "contribution" && parts[3]) {
      return { name: "contributionDetail", communityId: parts[1], contributionId: parts[3] };
    }
    return { name: "dashboard", communityId: parts[1], tab: parts[2] || "overview" };
  }
  return { name: "communities" };
}

function navigate(path) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================== APP ============================== */
export default function App() {
  const [db, setDb] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(MOCK_DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load mock data (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setDb(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 font-body">
        <AlertTriangle className="h-8 w-8 text-rose-500 mb-3" />
        <p className="font-display font-bold text-slate-900 mb-1">Couldn't load community data</p>
        <p className="text-sm text-slate-500">{loadError}</p>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-body text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mb-3 text-emerald-600" />
        <p className="text-sm">Loading communities…</p>
      </div>
    );
  }

  return <Loaded db={db} setDb={setDb} route={route} />;
}

function Loaded({ db, setDb, route }) {
  const communities = db.communities;
  const community = communities.find((c) => c.id === route.communityId);

  // ---- mutations (in-memory only — a real backend would persist these) ----
  function updateContributionStatus(communityId, contributionEventId, mcId, status) {
    setDb((prev) => ({
      ...prev,
      communities: prev.communities.map((c) => {
        if (c.id !== communityId) return c;
        return {
          ...c,
          contributions: c.contributions.map((ev) => {
            if (ev.id !== contributionEventId) return ev;
            return { ...ev, contributions: ev.contributions.map((mc) => (mc.id === mcId ? { ...mc, status } : mc)) };
          }),
        };
      }),
    }));
  }

  function addMemberContribution(communityId, contributionEventId, entry) {
    setDb((prev) => ({
      ...prev,
      communities: prev.communities.map((c) => {
        if (c.id !== communityId) return c;
        return {
          ...c,
          contributions: c.contributions.map((ev) =>
            ev.id !== contributionEventId ? ev : { ...ev, contributions: [...ev.contributions, entry] }
          ),
        };
      }),
    }));
  }

  function addSpending(communityId, entry) {
    setDb((prev) => ({
      ...prev,
      communities: prev.communities.map((c) => (c.id !== communityId ? c : { ...c, spendings: [entry, ...c.spendings] })),
    }));
  }

  function updateSpendingStatus(communityId, spendingId, status, approverId) {
    setDb((prev) => ({
      ...prev,
      communities: prev.communities.map((c) => {
        if (c.id !== communityId) return c;
        return {
          ...c,
          spendings: c.spendings.map((sp) =>
            sp.id !== spendingId ? sp : { ...sp, status, approved_by: status === "APPROVED" ? approverId : sp.approved_by }
          ),
        };
      }),
    }));
  }

  let page;
  if (route.name === "communities") {
    page = <CommunitiesPage communities={communities} />;
  } else if (route.name === "dashboard" && community) {
    page = (
      <CommunityDashboard
        community={community}
        tab={route.tab || "overview"}
        onAddSpending={(entry) => addSpending(community.id, entry)}
        onUpdateSpendingStatus={(id, status) => updateSpendingStatus(community.id, id, status, CURRENT_USER_ID)}
      />
    );
  } else if (route.name === "contributionDetail" && community) {
    const contributionEvent = community.contributions.find((c) => c.id === route.contributionId);
    page = contributionEvent ? (
      <ContributionDetailPage
        community={community}
        contributionEvent={contributionEvent}
        onUpdateStatus={(mcId, status) => updateContributionStatus(community.id, contributionEvent.id, mcId, status)}
        onAdd={(entry) => addMemberContribution(community.id, contributionEvent.id, entry)}
      />
    ) : (
      <NotFound />
    );
  } else {
    page = <NotFound />;
  }

  return <div className="min-h-screen bg-slate-50 font-body text-slate-900">{page}</div>;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6">
      <p className="font-display font-bold text-xl mb-2">We couldn't find that page</p>
      <button onClick={() => navigate("/")} className="text-emerald-600 font-semibold text-sm">
        Back to my communities
      </button>
    </div>
  );
}

/* ============================== TOP BAR ============================== */
function TopBar({ title, subtitle, onBack }) {
  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3.5">
        {onBack && (
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 text-slate-500 shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-[17px] text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 truncate font-body">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

/* ============================== 1. COMMUNITIES PAGE ============================== */
function CommunitiesPage({ communities }) {
  const [query, setQuery] = useState("");
  const filtered = communities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 pt-5 pb-3.5">
          <p className="text-xs font-semibold tracking-wide text-emerald-600 font-body">Chama & Sacco</p>
          <h1 className="font-display font-extrabold text-2xl text-slate-900">My Communities</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search communities"
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm font-body placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 shadow-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const role = myRole(c);
            const balance = communityBalance(c);
            const activeMembers = c.members.filter((m) => m.status === "ACTIVE").length;
            return (
              <button key={c.id} onClick={() => navigate(`/community/${c.id}`)} className="text-left">
                <Card className="p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    {role && <RoleBadge role={role} />}
                  </div>
                  <h3 className="font-display font-bold text-slate-900 mt-3.5 text-[15px] leading-snug">{c.name}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Balance</p>
                      <p className="font-display font-extrabold text-emerald-600 tnum text-lg">{formatKES(balance)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                      <Users className="h-4 w-4" />
                      <span className="tnum">{activeMembers}</span>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">No communities match "{query}"</div>
        )}
      </div>
    </div>
  );
}

/* ============================== 2. COMMUNITY DASHBOARD ============================== */
const TABS = [
  { key: "overview", label: "Overview" },
  { key: "contributions", label: "Contributions" },
  { key: "spendings", label: "Spendings" },
  { key: "members", label: "Members" },
];

function CommunityDashboard({ community, tab, onAddSpending, onUpdateSpendingStatus }) {
  const role = myRole(community);
  const balance = communityBalance(community);

  return (
    <div>
      <TopBar title={community.name} subtitle={`${community.members.length} members`} onBack={() => navigate("/")} />

      <div className="max-w-3xl mx-auto px-4 pt-5">
        <p className="text-sm text-slate-500 leading-relaxed">{community.description}</p>

        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white shadow-lg shadow-emerald-600/20">
          <div className="flex items-center justify-between">
            <p className="text-emerald-100 text-xs font-semibold tracking-wide uppercase">Community Balance</p>
            <Wallet className="h-5 w-5 text-emerald-200" />
          </div>
          <p className="font-display font-extrabold text-3xl mt-1.5 tnum">{formatKES(balance)}</p>
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-emerald-500/40">
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 text-emerald-200" />
              <div>
                <p className="text-[11px] text-emerald-200 leading-none">Treasurer</p>
                <p className="text-sm font-semibold leading-tight mt-0.5">
                  {community.members.find((m) => m.role === "TREASURER")?.name || "—"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-emerald-200 leading-none">Your role</p>
              <p className="text-sm font-semibold leading-tight mt-0.5">{role}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto no-scrollbar border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(`/community/${community.id}/${t.key}`)}
              className={`shrink-0 px-4 py-2.5 text-sm font-semibold font-body border-b-2 transition-colors ${
                tab === t.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {tab === "overview" && <OverviewTab community={community} />}
        {tab === "contributions" && <ContributionsTab community={community} />}
        {tab === "spendings" && (
          <SpendingsTab
            community={community}
            role={role}
            onAddSpending={onAddSpending}
            onUpdateSpendingStatus={onUpdateSpendingStatus}
          />
        )}
        {tab === "members" && <MembersTab community={community} />}
      </div>
    </div>
  );
}

/* -------- Overview -------- */
function OverviewTab({ community }) {
  const collected = communityCollected(community);
  const spent = communitySpent(community);
  const pending = pendingVerificationsCount(community);
  const recentContributions = allMemberContributions(community).slice(0, 5);
  const recentSpendings = [...community.spendings].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  const chartData = useMemo(() => {
    const map = {};
    community.contributions.forEach((ev) =>
      ev.contributions
        .filter((mc) => mc.status === "VERIFIED")
        .forEach((mc) => {
          const key = monthLabel(mc.date);
          map[key] = map[key] || { month: key, collected: 0, spent: 0 };
          map[key].collected += mc.amount;
        })
    );
    community.spendings
      .filter((s) => s.status === "APPROVED")
      .forEach((s) => {
        const key = monthLabel(s.date);
        map[key] = map[key] || { month: key, collected: 0, spent: 0 };
        map[key].spent += s.amount;
      });
    return Object.values(map).sort((a, b) => new Date("1 " + a.month) - new Date("1 " + b.month));
  }, [community]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ArrowUpRight} label="Total Collected" value={collected} tone="emerald" />
        <StatCard icon={ArrowDownRight} label="Total Spent" value={spent} tone="rose" />
        <StatCard icon={Clock} label="Pending" value={pending} tone="amber" isCount />
      </div>

      <Card className="p-5">
        <h3 className="font-display font-bold text-sm text-slate-900 mb-4">Collected vs Spent by Month</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                formatter={(v) => formatKES(v)}
                contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12, fontFamily: "Inter" }}
              />
              <Bar dataKey="collected" name="Collected" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar dataKey="spent" name="Spent" fill="#F87171" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-display font-bold text-sm text-slate-900">Recent Contributions</h3>
          <button onClick={() => navigate(`/community/${community.id}/contributions`)} className="text-xs font-semibold text-emerald-600">
            View all
          </button>
        </div>
        <Card className="divide-y divide-slate-100">
          {recentContributions.map((mc) => (
            <div key={mc.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{memberById(community, mc.memberId).name}</p>
                <p className="text-xs text-slate-400">{mc.contributionName} · {formatDate(mc.date)}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold tnum text-slate-900">{formatKES(mc.amount)}</p>
                <StatusBadge status={mc.status} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-display font-bold text-sm text-slate-900">Recent Spendings</h3>
          <button onClick={() => navigate(`/community/${community.id}/spendings`)} className="text-xs font-semibold text-emerald-600">
            View all
          </button>
        </div>
        <Card className="divide-y divide-slate-100">
          {recentSpendings.map((sp) => (
            <div key={sp.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{sp.subject}</p>
                <p className="text-xs text-slate-400">{sp.category} · {formatDate(sp.date)}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-sm font-bold tnum text-slate-900">{formatKES(sp.amount)}</p>
                <StatusBadge status={sp.status} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone, isCount }) {
  const tones = {
    emerald: "text-emerald-600 bg-emerald-50",
    rose: "text-rose-600 bg-rose-50",
    amber: "text-amber-600 bg-amber-50",
  };
  return (
    <Card className="p-3.5">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] text-slate-400 font-medium mt-2.5 leading-tight">{label}</p>
      <p className="font-display font-bold text-slate-900 tnum text-[15px] mt-0.5 leading-tight">
        {isCount ? value : formatKES(value)}
      </p>
    </Card>
  );
}

/* -------- Contributions tab -------- */
function ContributionsTab({ community }) {
  return (
    <div className="space-y-3">
      {community.contributions
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((ev) => {
          const collected = ev.contributions.filter((mc) => mc.status === "VERIFIED").reduce((s, mc) => s + mc.amount, 0);
          return (
            <button key={ev.id} onClick={() => navigate(`/community/${community.id}/contribution/${ev.id}`)} className="w-full text-left">
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-bold text-slate-900 text-[15px]">{ev.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(ev.date)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 mt-1" />
                </div>
                <div className="mt-3.5">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-bold tnum text-slate-900">{formatKES(collected)}</span>
                    <span className="text-slate-400 tnum">of {formatKES(ev.target_amount)}</span>
                  </div>
                  <ProgressBar value={collected} max={ev.target_amount} />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" />
                  <span>{ev.contributions.length} contributors</span>
                </div>
              </Card>
            </button>
          );
        })}
    </div>
  );
}

/* -------- Members tab -------- */
function MembersTab({ community }) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400 font-medium">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {community.members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{m.name}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{m.phone}</span>
                </td>
                <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(m.joined_at)}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* -------- Spendings tab -------- */
function SpendingsTab({ community, role, onAddSpending, onUpdateSpendingStatus }) {
  const [showModal, setShowModal] = useState(false);
  const isTreasurer = role === "TREASURER";

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Spending
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-400 font-medium">
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Requested by</th>
                <th className="px-4 py-3 font-medium">Approved by</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Receipt</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {isTreasurer && <th className="px-4 py-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...community.spendings].sort((a, b) => new Date(b.date) - new Date(a.date)).map((sp) => (
                <tr key={sp.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{sp.subject}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1">{sp.category}</span>
                  </td>
                  <td className="px-4 py-3 font-bold tnum text-slate-900 whitespace-nowrap">{formatKES(sp.amount)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{memberById(community, sp.requested_by).name}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {sp.approved_by ? memberById(community, sp.approved_by).name : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(sp.date)}</td>
                  <td className="px-4 py-3">
                    {sp.receipt_url ? <Receipt className="h-4 w-4 text-emerald-600" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={sp.status} /></td>
                  {isTreasurer && (
                    <td className="px-4 py-3">
                      {sp.status === "PROPOSED" ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => onUpdateSpendingStatus(sp.id, "APPROVED")}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onUpdateSpendingStatus(sp.id, "REJECTED")}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AddSpendingModal
        open={showModal}
        onClose={() => setShowModal(false)}
        community={community}
        onSubmit={(entry) => {
          onAddSpending(entry);
          setShowModal(false);
        }}
      />
    </div>
  );
}

function AddSpendingModal({ open, onClose, community, onSubmit }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [requestedBy, setRequestedBy] = useState(community.members[0]?.id || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function reset() {
    setSubject("");
    setCategory("");
    setAmount("");
    setRequestedBy(community.members[0]?.id || "");
    setDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add Spending">
      <Field label="Subject">
        <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Venue hire" />
      </Field>
      <Field label="Category">
        <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Events" />
      </Field>
      <Field label="Amount (KES)">
        <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Requested by">
        <select className={inputCls} value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)}>
          {community.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button
        disabled={!subject || !category || !amount}
        onClick={() =>
          onSubmit({
            id: `sp-${Date.now()}`,
            subject,
            category,
            amount: Number(amount),
            requested_by: requestedBy,
            approved_by: null,
            status: "PROPOSED",
            date,
            receipt_url: null,
          })
        }
        className="w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 mt-1 disabled:opacity-40 hover:bg-emerald-700 transition-colors"
      >
        Submit Spending Request
      </button>
    </Modal>
  );
}

/* ============================== 4. CONTRIBUTION DETAIL PAGE ============================== */
function ContributionDetailPage({ community, contributionEvent, onUpdateStatus, onAdd }) {
  const [showModal, setShowModal] = useState(false);
  const role = myRole(community);
  const isTreasurer = role === "TREASURER";

  const collected = contributionEvent.contributions
    .filter((mc) => mc.status === "VERIFIED")
    .reduce((s, mc) => s + mc.amount, 0);

  const rows = [...contributionEvent.contributions].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div>
      <TopBar
        title={contributionEvent.name}
        subtitle={community.name}
        onBack={() => navigate(`/community/${community.id}/contributions`)}
      />

      <div className="max-w-3xl mx-auto px-4 py-5">
        <Card className="p-5 mb-5">
          <p className="text-xs text-slate-400 flex items-center gap-1 mb-1">
            <Calendar className="h-3.5 w-3.5" /> {formatDate(contributionEvent.date)}
          </p>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">Collected</p>
              <p className="font-display font-extrabold text-2xl text-slate-900 tnum">{formatKES(collected)}</p>
            </div>
            <p className="text-sm text-slate-400 tnum">of {formatKES(contributionEvent.target_amount)}</p>
          </div>
          <div className="mt-3">
            <ProgressBar value={collected} max={contributionEvent.target_amount} />
          </div>
        </Card>

        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Contribution
          </button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-400 font-medium">
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Mpesa Code</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isTreasurer && <th className="px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((mc) => (
                  <tr key={mc.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {memberById(community, mc.memberId).name}
                    </td>
                    <td className="px-4 py-3 font-bold tnum text-slate-900 whitespace-nowrap">{formatKES(mc.amount)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(mc.date)}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs whitespace-nowrap">{mc.mpesa_code || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={mc.status} /></td>
                    {isTreasurer && (
                      <td className="px-4 py-3">
                        {mc.status === "PENDING" ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onUpdateStatus(mc.id, "VERIFIED")}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              title="Verify"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onUpdateStatus(mc.id, "REJECTED")}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AddContributionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        community={community}
        onSubmit={(entry) => {
          onAdd(entry);
          setShowModal(false);
        }}
      />
    </div>
  );
}

function AddContributionModal({ open, onClose, community, onSubmit }) {
  const [memberId, setMemberId] = useState(community.members[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function reset() {
    setMemberId(community.members[0]?.id || "");
    setAmount("");
    setMpesaCode("");
    setDate(new Date().toISOString().slice(0, 10));
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Add Contribution">
      <Field label="Member">
        <select className={inputCls} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {community.members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Amount (KES)">
        <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Mpesa Code">
        <input className={inputCls} value={mpesaCode} onChange={(e) => setMpesaCode(e.target.value.toUpperCase())} placeholder="e.g. QAC1X23F" />
      </Field>
      <Field label="Date">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <button
        disabled={!memberId || !amount}
        onClick={() =>
          onSubmit({
            id: `mc-${Date.now()}`,
            memberId,
            amount: Number(amount),
            mpesa_code: mpesaCode || null,
            status: "PENDING",
            date,
          })
        }
        className="w-full rounded-xl bg-emerald-600 text-white font-semibold py-3 mt-1 disabled:opacity-40 hover:bg-emerald-700 transition-colors"
      >
        Record Contribution
      </button>
    </Modal>
  );
}
