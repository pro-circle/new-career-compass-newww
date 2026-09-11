import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import {
  User,
  Bell,
  Users2,
  Shield,
  Save,
  Sun,
  Moon,
  Monitor,
  SlidersHorizontal,
  MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";
import { getStoredTheme, setTheme as persistTheme, applyTheme, type Theme } from "@/lib/theme";
import { usePrefs } from "@/hooks/use-prefs";
import { candidateNav, employerNav } from "@/routes/_app";
import { getCurrentSession } from "@/lib/auth.functions";
import {
  getSettings,
  saveSettings,
  listTeam,
  inviteTeammate,
  revokeTeammate,
  changePassword,
  type TeamMemberRow,
} from "@/lib/settings.functions";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · ATS Engine" }] }),
  loader: () => getCurrentSession(),
  component: SettingsPage,
});

type Tab =
  | "profile"
  | "appearance"
  | "features"
  | "notifications"
  | "team"
  | "security";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "features", label: "Sidebar & features", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users2 },
  { id: "security", label: "Security", icon: Shield },
];

function SettingsPage() {
  const session = Route.useLoaderData();
  const isCandidate = session?.role === "candidate";
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Manage your workspace, notifications, team, and security preferences."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-brand/10 text-brand" : "text-foreground/70 hover:bg-surface"
              }`}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </nav>

        <div>
          {tab === "profile" && <ProfileTab />}
          {tab === "appearance" && <AppearanceTab />}
          {tab === "features" && <FeaturesTab isCandidate={isCandidate} />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "team" && <TeamTab />}
          {tab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab() {
  const [form, setForm] = useState({ fullName: "", email: "", company: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) setForm({ fullName: s.fullName, email: s.email, company: s.company });
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const initials =
    form.fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "—";

  return (
    <SectionCard title="Profile information">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            const res = await saveSettings({ data: form });
            res.ok ? toast.success(res.message) : toast.error(res.message);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save");
          } finally {
            setSaving(false);
          }
        }}
        className="space-y-5 p-6"
      >
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-brand/15 text-lg font-bold text-brand">
            {initials}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Your initials are generated from your name and shown across the workspace.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Full name"
            value={form.fullName}
            onChange={(v) => setForm({ ...form, fullName: v })}
          />
          <Field
            label="Work email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
        </div>
        <Field
          label="Company"
          value={form.company}
          onChange={(v) => setForm({ ...form, company: v })}
        />
        <div className="flex justify-end">
          <button
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Save className="size-3.5" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function AppearanceTab() {
  const [theme, setLocal] = useState<Theme>("system");

  useEffect(() => {
    const t = getStoredTheme();
    setLocal(t);
    applyTheme(t);
  }, []);

  const options: {
    id: Theme;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: "light", label: "Light", desc: "Always use the light theme.", icon: Sun },
    { id: "dark", label: "Dark", desc: "Always use the dark theme.", icon: Moon },
    {
      id: "system",
      label: "System",
      desc: "Follow your device appearance automatically.",
      icon: Monitor,
    },
  ];

  return (
    <SectionCard title="Appearance">
      <div className="p-6">
        <p className="mb-5 text-xs text-muted-foreground">
          New sessions follow your operating-system setting until you pick an explicit preference
          here. Your choice is remembered on this device.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((o) => {
            const active = theme === o.id;
            return (
              <button
                key={o.id}
                onClick={() => {
                  setLocal(o.id);
                  persistTheme(o.id);
                  toast.success(`Theme: ${o.label}`);
                }}
                className={`rounded-xl border p-4 text-left transition-all ${
                  active
                    ? "border-brand bg-brand/5 ring-2 ring-brand/20"
                    : "border-border bg-card hover:border-brand/40"
                }`}
              >
                <o.icon
                  className={`mb-2 size-5 ${active ? "text-brand" : "text-muted-foreground"}`}
                />
                <div className="text-sm font-semibold">{o.label}</div>
                <p className="mt-1 text-[11px] text-muted-foreground">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
          on ? "left-0.5 translate-x-4" : "left-0.5"
        }`}
      />
    </button>
  );
}

