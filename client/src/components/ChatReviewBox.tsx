import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Send, Trash2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ChatReviewBoxProps {
  messages?: Message[];
  isLoading?: boolean;
  onSendMessage?: (message: string) => void;
  onClearHistory?: () => void;
  moveNumber?: number;
  totalMoves?: number;
}

/**
 * Chat Review component for conversational AI analysis
 */
export const ChatReviewBox: React.FC<ChatReviewBoxProps> = ({
  messages = [],
  isLoading = false,
  onSendMessage,
  onClearHistory,
  moveNumber = 0,
  totalMoves = 0,
}) => {
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;

    onSendMessage?.(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">💬 AI 教練對話</CardTitle>
          {moveNumber > 0 && (
            <span className="text-xs text-gray-500">
              第 {moveNumber} 手
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-8">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-sm">
                  提出你對棋局的問題
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  AI 教練會根據當前局面為你分析
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">
                      {msg.content}
                    </p>
                    {msg.timestamp && (
                      <p className="text-xs mt-1 opacity-70">
                        {msg.timestamp.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span className="text-sm">AI 正在思考...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="問 AI 教練任何問題..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="text-sm"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              size="sm"
              className="gap-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {onClearHistory && (
            <Button
              onClick={onClearHistory}
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
            >
              <Trash2 className="w-3 h-3" />
              清除對話
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
