import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';

const CHECKLIST = [
  '理解本局開局方向',
  '找出關鍵的勝負手',
  '複習至少一個失誤',
  '記下一個可改進的習慣',
];

interface StudyNotesState {
  checked: boolean[];
  rating: number;
}

function storageKey(gameId: number | null) {
  return `study-notes-${gameId ?? 'none'}`;
}

/**
 * "學習筆記" panel: a per-game checklist and self-rating persisted to localStorage.
 */
export function StudyNotes({ gameId }: { gameId: number | null }) {
  const [state, setState] = useState<StudyNotesState>({
    checked: CHECKLIST.map(() => false),
    rating: 0,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(gameId));
      if (saved) {
        const parsed = JSON.parse(saved) as StudyNotesState;
        setState({
          checked: CHECKLIST.map((_, i) => parsed.checked?.[i] ?? false),
          rating: parsed.rating ?? 0,
        });
      } else {
        setState({ checked: CHECKLIST.map(() => false), rating: 0 });
      }
    } catch {
      setState({ checked: CHECKLIST.map(() => false), rating: 0 });
    }
  }, [gameId]);

  const persist = (next: StudyNotesState) => {
    setState(next);
    try {
      localStorage.setItem(storageKey(gameId), JSON.stringify(next));
    } catch {
      // Ignore quota / serialization errors — notes are best-effort.
    }
  };

  const toggle = (index: number) => {
    const checked = state.checked.map((v, i) => (i === index ? !v : v));
    persist({ ...state, checked });
  };

  return (
    <Card className="p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">學習筆記</h3>

      <div className="space-y-2 flex-1">
        {CHECKLIST.map((item, idx) => (
          <label key={item} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Checkbox checked={state.checked[idx]} onCheckedChange={() => toggle(idx)} />
            <span className={state.checked[idx] ? 'line-through text-gray-400' : ''}>{item}</span>
          </label>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-gray-500 mb-1">本局自評</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(value => (
            <button
              key={value}
              type="button"
              onClick={() => persist({ ...state, rating: value })}
              aria-label={`評分 ${value} 星`}
              className="p-0.5"
            >
              <Star
                className={`w-5 h-5 ${value <= state.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
              />
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
