import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Trash2, Plus, Settings, Search } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Games page: Manage game library
 */
export default function Games() {
  const [, setLocation] = useLocation();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch games list
  const gamesQuery = trpc.games.list.useQuery({ limit: 50 });

  // Delete game mutation
  const deleteMutation = trpc.games.delete.useMutation();

  // Upload game mutation
  const uploadMutation = trpc.games.upload.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const content = await uploadFile.text();
      const title = uploadFile.name.replace('.sgf', '');

      await uploadMutation.mutateAsync({
        title,
        sgfContent: content,
      });

      toast.success('棋譜上傳成功');
      setUploadFile(null);

      // Refetch games
      await gamesQuery.refetch();

      // Reset file input
      const fileInput = document.getElementById('sgf-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      toast.error('上傳失敗');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (gameId: number) => {
    if (!confirm('確定要刪除此棋譜嗎？')) return;

    try {
      await deleteMutation.mutateAsync({ gameId });
      toast.success('棋譜已刪除');
      await gamesQuery.refetch();
    } catch (error) {
      toast.error('刪除失敗');
      console.error('Delete error:', error);
    }
  };

  const handlePlayGame = (gameId: number) => {
    setLocation(`/review/${gameId}`);
  };

  // Filter games based on search query
  const filteredGames = gamesQuery.data?.games.filter(game => {
    const query = searchQuery.toLowerCase();
    return (
      game.title?.toLowerCase().includes(query) ||
      game.playerBlack?.toLowerCase().includes(query) ||
      game.playerWhite?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🎯 我的棋譜庫
            </h1>
            <p className="text-gray-600">
              上傳 SGF 棋譜，使用 AI 教練進行複盤分析
            </p>
          </div>
          <Button
            onClick={() => setLocation('/settings')}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            設定
          </Button>
        </div>

        {/* Search bar */}
        <div className="mb-6 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜尋棋譜標題、棋手名稱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="text-gray-500"
            >
              清除
            </Button>
          )}
        </div>

        {/* Upload section */}
        <Card className="p-6 mb-8 border-2 border-dashed border-blue-300 bg-blue-50">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                上傳新棋譜
              </h2>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  id="sgf-file"
                  type="file"
                  accept=".sgf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="cursor-pointer"
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    上傳中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    上傳
                  </>
                )}
              </Button>
            </div>

            {uploadFile && (
              <p className="text-sm text-gray-600">
                已選擇：{uploadFile.name}
              </p>
            )}
          </div>
        </Card>

        {/* Games list */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            我的棋譜 ({gamesQuery.data?.total || 0})
          </h2>

          {gamesQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGames.map((game) => (
                <Card
                  key={game.id}
                  className="p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold text-gray-900 truncate">
                      {game.title}
                    </h3>

                    {/* Players */}
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">黑方：</span>
                        {game.playerBlack || '未知'}
                      </p>
                      <p>
                        <span className="font-medium">白方：</span>
                        {game.playerWhite || '未知'}
                      </p>
                    </div>

                    {/* Result and date */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {game.uploadedAt
                          ? new Date(game.uploadedAt).toLocaleDateString('zh-TW')
                          : '未知日期'}
                      </span>
                      {game.result && (
                        <Badge variant="secondary">{game.result}</Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        onClick={() => handlePlayGame(game.id)}
                        size="sm"
                        className="flex-1 gap-2"
                      >
                        <Play className="w-4 h-4" />
                        複盤
                      </Button>
                      <Button
                        onClick={() => handleDelete(game.id)}
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : searchQuery ? (
            <Card className="p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 mb-4">
                找不到符合 "{searchQuery}" 的棋譜
              </p>
              <Button
                onClick={() => setSearchQuery('')}
                variant="outline"
                className="mt-4"
              >
                清除搜尋
              </Button>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-gray-600 mb-4">
                還沒有上傳任何棋譜
              </p>
              <p className="text-sm text-gray-500">
                上傳 SGF 棋譜檔案開始使用 AI 教練進行複盤分析
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