function FeaturesTab({ isCandidate }: { isCandidate: boolean }) {
  const { hiddenNav, floatingAssistant, setNavVisible, setFloatingAssistant } = usePrefs();
  const groups = isCandidate ? candidateNav : employerNav;

  return (
    <div className="space-y-6">
      <SectionCard title="Sidebar features">
        <div className="divide-y divide-border">
          <div className="px-6 py-4 text-xs text-muted-foreground">
            Keep only the features you use. Hidden items disappear from the sidebar — their pages
            stay reachable by URL. Dashboard and Settings are always available.
          </div>
          {groups.map((g) => (
            <div key={g.label} className="p-5">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {g.label}
              </div>
              <div className="space-y-2">
                {g.items.map((item) => {
                  const locked = !!item.locked;
                  const visible = locked || !hiddenNav.includes(item.to);
                  return (
                    <div
                      key={item.to}
                      className="flex items-center gap-3 rounded-md bg-surface px-3 py-2"
                    >
                      <item.icon className="size-4 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {locked ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          Always on
                        </span>
                      ) : (
                        <Switch
                          on={visible}
                          label={item.label}
                          onChange={(v) => setNavVisible(item.to, v)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {isCandidate && (
        <SectionCard title="Career assistant">
          <div className="flex items-center gap-4 p-6">
            <MessagesSquare className="size-5 text-accent" />
            <div className="flex-1">
              <div className="text-sm font-semibold">Floating assistant bubble</div>
              <div className="text-xs text-muted-foreground">
                Show a chat bubble in the corner of every page so you can ask the assistant without
                leaving what you are doing.
              </div>
            </div>
            <Switch
              on={floatingAssistant}
              label="Floating assistant"
              onChange={(v) => {
                setFloatingAssistant(v);
                toast.success(v ? "Floating assistant enabled" : "Floating assistant hidden");
              }}
            />
          </div>
        </SectionCard>
      )}
    </div>
  );
}

const NOTIFICATION_ITEMS = [
  {
    key: "matches",
    label: "New candidate matches",
    desc: "Get notified when a top-tier candidate applies.",
  },
  { key: "digest", label: "Weekly analytics digest", desc: "Every Monday at 9am." },
  { key: "product", label: "Product updates", desc: "New features and improvements." },
];

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (cancelled) return;
        const base: Record<string, boolean> = {};
        for (const it of NOTIFICATION_ITEMS) base[it.key] = s.notifications?.[it.key] ?? true;
        setPrefs(base);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(key: string, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      const res = await saveSettings({ data: { notifications: next } });
      if (!res.ok) {
        toast.error(res.message);
        setPrefs(prefs);
      }
    } catch {
      setPrefs(prefs);
      toast.error("Could not save that preference");
    }
  }

  return (
    <SectionCard title="Notification preferences">
      <div className="divide-y divide-border">
        {NOTIFICATION_ITEMS.map((it) => (
          <div key={it.key} className="flex items-center gap-4 p-5">
            <div className="flex-1">
              <div className="text-sm font-semibold">{it.label}</div>
              <div className="text-xs text-muted-foreground">{it.desc}</div>
            </div>
            <Switch
              on={prefs[it.key] ?? true}
              label={it.label}
              onChange={(v) => !loading && toggle(it.key, v)}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function TeamTab() {
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Recruiter");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      setMembers(await listTeam());
    } catch {
      /* not signed in */
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function invite() {
    if (!email.trim()) return toast.error("Enter an email address");
    setBusy(true);
    try {
      const res = await inviteTeammate({ data: { email: email.trim(), role } });
      res.ok ? toast.success(res.message) : toast.error(res.message);
      if (res.ok) setEmail("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard title="Team members">
      <div className="flex flex-wrap items-end gap-2 border-b border-border p-5">
        <div className="min-w-[200px] flex-1">
          <Field label="Invite by email" value={email} onChange={setEmail} type="email" />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-2 text-xs font-semibold"
        >
          {["Admin", "Recruiter", "Hiring Manager", "Viewer"].map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button
          disabled={busy}
          onClick={invite}
          className="rounded-md bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send invite"}
        </button>
      </div>

      {members.length === 0 ? (
        <p className="p-6 text-xs text-muted-foreground">
          No teammates yet. Invite someone above — they get an email with a signup link.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-4 p-4">
              <div className="grid size-10 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">
                {m.email.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{m.email}</div>
                <div className="text-xs text-muted-foreground">
                  {m.role} · {m.status}
                </div>
              </div>
              <button
                onClick={async () => {
                  const res = await revokeTeammate({ data: { id: m.id } });
                  res.ok ? toast.success(res.message) : toast.error(res.message);
                  await refresh();
                }}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SecurityTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-6">
      <SectionCard title="Password">
        <div className="space-y-4 p-6">
          <Field label="Current password" type="password" value={current} onChange={setCurrent} />
          <Field label="New password" type="password" value={next} onChange={setNext} />
          <div className="flex justify-end">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await changePassword({
                    data: { currentPassword: current, newPassword: next },
                  });
                  res.ok ? toast.success(res.message) : toast.error(res.message);
                  if (res.ok) {
                    setCurrent("");
                    setNext("");
                  }
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not update password");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-md bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Passwords are managed by the authentication service. Minimum 8 characters.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Session">
        <div className="space-y-2 p-6 text-xs text-muted-foreground">
          <p>
            You are signed in with an encrypted, http-only session cookie that expires after 7 days
            of inactivity.
          </p>
          <p>Signing out from the sidebar clears the cookie on this device immediately.</p>
        </div>
      </SectionCard>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}
