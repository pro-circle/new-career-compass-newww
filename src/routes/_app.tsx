import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  BarChart3,
  FileText,
  Wand2,
  Mic,
  MessagesSquare,
  BellRing,
  Search,
  Menu,
  Sparkles,
  ClipboardList,
  Rocket,
  Settings,
  ChevronsLeft,
  Award,
  Mail,
  UserPlus,
  Globe,
  Image as ImageIcon,
  Compass,
  Bot,
  LogOut,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentSession, logout } from "@/lib/auth.functions";
import { ThemeToggle } from "@/components/theme-toggle";
import { FloatingAssistant } from "@/components/floating-assistant";
import { BackButton } from "@/components/back-button";
import { usePrefs } from "@/hooks/use-prefs";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session?.userId || !session.role) {
      throw redirect({ to: "/auth/login" });
    }
    const path = location.pathname;
    if (
      session.role === "candidate" &&
      !session.onboarded &&
      !path.startsWith("/candidate/onboarding")
    ) {
      throw redirect({ to: "/candidate/onboarding" });
    }
    if (session.role === "employer" && path.startsWith("/candidate")) {
      throw redirect({ to: "/employer" });
    }
    if (session.role === "candidate" && path.startsWith("/employer")) {
      throw redirect({ to: "/candidate" });
    }
    return { session };
  },
  loader: ({ context }) => context.session,
  component: AppLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  locked?: boolean;
};

export const employerNav: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/employer", label: "Dashboard", icon: LayoutDashboard, locked: true },
      { to: "/employer/jobs", label: "Jobs", icon: Briefcase },
      { to: "/employer/candidates", label: "Candidates", icon: Users },
      { to: "/employer/talent-pool", label: "Talent Pool", icon: UserPlus },
    ],
  },
  {
    label: "Recruitment",
    items: [
      { to: "/employer/offers", label: "Offer Letters", icon: Award },
      { to: "/employer/templates", label: "Email Templates", icon: Mail },
      { to: "/employer/careers", label: "Careers Page", icon: Globe },
    ],
  },
  {
    label: "Intelligence",
    items: [{ to: "/employer/analytics", label: "Analytics", icon: BarChart3 }],
  },
  {
    label: "Account",
    items: [{ to: "/settings", label: "Settings", icon: Settings, locked: true }],
  },
];

export const candidateNav: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/candidate", label: "Overview", icon: LayoutDashboard, locked: true },
      { to: "/candidate/jobs", label: "Matches", icon: Rocket },
      { to: "/candidate/careers", label: "Careers", icon: Globe },
      { to: "/candidate/applications", label: "Applications", icon: ClipboardList },
      { to: "/candidate/notifications", label: "Notifications", icon: BellRing },
    ],
  },
  {
    label: "AI Tools",
    items: [
      {
        to: "/candidate/job-hunt",
        label: "Job Hunt Agent",
        icon: Bot,
        highlight: true,
      },
      {
        to: "/candidate/external",
        label: "External Job Prep",
        icon: Compass,
        highlight: true,
      },

      { to: "/candidate/resume", label: "Resume Studio", icon: FileText },
      { to: "/candidate/cover-letter", label: "Cover Letter", icon: Wand2 },
      { to: "/candidate/interview", label: "Mock Interview", icon: Mic },
      { to: "/candidate/assistant", label: "Career Assistant", icon: MessagesSquare },
    ],
  },
  {
    label: "Career",
    items: [{ to: "/candidate/portfolio", label: "Portfolio", icon: ImageIcon }],
  },
  {
    label: "Account",
    items: [{ to: "/settings", label: "Settings", icon: Settings, locked: true }],
  },
];

