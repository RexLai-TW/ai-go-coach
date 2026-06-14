import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface SuggestedMove {
  move: string;
  reason: string;
}

interface ReviewData {
  evaluation: 'good' | 'bad' | 'unclear' | 'blunder' | 'mistake' | 'questionable' | string | null;
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

/**
 * Panel for displaying AI analysis of a move
 */
export const AIReviewPanel: React.FC<AIReviewPanelProps> = ({
  review,
  isLoading = false,
  onAnalyze,
  moveNumber = 0,
  totalMoves = 0,
}) => {
  const getEvaluationColor = (evaluation: string | null) => {
    switch (evaluation) {
      case 'good':
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'bad':
      case 'blunder':
        return 'bg-red-100 text-red-800';
      case 'unclear':
      case 'questionable':
      case 'mistake':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEvaluationIcon = (evaluation: string | null) => {
    switch (evaluation) {
      case 'good':
      case 'excellent':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'bad':
      case 'blunder':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'unclear':
      case 'questionable':
      case 'mistake':
        return <HelpCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getEvaluationLabel = (evaluation: string | null) => {
    const labels: Record<string, string> = {
      good: 'Good',
      bad: 'Bad',
      unclear: 'Unclear',
      blunder: 'Blunder',
      mistake: 'Mistake',
      questionable: 'Questionable',
      excellent: 'Excellent',
    };
    return (evaluation && labels[evaluation]) || evaluation || 'Unknown';
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">🤖 AI 複盤分析</CardTitle>
          {moveNumber > 0 && (
            <span className="text-xs text-gray-500">
              第 {moveNumber} 手 / 共 {totalMoves} 手
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Spinner />
            <p className="text-sm text-gray-500">正在分析棋局...</p>
          </div>
        ) : review ? (
          <>
            {/* Evaluation */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">評估</h3>
              <div className="flex items-center gap-2">
                {review.evaluation && getEvaluationIcon(review.evaluation)}
                {review.evaluation && (
                  <Badge className={getEvaluationColor(review.evaluation)}>
                    {getEvaluationLabel(review.evaluation)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">分析</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {review.reason}
              </p>
            </div>

            {/* Suggested moves */}
            {review.suggestedMoves && Array.isArray(review.suggestedMoves) && review.suggestedMoves.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  替代走法建議
                </h3>
                <div className="space-y-2">
                  {(review.suggestedMoves as SuggestedMove[]).map((move, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-blue-50 rounded border border-blue-200"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{move.move}</Badge>
                        <span className="text-xs text-gray-500">
                          建議 {idx + 1}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{move.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategy */}
            {review.strategy && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">戰略方向</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {review.strategy}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-4xl">📋</div>
            <p className="text-sm text-gray-500">
              選擇一手棋進行分析
            </p>
          </div>
        )}
      </CardContent>

      {/* Action button */}
      {onAnalyze && !isLoading && moveNumber > 0 && !review && (
        <div className="border-t p-3">
          <Button
            onClick={onAnalyze}
            className="w-full"
            variant="default"
          >
            分析此手
          </Button>
        </div>
      )}
    </Card>
  );
};
