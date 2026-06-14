import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Save, Trash2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

/**
 * Settings page: Manage LLM configurations
 */
export default function Settings() {
  const [, setLocation] = useLocation();
  const [provider, setProvider] = useState('openai');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch current settings
  const settingsQuery = trpc.llmSettings.get.useQuery();

  // Save settings mutation
  const saveMutation = trpc.llmSettings.save.useMutation();

  // Delete settings mutation
  const deleteMutation = trpc.llmSettings.delete.useMutation();

  // Test connection mutation
  const testMutation = trpc.llmSettings.test.useMutation();

  // Load settings into form
  useEffect(() => {
    if (settingsQuery.data) {
      setProvider(settingsQuery.data.provider);
      setApiBaseUrl(settingsQuery.data.apiBaseUrl || '');
      setModelName(settingsQuery.data.modelName || '');
      setIsEnabled(settingsQuery.data.isEnabled === 1);
      // Don't load API key from server (security)
    }
  }, [settingsQuery.data]);

  const handleSave = async () => {
    try {
      if (provider === 'custom') {
        if (!apiBaseUrl || !apiKey || !modelName) {
          toast.error('請填寫所有必填欄位');
          return;
        }
      }

      await saveMutation.mutateAsync({
        provider: provider as any,
        apiBaseUrl: apiBaseUrl || undefined,
        apiKey: apiKey || undefined,
        modelName: modelName || undefined,
        isEnabled,
      });

      toast.success('設定已保存');
      setApiKey(''); // Clear API key from form
      await settingsQuery.refetch();
    } catch (error) {
      toast.error('保存失敗');
      console.error('Save error:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除此設定嗎？')) return;

    try {
      await deleteMutation.mutateAsync();
      toast.success('設定已刪除');
      setProvider('openai');
      setApiBaseUrl('');
      setApiKey('');
      setModelName('');
      await settingsQuery.refetch();
    } catch (error) {
      toast.error('刪除失敗');
      console.error('Delete error:', error);
    }
  };

  const handleTest = async () => {
    if (!apiBaseUrl || !apiKey || !modelName) {
      toast.error('請填寫所有必填欄位');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testMutation.mutateAsync({
        apiBaseUrl,
        apiKey,
        modelName,
      });

      setTestResult(result);
      toast.success('連接成功！');
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '連接失敗',
      });
      toast.error('連接失敗');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/games')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">⚙️ 設定</h1>
        </div>

        {/* LLM Settings Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            🤖 AI 模型設定
          </h2>

          {settingsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  AI 提供商
                </Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                    <SelectItem value="deepseek">DeepSeek (推理模型)</SelectItem>
                    <SelectItem value="minimax">MiniMax (長文本)</SelectItem>
                    <SelectItem value="custom">自訂 OpenAI 相容 API</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  選擇 AI 模型提供商。選擇「自訂」可使用自己的 API。
                </p>
              </div>

              {/* Custom Provider Fields */}
              {provider === 'custom' && (
                <>
                  {/* API Base URL */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      API Base URL *
                    </Label>
                    <Input
                      type="url"
                      placeholder="https://api.openai.com/v1"
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      例如：https://api.openai.com/v1 或其他 OpenAI 相容 API 端點
                    </p>
                  </div>

                  {/* API Key */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      API Key *
                    </Label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      你的 API 密鑰將被加密儲存
                    </p>
                  </div>

                  {/* Model Name */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      模型名稱 *
                    </Label>
                    <Input
                      type="text"
                      placeholder="gpt-4o"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      例如：gpt-4o、gpt-4-turbo、claude-3-sonnet 等
                    </p>
                  </div>

                  {/* Test Connection Button */}
                  <Button
                    onClick={handleTest}
                    disabled={isTesting || !apiBaseUrl || !apiKey || !modelName}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    {isTesting ? (
                      <>
                        <Spinner className="w-4 h-4" />
                        測試中...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        測試連接
                      </>
                    )}
                  </Button>

                  {/* Test Result */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        testResult.success
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {testResult.success ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {testResult.message}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Enable/Disable Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <Label htmlFor="isEnabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                  啟用此設定
                </Label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="flex-1 gap-2"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      保存設定
                    </>
                  )}
                </Button>

                {settingsQuery.data && (
                  <Button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    variant="destructive"
                    className="gap-2"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Spinner className="w-4 h-4" />
                        刪除中...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        刪除
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <p className="font-medium mb-2">💡 提示</p>
                <ul className="space-y-1 text-xs">
                  <li>• 支援任何 OpenAI 相容的 API（如 Azure OpenAI、Ollama 等）</li>
                  <li>• API Key 將被加密儲存，不會被洩露</li>
                  <li>• 設定後，複盤時將使用你的 API 而非 Manus 內置 API</li>
                  <li>• 可隨時修改或刪除設定</li>
                </ul>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