function AppLayout() {
  const session = Route.useLoaderData();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hiddenNav, floatingAssistant } = usePrefs();
  const expanded = hovered || pinned;
  const isCandidate = session.role === "candidate";
  const baseNav = isCandidate ? candidateNav : employerNav;
  const nav = baseNav
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => i.locked || !hiddenNav.includes(i.to)),
    }))
    .filter((g) => g.items.length > 0);
  const accent = isCandidate ? "accent" : "brand";

  const displayName = session.username ?? (isCandidate ? "Candidate" : "Employer");
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = isCandidate ? "Candidate" : "Employer";

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
    await router.navigate({ to: "/auth/login" });
  }

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  async function confirmLogout() {
    setShowLogoutConfirm(false);
    await handleLogout();
  }

  return (
    <div className="flex min-h-screen w-full bg-surface font-sans text-foreground">
      {/* Sidebar — Supabase-style hover-to-expand */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out md:flex ${
          expanded ? "w-64" : "w-[60px]"
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className={`grid size-9 shrink-0 place-items-center rounded-lg bg-${accent} text-${accent}-foreground font-bold text-xs`}
            >
              ATS
            </div>
            <span
              className={`overflow-hidden whitespace-nowrap font-display text-base font-extrabold tracking-tight transition-opacity duration-150 ${
                expanded ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              ATS Engine
            </span>
          </Link>
          {expanded && (
            <button
              onClick={() => setPinned((v) => !v)}
              className={`ml-auto grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground ${
                pinned ? "text-foreground" : ""
              }`}
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
              title={pinned ? "Unpin sidebar" : "Pin sidebar"}
            >
              <ChevronsLeft
                className={`size-4 transition-transform ${pinned ? "" : "rotate-180"}`}
              />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-2 py-2">
          {nav.map((group) => (
            <div key={group.label}>
              <div
                className={`mb-1 h-4 overflow-hidden px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-opacity duration-150 ${
                  expanded ? "opacity-100" : "opacity-0"
                }`}
              >
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.to ||
                    (item.to !== "/employer" &&
                      item.to !== "/candidate" &&
                      pathname.startsWith(item.to));
                  const isRootActive =
                    (item.to === "/employer" && pathname === "/employer") ||
                    (item.to === "/candidate" && pathname === "/candidate");
                  const on = active || isRootActive;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors ${
                        on
                          ? `bg-${accent}/10 text-${accent}`
                          : "text-foreground/70 hover:bg-surface hover:text-foreground"
                      }`}
                      title={!expanded ? item.label : undefined}
                    >
                      <item.icon
                        className={`size-4 shrink-0 ${item.highlight && !on ? "text-accent" : ""}`}
                      />
                      <span
                        className={`overflow-hidden whitespace-nowrap transition-opacity duration-150 ${
                          expanded ? "opacity-100" : "pointer-events-none opacity-0"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.highlight && expanded && (
                        <span className="ml-auto rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                          New
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-2">
          <div className="flex h-11 items-center gap-3 rounded-md px-2">
            <div
              className={`grid size-8 shrink-0 place-items-center rounded-full bg-${accent}/15 text-xs font-bold text-${accent}`}
            >
              {initials}
            </div>
            <div
              className={`min-w-0 flex-1 overflow-hidden transition-opacity duration-150 ${
                expanded ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div className="truncate text-xs font-semibold">{displayName}</div>
              <div className="truncate text-[10px] text-muted-foreground">{roleLabel}</div>
            </div>
            {expanded && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Sign out"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[82%] max-w-[300px] flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between px-4 py-4">
              <Link to="/" className="flex min-w-0 items-center gap-2">
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-lg bg-${accent} text-${accent}-foreground text-xs font-bold`}
                >
                  ATS
                </div>
                <span className="truncate font-display text-base font-extrabold tracking-tight">
                  ATS Engine
                </span>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-surface"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
              {nav.map((group) => (
                <div key={group.label}>
                  <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const on =
                        pathname === item.to ||
                        (item.to !== "/employer" &&
                          item.to !== "/candidate" &&
                          pathname.startsWith(item.to));
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={`flex h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium ${
                            on
                              ? `bg-${accent}/10 text-${accent}`
                              : "text-foreground/70 hover:bg-surface"
                          }`}
                        >
                          <item.icon
                            className={`size-4 shrink-0 ${item.highlight && !on ? "text-accent" : ""}`}
                          />
                          <span className="truncate">{item.label}</span>
                          {item.highlight && (
                            <span className="ml-auto shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                              New
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`grid size-8 shrink-0 place-items-center rounded-full bg-${accent}/15 text-xs font-bold text-${accent}`}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{displayName}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{roleLabel}</div>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                aria-label="Sign out"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar isCandidate={isCandidate} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border px-4 py-4 text-[11px] text-muted-foreground">
          
          <Link to="/legal/terms" className="font-semibold hover:text-foreground">
            Terms
          </Link>
          <Link to="/legal/privacy" className="font-semibold hover:text-foreground">
            Privacy Policy
          </Link>
        </footer>
        {isCandidate && floatingAssistant && <FloatingAssistant />}
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 backdrop-blur-sm">
          <div className="w-[min(92vw,360px)] rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-foreground/5 text-muted-foreground">
              <LogOut className="size-6" />
            </div>
            <h3 className="text-center font-display text-lg font-bold">Sign out?</h3>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              You'll need to sign in again to continue.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-red-600 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopBar({ isCandidate, onMenu }: { isCandidate: boolean; onMenu: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const crumb = pathname
    .split("/")
    .filter(Boolean)
    .map((p) => p.replace(/-/g, " "));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-4">
        <BackButton variant="ghost" />
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-surface md:hidden"
        >
          <Menu className="size-4" />
        </button>
        <div className="hidden items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground md:flex">
          {crumb.length ? (
            crumb.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span>/</span>}
                <span className={i === crumb.length - 1 ? "font-semibold text-foreground" : ""}>
                  {c}
                </span>
              </span>
            ))
          ) : (
            <span>Home</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search candidates, jobs, insights…"
            className="w-72 rounded-full border border-border bg-surface py-1.5 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <RoleBadge isCandidate={isCandidate} />

        <ThemeToggle />

        <button className="relative grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground">
          <BellRing className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand" />
        </button>
      </div>
    </header>
  );
}

function RoleBadge({ isCandidate }: { isCandidate: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        isCandidate
          ? "border-accent/20 bg-accent/10 text-accent"
          : "border-brand/20 bg-brand/10 text-brand"
      }`}
      title={isCandidate ? "Logged in as Candidate" : "Logged in as Employer"}
    >
      {isCandidate ? <Rocket className="size-3" /> : <Users className="size-3" />}
      {isCandidate ? "Candidate" : "Employer"}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div>
        {eyebrow && (
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand">
            <Sparkles className="size-3" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
