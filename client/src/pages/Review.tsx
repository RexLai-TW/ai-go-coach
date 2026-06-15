import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { GoBoard } from '@/components/GoBoard';
import { AIReviewPanel } from '@/components/AIReviewPanel';
import { ChatReviewBox } from '@/components/ChatReviewBox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Zap } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Review page: Display game and AI analysis with chat
 */
export default function Review() {
  const [, params] = useRoute('/review/:gameId');
  const gameId = params?.gameId ? parseInt(params.gameId, 10) : null;

  const [currentMove, setCurrentMove] = useState(0);
  const [selectedMove, setSelectedMove] = useState(0);
  const [boardSize, setBoardSize] = useState(700);
  const [fullGameProgress, setFullGameProgress] = useState<{ current: number; total: number } | null>(null);

  // Calculate responsive board size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        // Mobile: use most of the width minus padding
        setBoardSize(Math.min(500, width - 40));
      } else if (width < 1024) {
        // Tablet: medium size
        setBoardSize(550);
      } else {
        // Desktop: full size
        setBoardSize(700);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch game data
  const gameQuery = trpc.games.get.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId }
  );

  // Fetch review for current move
  const reviewQuery = trpc.analysis.getReview.useQuery(
    { gameId: gameId!, moveNumber: selectedMove },
    { enabled: !!gameId && selectedMove > 0 }
  );

  // Fetch all reviews for the game
  const allReviewsQuery = trpc.analysis.getGameReviews.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId }
  );

  // Chat Review queries and mutations
  const chatHistoryQuery = trpc.chatReview.getHistory.useQuery(
    { gameId: gameId! },
    { enabled: !!gameId }
  );
  const sendMessageMutation = trpc.chatReview.sendMessage.useMutation();
  const clearHistoryMutation = trpc.chatReview.clearHistory.useMutation();

  // Analyze move mutation
  const analyzeMutation = trpc.analysis.analyzeMove.useMutation();

  // Analyze full game mutation
  const analyzeFullGameMutation = trpc.analysis.analyzeFullGame.useMutation();

  const handleAnalyzeMove = async () => {
    if (!gameId || selectedMove <= 0) return;

    try {
      await analyzeMutation.mutateAsync({
        gameId,
        moveNumber: selectedMove,
      });

      // Refetch review
      await reviewQuery.refetch();
    } catch (error) {
      console.error('Error analyzing move:', error);
    }
  };

  const handleAnalyzeFullGame = async () => {
    if (!gameId) return;

    try {
      const totalMoves = game?.totalMoves || 0;
      setFullGameProgress({ current: 0, total: totalMoves });
      
      // 開始分析
      await analyzeFullGameMutation.mutateAsync({ gameId });

      // 分析完成後，輪詢進度直到完成
      const pollInterval = setInterval(async () => {
        try {
          const progressData = await (trpc.analysis.getFullGameProgress as any).query({ gameId });
          const analyzed = progressData.analyzedCount || 0;
          setFullGameProgress({ current: analyzed, total: totalMoves });
          
          if (analyzed >= totalMoves) {
            clearInterval(pollInterval);
            // 分析完成，重新獲取所有複盤結果
            const utils = trpc.useUtils();
            await utils.analysis.getGameReviews.invalidate({ gameId });
            setFullGameProgress(null);
            toast.success('全局複盤完成！');
          }
        } catch (err) {
          console.error('Error polling progress:', err);
        }
      }, 1000); // 每秒輪詢一次
    } catch (error) {
      console.error('Error analyzing game:', error);
      setFullGameProgress(null);
      toast.error('全局複盤失敗，請重試');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!gameId) return;

    try {
      await sendMessageMutation.mutateAsync({
        gameId,
        moveNumber: selectedMove,
        message,
      });

      // Refetch chat history
      await chatHistoryQuery.refetch();
      toast.success('訊息已發送');
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">無效的遊戲 ID</p>
      </div>
    );
  }

  if (gameQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!gameQuery.data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">無法載入遊戲</p>
      </div>
    );
  }

  const game = gameQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <a href="/games">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回
              </a>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{game.title}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {game.playerBlack} vs {game.playerWhite}
                {game.result && ` • 結果: ${game.result}`}
              </p>
            </div>
          </div>

          <Button
            onClick={handleAnalyzeFullGame}
            disabled={analyzeFullGameMutation.isPending || fullGameProgress !== null}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {fullGameProgress ? `分析中 ${fullGameProgress.current}/${fullGameProgress.total}` : '全局複盤'}
          </Button>
        </div>

        {/* Main content - Two column layout (80:20) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          {/* Left: Board + AI Review Panel (4 columns = 80%) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Board */}
            <Card className="p-6">
              <div className="overflow-x-auto flex justify-center">
                <GoBoard
                  moves={game.moves}
                  currentMoveNumber={currentMove}
                  onMoveSelect={setSelectedMove}
                  width={boardSize}
                  height={boardSize}
                  analyzedMoves={allReviewsQuery.data?.map(r => r.moveNumber) || []}
                />
              </div>
            </Card>

            {/* Full Game Review Progress */}
            {fullGameProgress && (
              <Card className="p-4 bg-blue-50 border border-blue-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-900">全局複盤進度</h3>
                    <span className="text-sm text-blue-700">
                      {fullGameProgress.current} / {fullGameProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${fullGameProgress.total > 0 ? (fullGameProgress.current / fullGameProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-blue-700">正在分析棋局中...</p>
                </div>
              </Card>
            )}

            {/* Full Game Review Results Summary */}
            {allReviewsQuery.data && allReviewsQuery.data.length > 0 && !fullGameProgress && (
              <Card className="p-4 bg-green-50 border border-green-200">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-green-900">複盤統計</h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-green-600 font-semibold">{allReviewsQuery.data.length}</p>
                      <p className="text-green-700">已分析手數</p>
                    </div>
                    <div>
                      <p className="text-green-600 font-semibold">
                        {allReviewsQuery.data.filter(r => r.evaluation === 'good' || r.evaluation === 'excellent').length}
                      </p>
                      <p className="text-green-700">優秀走法</p>
                    </div>
                    <div>
                      <p className="text-red-600 font-semibold">
                        {allReviewsQuery.data.filter(r => r.evaluation === 'bad' || r.evaluation === 'blunder').length}
                      </p>
                      <p className="text-red-700">失誤走法</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* AI Review Panel */}
            <div>
              <AIReviewPanel
                review={reviewQuery.data}
                isLoading={reviewQuery.isLoading || analyzeMutation.isPending}
                onAnalyze={handleAnalyzeMove}
                moveNumber={selectedMove}
                totalMoves={game.totalMoves}
              />
            </div>
          </div>

          {/* Right: Chat Review (1 column = 20%) */}
          <div className="lg:col-span-1">
            <Card className="p-4 h-full flex flex-col sticky top-6">
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
        </div>

        {/* Game info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase">黑方</p>
            <p className="text-lg font-semibold text-gray-900">
              {game.playerBlack || '未知'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase">白方</p>
            <p className="text-lg font-semibold text-gray-900">
              {game.playerWhite || '未知'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase">貼目</p>
            <p className="text-lg font-semibold text-gray-900">
              {game.komi || '-'}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-gray-500 uppercase">總手數</p>
            <p className="text-lg font-semibold text-gray-900">
              {game.totalMoves}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
