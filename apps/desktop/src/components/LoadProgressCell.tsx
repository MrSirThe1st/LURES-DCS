import { useEffect, useId } from 'react';
import type { TruckLoadIndicator } from '@lures-dcs/domain';
import { OverlayCloseButton } from './OverlayCloseButton';

/** Progress stroke colors — vivid RYG so tone is readable on a thin ring. */
const STROKE_COLOR: Record<TruckLoadIndicator['color'], string> = {
  neutral: '#d4d4d8',
  green: '#15803d',
  yellow: '#ca8a04',
  red: '#b91c1c',
};

const SIZE = 36;
const STROKE = 3.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const COLOR_LABEL: Record<TruckLoadIndicator['color'], string> = {
  neutral: 'Neutral — not actively loading',
  green: 'Green — clean progress / all verified',
  yellow: 'Yellow — completed with modifications',
  red: 'Red — completed with pending bags',
};

type LoadProgressCellProps = {
  indicator: TruckLoadIndicator;
  infoOpen: boolean;
  onToggleInfo: () => void;
  onCloseInfo: () => void;
};

export function LoadProgressCell({
  indicator,
  infoOpen,
  onToggleInfo,
  onCloseInfo,
}: LoadProgressCellProps) {
  const titleId = useId();
  const ratio = Math.min(1, Math.max(0, indicator.fillRatio));
  const fillPct = Math.round(ratio * 100);
  const offset = CIRCUMFERENCE * (1 - ratio);
  const label =
    indicator.totalCount > 0
      ? `${indicator.doneCount}/${indicator.totalCount}`
      : `${fillPct}%`;

  useEffect(() => {
    if (!infoOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseInfo();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [infoOpen, onCloseInfo]);

  return (
    <>
      <div className="flex items-center gap-space-sm">
        <div
          className="relative shrink-0"
          title={`${indicator.doneCount}/${indicator.totalCount}`}
          aria-label={`Loading progress ${fillPct}%`}
        >
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={STROKE_COLOR[indicator.color]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              className="transition-[stroke-dashoffset] duration-300 ease-out"
            />
          </svg>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[0.65rem] font-semibold leading-none text-text-primary">
            {label}
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border text-xs font-semibold text-text-secondary hover:bg-background hover:text-text-primary"
          aria-label="Progress details"
          aria-haspopup="dialog"
          aria-expanded={infoOpen}
          title="Progress details"
          onClick={(event) => {
            event.stopPropagation();
            onToggleInfo();
          }}
        >
          i
        </button>
      </div>

      {infoOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-space-lg"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) onCloseInfo();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="w-full max-w-md border border-border bg-surface shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-space-md border-b border-border p-space-md">
              <h2 id={titleId} className="text-lg font-semibold text-text-primary">
                Load progress
              </h2>
              <OverlayCloseButton onClick={onCloseInfo} />
            </div>
            <div className="flex flex-col gap-space-md p-space-md">
              <div className="flex items-center gap-space-md">
                <div className="relative shrink-0" aria-hidden>
                  <svg width={48} height={48} viewBox="0 0 48 48">
                    <circle
                      cx={24}
                      cy={24}
                      r={(48 - 4) / 2}
                      fill="none"
                      stroke="var(--color-border)"
                      strokeWidth={4}
                    />
                    <circle
                      cx={24}
                      cy={24}
                      r={(48 - 4) / 2}
                      fill="none"
                      stroke={STROKE_COLOR[indicator.color]}
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * ((48 - 4) / 2)}
                      strokeDashoffset={2 * Math.PI * ((48 - 4) / 2) * (1 - ratio)}
                      transform="rotate(-90 24 24)"
                    />
                  </svg>
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold text-text-primary">
                    {label}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col gap-space-xs">
                  <p className="text-sm font-medium text-text-primary">
                    {COLOR_LABEL[indicator.color]}
                  </p>
                  <p className="text-sm text-text-secondary">{indicator.explanation}</p>
                </div>
              </div>
              <ul className="flex flex-col gap-space-xs text-xs text-text-secondary">
                <li>
                  While <span className="font-medium text-text-primary">Loading</span>, the ring
                  fills green as bags are verified or modified.
                </li>
                <li>
                  After <span className="font-medium text-text-primary">Completed</span>: green =
                  all verified, yellow = modifications, red = pending bags left.
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
