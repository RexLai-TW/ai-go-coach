import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Brain, Upload, MessageSquare, TrendingUp } from "lucide-react";

/**
 * Home page: Landing page for AI Go Coach
 */
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setLocation("/games");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🎯</div>
            <h1 className="text-xl font-bold text-white">AI Go Coach</h1>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-slate-300">
                  歡迎，{user?.name || "棋手"}
                </span>
                <Button
                  onClick={handleGetStarted}
                  variant="default"
                >
                  進入棋譜庫
                </Button>
              </>
            ) : (
              <Button onClick={handleGetStarted} variant="default">
                開始使用
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
          你的專業圍棋教練
        </h2>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          使用 AI 技術分析每一手棋，獲得深度的戰略指導和即時的對話式教學
        </p>

        <Button
          onClick={handleGetStarted}
          size="lg"
          className="gap-2 text-lg px-8 py-6"
        >
          <Upload className="w-5 h-5" />
          上傳棋譜開始複盤
        </Button>
      </section>

      {/* Features section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          核心功能
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1 */}
          <Card className="p-6 bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-lg font-semibold text-white mb-2">
              逐手分析
            </h4>
            <p className="text-sm text-slate-300">
              AI 評估每一手棋的優劣，提供替代走法建議
            </p>
          </Card>

          {/* Feature 2 */}
          <Card className="p-6 bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <div className="text-4xl mb-4">💬</div>
            <h4 className="text-lg font-semibold text-white mb-2">
              對話式教練
            </h4>
            <p className="text-sm text-slate-300">
              提出任何問題，AI 教練根據局面為你詳細解答
            </p>
          </Card>

          {/* Feature 3 */}
          <Card className="p-6 bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <div className="text-4xl mb-4">🔍</div>
            <h4 className="text-lg font-semibold text-white mb-2">
              全局複盤
            </h4>
            <p className="text-sm text-slate-300">
              一鍵分析整盤棋局，標記關鍵失誤和精妙之手
            </p>
          </Card>

          {/* Feature 4 */}
          <Card className="p-6 bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
            <div className="text-4xl mb-4">📈</div>
            <h4 className="text-lg font-semibold text-white mb-2">
              進度追蹤
            </h4>
            <p className="text-sm text-slate-300">
              保存所有複盤記錄，追蹤你的進步和改進
            </p>
          </Card>
        </div>
      </section>

      {/* How it works section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h3 className="text-3xl font-bold text-white text-center mb-12">
          使用步驟
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">
              上傳棋譜
            </h4>
            <p className="text-slate-300">
              選擇 SGF 格式的棋譜檔案上傳到平台
            </p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">
              AI 分析
            </h4>
            <p className="text-slate-300">
              AI 教練逐手分析棋局，提供深度評估
            </p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">
              對話學習
            </h4>
            <p className="text-slate-300">
              與 AI 對話，深入理解每一步的戰略意義
            </p>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <Card className="p-12 bg-gradient-to-r from-blue-600 to-blue-700 border-0">
          <h3 className="text-3xl font-bold text-white mb-4">
            準備好提升你的圍棋水平了嗎？
          </h3>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            開始使用 AI Go Coach，讓每一盤棋都成為學習的機會
          </p>
          <Button
            onClick={handleGetStarted}
            size="lg"
            variant="secondary"
            className="gap-2 text-lg px-8 py-6"
          >
            <Upload className="w-5 h-5" />
            上傳第一個棋譜
          </Button>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-400">
          <p>© 2026 AI Go Coach. 使用 AI 技術打造的專業圍棋複盤平台。</p>
        </div>
      </footer>
    </div>
  );
}
