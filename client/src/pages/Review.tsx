import { useState, useEffect, useRef } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { GoBoard } from '@/components/GoBoard';
import { AIReviewPanel } from '@/components/AIReviewPanel';
import { ChatReviewBox } from '@/components/ChatReviewBox';
import { ExtendedLearning } from '@/components/ExtendedLearning';
import { StudyNotes } from '@/components/StudyNotes';
import { WeeklyProgress } from '@/components/WeeklyProgress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { GOOD_EVALUATIONS, BAD_EVALUATIONS, type MoveEvaluation } from '@shared/const';

/**
 * Review page: teaching-mode dashboard with board, per-move teaching, chat and notes.
 */
export default function Review() {
  const [, params] = useRoute('/review/:gameId');
  const gameId = params?.gameId ? parseInt(params.gameId, 10) : null;
  const utils = trpc.useUtils();

  const [selectedMove, setSelectedMove] = useState(0);
  const [boardSize, setBoardSize] = useState(560);
  const [fullGameProgress, setFullGameProgress] = useState<{ current: number; total: number } | null>(null);

  // Guards the background analysis loop so it stops when the component unmounts.
  const analysisCancelled = useRef(false);
  useEffect(() => {
    analysisCancelled.current = false;
    return () => {
      analysisCancelled.current = true;
    };
  }, []);

  // Responsive board size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) setBoardSize(Math.min(440, width - 48));
      else if (width < 1280) setBoardSize(480);
      else setBoardSize(560);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const gameQuery = trpc.games.get.useQuery({ gameId: gameId! }, { enabled: !!gameId });

  const reviewQuery = trpc.analysis.getReview.useQuery(
    { gameId: gameId!, moveNumber: selectedMove },
    { enabled: !!gameId && selectedMove > 0 }
  );

  const allReviewsQuery = trpc.analysis.getGameReviews.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId }
  );

  const chatHistoryQuery = trpc.chatReview.getHistory.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId }
  );
  const sendMessageMutation = trpc.chatReview.sendMessage.useMutation();
  const clearHistoryMutation = trpc.chatReview.clearHistory.useMutation();
  const analyzeMutation = trpc.analysis.analyzeMove.useMutation();
  const analyzeFullGameMutation = trpc.analysis.analyzeFullGame.useMutation();

  const handleAnalyzeMove = async () => {
    if (!gameId || selectedMove <= 0) return;
    try {
      await analyzeMutation.mutateAsync({ gameId, moveNumber: selectedMove });
      await Promise.all([reviewQuery.refetch(), allReviewsQuery.refetch()]);
      toast.success(`第 ${selectedMove} 手分析完成`);
    } catch (error) {
      console.error('Error analyzing move:', error);
      toast.error('分析此手失敗，請重試');
    }
  };

  const handleAnalyzeFullGame = async () => {
    if (!gameId || !gameQuery.data) return;

    const total = gameQuery.data.totalMoves || 0;
    setFullGameProgress({ current: allReviewsQuery.data?.length ?? 0, total });

    try {
      // Each request analyzes a small batch; loop until the server reports completion.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (analysisCancelled.current) return;

        const result = await analyzeFullGameMutation.mutateAsync({ gameId });
        await utils.analysis.getGameReviews.invalidate({ gameId });

        if (analysisCancelled.current) return;
        setFullGameProgress({ current: result.analyzedMoves, total: result.totalMoves });

        if (result.isComplete || result.newAnalyzed === 0) break;
      }

      setFullGameProgress(null);
      toast.success('全局複盤完成！');
    } catch (error) {
      console.error('Error analyzing game:', error);
      setFullGameProgress(null);
      toast.error('全局複盤失敗，請重試');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!gameId) return;
    try {
      await sendMessageMutation.mutateAsync({ gameId, moveNumber: selectedMove, message });
      await chatHistoryQuery.refetch();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('發送訊息失敗');
    }
  };

  const handleClearHistory = async () => {
    if (!gameId) return;
    try {
      await clearHistoryMutation.mutateAsync({ gameId });
      await chatHistoryQuery.refetch();
      toast.success('對話已清除');
    } catch (error) {
      console.error('Error clearing history:', error);
      toast.error('清除對話失敗');
    }
  };

  if (!gameId) {
    return <div className="flex items-center justify-center py-24 text-gray-500">無效的遊戲 ID</div>;
  }
  if (gameQuery.isLoading) {
    return <div className="flex items-center justify-center py-24"><Spinner /></div>;
  }
  if (!gameQuery.data) {
    return <div className="flex items-center justify-center py-24 text-gray-500">無法載入遊戲</div>;
  }

  const game = gameQuery.data;
  const reviews = allReviewsQuery.data ?? [];
  const analyzedCount = reviews.length;
  const goodCount = reviews.filter(r => GOOD_EVALUATIONS.includes(r.evaluation as MoveEvaluation)).length;
  const badCount = reviews.filter(r => BAD_EVALUATIONS.includes(r.evaluation as MoveEvaluation)).length;
  const progressPercent = game.totalMoves > 0 ? (analyzedCount / game.totalMoves) * 100 : 0;
  const isAnalyzing = fullGameProgress !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <a href="/games">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </a>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{game.title}</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              {game.playerBlack} vs {game.playerWhite}
              {game.result && ` • 結果：${game.result}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
            強型教學模式 · 目前進度 {selectedMove} 手
          </span>
          <Button onClick={handleAnalyzeFullGame} disabled={isAnalyzing} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Zap className="w-4 h-4" />
            {isAnalyzing ? `分析中 ${fullGameProgress!.current}/${fullGameProgress!.total}` : '全局複盤'}
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Board */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">棋盤</h2>
              <span className="text-xs text-gray-500">總手數 {game.totalMoves}</span>
            </div>
            <div className="flex justify-center">
              <GoBoard
                moves={game.moves}
                currentMoveNumber={selectedMove}
                onMoveSelect={setSelectedMove}
                width={boardSize}
                height={boardSize}
                analyzedMoves={reviews.map(r => r.moveNumber)}
                showMoveList={false}
              />
            </div>
          </Card>

          {isAnalyzing && (
            <Card className="p-4 bg-blue-50 border border-blue-200">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-900">全局複盤進度</h3>
                  <span className="text-sm text-blue-700">
                    {fullGameProgress!.current} / {fullGameProgress!.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${fullGameProgress!.total > 0 ? (fullGameProgress!.current / fullGameProgress!.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-blue-700">正在分批分析棋局，請稍候…</p>
              </div>
            </Card>
          )}
        </div>

        {/* Teaching panel */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <WeeklyProgress percent={progressPercent} analyzed={analyzedCount} total={game.totalMoves} />
          <div className="flex-1 min-h-[360px]">
            <AIReviewPanel
              review={reviewQuery.data}
              isLoading={reviewQuery.isLoading || analyzeMutation.isPending}
              onAnalyze={handleAnalyzeMove}
              moveNumber={selectedMove}
              totalMoves={game.totalMoves}
            />
          </div>
          {analyzedCount > 0 && (
            <Card className="p-4 bg-green-50 border border-green-200">
              <h3 className="text-sm font-semibold text-green-900 mb-2">複盤統計</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-lg font-bold text-green-700">{analyzedCount}</p>
                  <p className="text-green-700">已分析</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{goodCount}</p>
                  <p className="text-emerald-700">優秀走法</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{badCount}</p>
                  <p className="text-red-700">失誤走法</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Extended learning */}
        <div className="lg:col-span-2">
          <ExtendedLearning />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Move list (棋譜) */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">棋譜</h3>
          <div className="max-h-56 overflow-y-auto border rounded p-3 bg-gray-50">
            <div className="grid grid-cols-8 gap-1">
              {game.moves.map((move, idx) => (
                <button
                  key={`${idx}-${move.coordinate}`}
                  onClick={() => setSelectedMove(idx + 1)}
                  className={`p-1 text-xs rounded text-center transition-colors ${
                    selectedMove === idx + 1
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  title={`${move.player === 'black' ? '黑' : '白'} ${move.coordinate}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Study notes (學習筆記) */}
        <StudyNotes gameId={gameId} />

        {/* Coach chat (教練問答) */}
        <Card className="p-0 h-[420px] flex flex-col overflow-hidden">
          <ChatReviewBox
            messages={chatHistoryQuery.data?.messages || []}
            isLoading={sendMessageMutation.isPending}
            onSendMessage={handleSendMessage}
            onClearHistory={handleClearHistory}
            moveNumber={selectedMove}
            totalMoves={game.totalMoves}
          />
        </Card>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-gray-500">用 ← → 切換手數，點擊棋盤上的棋子可跳至該手。</p>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setSelectedMove(Math.min(game.totalMoves, selectedMove + 1))}
          disabled={selectedMove >= game.totalMoves}
        >
          下一步
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
