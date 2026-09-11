import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/routes/_app";
import { SectionCard } from "@/components/dashboard/primitives";
import { useDataset } from "@/hooks/use-dataset";
import { Bell, Briefcase, MessageSquare, Award, Sparkles, Calendar, Check } from "lucide-react";

export const Route = createFileRoute("/_app/candidate/notifications")({
  head: () => ({ meta: [{ title: "Notifications · ATS Engine" }] }),
  component: NotificationsPage,
});

type Notif = {
  id: string;
  type: "match" | "message" | "interview" | "offer" | "insight";
  title: string;
  desc: string;
  when: string;
  unread: boolean;
};

const iconFor: Record<Notif["type"], React.ComponentType<{ className?: string }>> = {
  match: Briefcase,
  message: MessageSquare,
  interview: Calendar,
  offer: Award,
  insight: Sparkles,
};

const toneFor: Record<Notif["type"], string> = {
  match: "bg-brand/10 text-brand",
  message: "bg-surface text-foreground/70",
  interview: "bg-accent/10 text-accent",
  offer: "bg-amber-100 text-amber-700",
  insight: "bg-purple-100 text-purple-700",
};

function NotificationsPage() {
  const { inbox } = useDataset();
  const [read, setRead] = useState<Set<string>>(new Set());
  const [allRead, setAllRead] = useState(false);
  const list: Notif[] = inbox.map((n) => ({
    ...n,
    unread: allRead || read.has(n.id) ? false : n.unread,
  }));
  const [filter, setFilter] = useState<"all" | Notif["type"]>("all");

  const filtered = filter === "all" ? list : list.filter((n) => n.type === filter);
  const unreadCount = list.filter((n) => n.unread).length;

  const markAllRead = () => setAllRead(true);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle={`${unreadCount} unread · matches, interviews, offers, and messages in one place.`}
        actions={
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-surface"
          >
            <Check className="size-3.5" /> Mark all read
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "match", "interview", "offer", "message", "insight"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-card text-muted-foreground hover:bg-surface"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <SectionCard>
        <div className="divide-y divide-border">
          {filtered.map((n) => {
            const Icon = iconFor[n.type];
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 transition-colors ${
                  n.unread ? "bg-accent/5" : "hover:bg-surface/40"
                }`}
              >
                <div
                  className={`grid size-10 shrink-0 place-items-center rounded-lg ${toneFor[n.type]}`}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{n.title}</div>
                    {n.unread && <span className="size-2 rounded-full bg-accent" />}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{n.desc}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {n.when}
                  </div>
                </div>
                <button
                  onClick={() => setRead((prev) => new Set(prev).add(n.id))}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <Bell className="mx-auto mb-2 size-6 opacity-40" />
              You're all caught up.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
