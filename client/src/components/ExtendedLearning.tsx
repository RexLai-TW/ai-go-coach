import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';

interface LearningItem {
  title: string;
  description: string;
}

const DEFAULT_ITEMS: LearningItem[] = [
  { title: '定石入門', description: '常見角部定石與其後續變化' },
  { title: '死活基礎', description: '一眼看穿基本死活形' },
  { title: '中盤戰鬥', description: '攻防轉換與厚薄判斷' },
  { title: '官子計算', description: '收官先後手與目數估算' },
];

/**
 * "延伸學習" sidebar/column: curated learning cards. Currently presentational —
 * wire up to a real course API when available.
 */
export function ExtendedLearning({ items = DEFAULT_ITEMS }: { items?: LearningItem[] }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-emerald-600" />
        延伸學習
      </h3>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.title} className="flex items-center gap-3 rounded-lg border border-gray-100 p-2 hover:bg-gray-50 transition-colors">
            <div className="h-10 w-10 shrink-0 rounded bg-amber-100 border border-amber-200 grid place-items-center text-amber-700 text-xs font-medium">
              棋
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            </div>
            <Button variant="ghost" size="sm" className="text-emerald-700 shrink-0">
              學習
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
