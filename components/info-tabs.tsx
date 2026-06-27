"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";

export type InfoTab = {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  /** Live count shown as a pill on the tab. */
  badge?: number;
  /** Pulse the tab to draw the eye when something new needs attention. */
  attention?: boolean;
};

/**
 * Mobile-style bottom tab bar. The advisor pulls up extra context only when
 * they want it: tapping a tab slides its panel up over the page, tapping again
 * (or the close control) tucks it away so the primary surface stays focused.
 *
 * `attentionSignal` lets a parent auto-open a tab when fresh content lands
 * (e.g. a new live suggestion) — the panel pops up on its own as needed.
 */
export function InfoTabs({
  tabs,
  attentionSignal,
  floatingContent,
  onActiveChange
}: {
  tabs: InfoTab[];
  attentionSignal?: { tabId: string; nonce: number };
  floatingContent?: ReactNode;
  onActiveChange?: (active: boolean) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const handledAttentionNonceRef = useRef(0);
  const active = tabs.find((tab) => tab.id === activeId) ?? null;

  useEffect(() => {
    onActiveChange?.(Boolean(activeId));
  }, [activeId, onActiveChange]);

  // Auto-surface the tab a parent flags. nonce changes each time, so repeated
  // attention on the same tab still re-opens it.
  useEffect(() => {
    if (!attentionSignal || attentionSignal.nonce <= 0) return;
    if (handledAttentionNonceRef.current === attentionSignal.nonce) return;

    handledAttentionNonceRef.current = attentionSignal.nonce;
    const timeout = window.setTimeout(() => {
      setActiveId(attentionSignal.tabId);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [attentionSignal]);

  return (
    <>
      {/* Keeps page content clear of the fixed bar. */}
      <div aria-hidden className="h-24" />

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-4 lg:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          {active ? (
            <>
              {floatingContent ? <div className="caption-enter mb-2">{floatingContent}</div> : null}
              <div
                className={`caption-enter mb-2 overflow-auto rounded-[1.6rem] border border-line/80 bg-panel/95 p-4 shadow-diffusion backdrop-blur-xl sm:p-5 ${
                  floatingContent ? "max-h-[52vh] sm:max-h-[56vh]" : "max-h-[64vh]"
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted">
                    {active.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    aria-label="Close panel"
                    className="focus-ring pressable inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-muted transition-colors hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {active.content}
              </div>
            </>
          ) : null}

          <div className="grid grid-flow-col auto-cols-fr items-stretch gap-1 rounded-[1.4rem] border border-line/80 bg-panel/85 p-1.5 shadow-diffusion backdrop-blur-xl">
            {tabs.map((tab, index) => {
              const isActive = tab.id === activeId;
              const showBadge = typeof tab.badge === "number" && tab.badge > 0;
              return (
                <button
                  key={`${tab.id}-${index}`}
                  type="button"
                  onClick={() => setActiveId(isActive ? null : tab.id)}
                  aria-pressed={isActive}
                  className={`focus-ring pressable relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 py-2 text-[0.66rem] font-semibold leading-none transition-colors sm:min-h-11 sm:flex-row sm:gap-2 sm:px-2 sm:py-2 sm:text-sm ${
                    isActive
                      ? "bg-ink text-paper"
                      : tab.attention && !isActive
                        ? "bg-signal/10 text-ink"
                        : "text-muted hover:bg-paper hover:text-ink"
                  }`}
                >
                  <span className="relative flex h-4 w-4 items-center justify-center">
                    {tab.icon}
                    {tab.attention && !isActive ? (
                      <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-rose" />
                    ) : null}
                  </span>
                  <span className="max-w-full truncate leading-tight">{tab.label}</span>
                  {showBadge ? (
                    <span
                      className={`absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold sm:static ${
                        isActive ? "bg-paper text-ink" : "bg-signal text-ink"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                  {isActive ? <ChevronDown className="hidden h-3.5 w-3.5 sm:inline" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
