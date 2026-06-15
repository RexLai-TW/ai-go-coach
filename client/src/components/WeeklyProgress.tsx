import { Card } from '@/components/ui/card';

interface WeeklyProgressProps {
  /** 0-100 completion percentage for the current game's review. */
  percent: number;
  analyzed: number;
  total: number;
}

/**
 * Compact circular-progress widget shown in the sidebar ("本周學習進度").
 */
export function WeeklyProgress({ percent, analyzed, total }: WeeklyProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <Card className="p-4 bg-emerald-50/60 border-emerald-100">
      <h3 className="text-sm font-semibold text-emerald-900 mb-3">本周學習進度</h3>
      <div className="flex items-center gap-4">
        <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#d1fae5" strokeWidth="8" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="#059669"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 36 36)"
          />
          <text x="36" y="40" textAnchor="middle" className="fill-emerald-800 text-sm font-bold">
            {clamped}%
          </text>
        </svg>
        <div className="text-xs text-emerald-800 space-y-1">
          <p>本局複盤：{analyzed} / {total} 手</p>
          <p className="text-emerald-600">持續練習，穩定進步！</p>
        </div>
      </div>
    </Card>
  );
}
