import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, Clock, Radio } from "lucide-react";

type BadgeTone = "neutral" | "signal" | "amber" | "rose" | "cobalt";
type FeatureTone = "signal" | "amber" | "rose" | "cobalt";

export function AppShell({
  children,
  fitViewport = false
}: {
  children: ReactNode;
  fitViewport?: boolean;
}) {
  return (
    <main className={fitViewport ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]"}>
      <div
        className={`mx-auto grid w-full max-w-[1360px] grid-cols-1 px-3 sm:px-5 lg:grid-cols-[11rem_minmax(0,1fr)] lg:px-6 ${
          fitViewport
            ? "h-full gap-3 py-3 sm:py-4 lg:gap-4 lg:py-4"
            : "gap-4 py-4 lg:gap-6 lg:py-6"
        }`}
      >
        <header className="relative z-30 rounded-[0.55rem] border border-white/10 bg-ink px-3 py-3 text-paper shadow-diffusion sm:px-4 lg:sticky lg:top-4 lg:flex lg:min-h-[calc(100dvh-2rem)] lg:flex-col lg:justify-between">
          <div className="flex items-center justify-between gap-2 lg:flex-col lg:items-stretch lg:gap-7">
            <Link
              href="/"
              aria-label="Forebrief"
              className="focus-ring pressable group flex items-center gap-2 rounded-md py-1 pr-2 lg:flex-col lg:items-start"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 512 512"
                  role="img"
                  aria-hidden="true"
                  className="h-8 w-8"
                >
                  <defs>
                    <linearGradient id="fb-mark-tile" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="oklch(74% 0.148 82)" />
                      <stop offset="1" stopColor="oklch(61% 0.128 172)" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="512" height="512" rx="76" ry="76" fill="url(#fb-mark-tile)" />
                  <circle cx="160" cy="256" r="34" fill="#ffffff" />
                  <circle cx="160" cy="256" r="13" fill="oklch(17% 0.012 248)" />
                  <path
                    d="M284 168 L412 256 L284 344"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="44"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M194 256 L266 256"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity="0.92"
                    strokeWidth="22"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <h1 className="text-lg font-semibold tracking-normal text-paper sm:text-xl lg:text-2xl">
                Forebrief
              </h1>
            </Link>
            <nav className="flex shrink-0 items-center gap-1 text-sm font-medium text-paper/70 sm:gap-1.5 lg:flex-col lg:items-stretch">
              <NavLink href="/briefing/meeting-2026-06-20-priya">Briefing</NavLink>
              <NavLink href="/live/meeting-2026-06-20-priya">Live</NavLink>
            </nav>
          </div>
          <p className="mt-8 hidden text-xs font-medium leading-5 text-paper/45 lg:block">
            Meeting memory, live capture, and follow-up review in one workspace.
          </p>
        </header>
        <div
          className={
            fitViewport
              ? "workspace-stripes flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-[0.55rem] border border-line bg-paper/90 p-2 lg:gap-4 lg:p-3"
              : "workspace-stripes flex flex-col gap-5 rounded-[0.55rem] border border-line bg-paper/90 p-2 lg:gap-7 lg:p-3"
          }
        >
          {children}
        </div>
      </div>
    </main>
  );
}

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring pressable shrink-0 rounded-[0.35rem] border border-white/10 px-3 py-1.5 text-paper/78 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-paper sm:px-3.5 sm:py-2"
    >
      {children}
    </Link>
  );
}

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = ""
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface-enter rounded-[0.55rem] border border-line bg-paper p-4 shadow-soft sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-lg font-semibold tracking-tight text-ink sm:text-xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = ""
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${className}`}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-normal text-ink md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-base leading-7 text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function FeatureCard({
  eyebrow,
  title,
  description,
  href,
  cta,
  icon,
  tone = "signal",
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: ReactNode;
  tone?: FeatureTone;
  children?: ReactNode;
}) {
  const tones: Record<FeatureTone, string> = {
    signal: "border-signal/25 bg-signal/10 text-signal",
    amber: "border-amber/35 bg-amber/15 text-amber",
    rose: "border-rose/30 bg-rose/10 text-rose",
    cobalt: "border-cobalt/30 bg-cobalt/10 text-cobalt"
  };

  return (
    <Link
      href={href}
      className="focus-ring group flex min-h-[220px] flex-col rounded-[0.55rem] border border-line bg-paper p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-ink/25 hover:bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-lg border p-2 ${tones[tone]}`}>{icon}</div>
        <ArrowRight className="mt-1 h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-signal" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-muted">{description}</p>
      {children ? <div className="mt-4">{children}</div> : null}
      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink">
        {cta}
        <ArrowRight className="h-4 w-4 text-signal" />
      </span>
    </Link>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral"
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: BadgeTone;
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: "bg-paper",
    signal: "bg-signal/10",
    amber: "bg-amber/15",
    rose: "bg-rose/10",
    cobalt: "bg-cobalt/10"
  };

  return (
    <div className={`rounded-[0.45rem] border border-line p-3 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none text-ink">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-5 text-muted">{detail}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "border-line bg-paper text-muted",
    signal: "border-signal/30 bg-signal/10 text-ink",
    amber: "border-amber/40 bg-amber/15 text-ink",
    rose: "border-rose/40 bg-rose/10 text-ink",
    cobalt: "border-cobalt/30 bg-cobalt/10 text-ink"
  };

  return (
    <span className={`inline-flex w-fit items-center rounded-[0.35rem] border px-2.5 py-1 text-[0.72rem] font-semibold leading-none ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({
  href,
  children,
  icon = <ArrowRight className="h-4 w-4" />
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.4rem] bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-colors hover:bg-cobalt"
    >
      {children}
      {icon}
    </Link>
  );
}

export function SecondaryButton({
  href,
  children,
  icon = <ArrowRight className="h-4 w-4" />
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.4rem] border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink/30 hover:bg-panel"
    >
      {children}
      {icon}
    </Link>
  );
}

export function IconPill({
  icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: BadgeTone;
}) {
  return (
    <div className="hover-lift rounded-[0.55rem] border border-line bg-paper p-3 transition-transform">
      <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">
        <span className={tone === "signal" ? "text-signal" : tone === "amber" ? "text-amber" : "text-muted"}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold leading-5 text-ink">{value}</p>
    </div>
  );
}

export function StatusIcon({ status }: { status: "ready" | "warning" | "live" | "done" }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-signal" />;
  if (status === "warning") return <CircleAlert className="h-4 w-4 text-amber" />;
  if (status === "live") return <Radio className="h-4 w-4 text-rose" />;
  return <Clock className="h-4 w-4 text-muted" />;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[0.55rem] border border-dashed border-line bg-panel px-4 py-8 text-center text-sm text-muted">
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-[0.2rem] bg-line" />
      <p>{children}</p>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-line bg-paper px-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div>
        {typeof eyebrow === "string" ? <Badge tone="signal">{eyebrow}</Badge> : eyebrow}
        <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-[65ch] text-base leading-7 text-muted">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-2 md:justify-end">{action}</div> : null}
    </section>
  );
}
