import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { trpc } from '@/lib/trpc';
import { GoBoard } from '@/components/GoBoard';
import { AIReviewPanel } from '@/components/AIReviewPanel';
import { ChatReviewBox } from '@/components/ChatReviewBox';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Zap } from 'lucide-react';

/**
 * Review page: Display game and AI analysis with chat
 */
export default function Review() {
  const [, params] = useRoute('/review/:gameId');
  const gameId = params?.gameId ? parseInt(params.gameId, 10) : null;

  const [currentMove, setCurrentMove] = useState(0);
  const [selectedMove, setSelectedMove] = useState(0);

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
      await analyzeFullGameMutation.mutateAsync({ gameId });

      // Refetch reviews
      await reviewQuery.refetch();
    } catch (error) {
      console.error('Error analyzing game:', error);
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
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleClearHistory = async () => {
    if (!gameId) return;

    try {
      await clearHistoryMutation.mutateAsync({ gameId });
      await chatHistoryQuery.refetch();
    } catch (error) {
      console.error('Error clearing history:', error);
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
            disabled={analyzeFullGameMutation.isPending}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            {analyzeFullGameMutation.isPending ? '分析中...' : '全局複盤'}
          </Button>
        </div>

        {/* Main content - Three column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Left: Board (2 columns) */}
          <div className="lg:col-span-2">
            <Card className="p-6 h-full">
              <div className="overflow-x-auto flex justify-center">
                <GoBoard
                  moves={game.moves}
                  currentMoveNumber={currentMove}
                  onMoveSelect={setSelectedMove}
                  width={700}
                  height={700}
                />
              </div>
            </Card>
          </div>

          {/* Middle: AI Review Panel (1 column) */}
          <div className="lg:col-span-1">
            <AIReviewPanel
              review={reviewQuery.data}
              isLoading={reviewQuery.isLoading || analyzeMutation.isPending}
              onAnalyze={handleAnalyzeMove}
              moveNumber={selectedMove}
              totalMoves={game.totalMoves}
            />
          </div>

          {/* Right: Chat Review (1 column) */}
          <div className="lg:col-span-1">
            <ChatReviewBox
              messages={chatHistoryQuery.data?.messages || []}
              isLoading={sendMessageMutation.isPending}
              onSendMessage={handleSendMessage}
              onClearHistory={handleClearHistory}
              moveNumber={selectedMove}
              totalMoves={game.totalMoves}
            />
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
