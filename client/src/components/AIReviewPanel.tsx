import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, HelpCircle, GraduationCap } from 'lucide-react';
import {
  EVALUATION_LABELS,
  GOOD_EVALUATIONS,
  BAD_EVALUATIONS,
  type MoveEvaluation,
} from '@shared/const';

interface SuggestedMove {
  move: string;
  reason: string;
}

interface ReviewData {
  evaluation: string | null;
  reason: string | null;
  suggestedMoves: SuggestedMove[] | unknown;
  strategy: string | null;
}

interface AIReviewPanelProps {
  review?: ReviewData | null;
  isLoading?: boolean;
  onAnalyze?: () => void;
  moveNumber?: number;
  totalMoves?: number;
}

const isGood = (evaluation: string) =>
  GOOD_EVALUATIONS.includes(evaluation as MoveEvaluation);
const isBad = (evaluation: string) =>
  BAD_EVALUATIONS.includes(evaluation as MoveEvaluation);

const evaluationColor = (evaluation: string | null) => {
  if (!evaluation) return 'bg-gray-100 text-gray-800';
  if (isGood(evaluation)) return 'bg-green-100 text-green-800';
  if (isBad(evaluation)) return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

const evaluationIcon = (evaluation: string | null) => {
  if (!evaluation) return null;
  if (isGood(evaluation)) return <CheckCircle className="w-5 h-5 text-green-600" />;
  if (isBad(evaluation)) return <AlertCircle className="w-5 h-5 text-red-600" />;
  return <HelpCircle className="w-5 h-5 text-yellow-600" />;
};

const evaluationLabel = (evaluation: string | null) =>
  (evaluation && EVALUATION_LABELS[evaluation as MoveEvaluation]) || evaluation || '未知';

/**
 * "本手教學" panel: displays the AI's teaching analysis for the selected move.
 */
export const AIReviewPanel: React.FC<AIReviewPanelProps> = ({
  review,
  isLoading = false,
  onAnalyze,
  moveNumber = 0,
  totalMoves = 0,
}) => {
  const suggestedMoves =
    review && Array.isArray(review.suggestedMoves)
      ? (review.suggestedMoves as SuggestedMove[])
      : [];

  return (
    <Card className="w-full h-full flex flex-col border-emerald-200">
      <CardHeader className="pb-3 bg-emerald-50 border-b border-emerald-100 rounded-t-xl">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
            <GraduationCap className="w-5 h-5" />
            本手教學
          </CardTitle>
          {moveNumber > 0 && (
            <span className="text-xs text-emerald-700">
              第 {moveNumber} 手 / 共 {totalMoves} 手
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4 pt-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Spinner />
            <p className="text-sm text-gray-500">正在分析棋局...</p>
          </div>
        ) : review ? (
          <>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">你選擇了第 {moveNumber} 手</h3>
              <div className="flex items-center gap-2">
                {evaluationIcon(review.evaluation)}
                {review.evaluation && (
                  <Badge className={evaluationColor(review.evaluation)}>
                    {evaluationLabel(review.evaluation)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">教學要點</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{review.reason}</p>
            </div>

            {suggestedMoves.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">替代走法建議</h3>
                <div className="space-y-2">
                  {suggestedMoves.map((move, idx) => (
                    <div key={`${move.move}-${idx}`} className="p-2 bg-emerald-50 rounded border border-emerald-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{move.move}</Badge>
                        <span className="text-xs text-gray-500">建議 {idx + 1}</span>
                      </div>
                      <p className="text-xs text-gray-600">{move.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {review.strategy && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">💡 思考重點</h3>
                <p className="text-sm text-gray-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-md p-3">
                  {review.strategy}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-4xl">📋</div>
            <p className="text-sm text-gray-500">選擇一手棋，開始本手教學</p>
          </div>
        )}
      </CardContent>

      {onAnalyze && !isLoading && moveNumber > 0 && !review && (
        <div className="border-t p-3">
          <Button onClick={onAnalyze} className="w-full bg-emerald-600 hover:bg-emerald-700">
            分析此手
          </Button>
        </div>
      )}
    </Card>
  );
};
