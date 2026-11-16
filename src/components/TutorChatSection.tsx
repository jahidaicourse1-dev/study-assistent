import { AlertCircle, Bot, Loader2, Send, Trash2, User } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { AISettings, ChatMessage, LanguagePreference } from '../types/edugenius';
import { requestTutorReply } from '../utils/apiClient';
import { parseInlineSegments, parseTutorBlocks } from '../utils/chatFormatter';

interface TutorChatSectionProps {
  settings: AISettings;
}

const QUICK_PROMPTS = [
  'Explain a difficult paragraph.',
  'Give me a memory trick for a formula.',
  'Help me prepare for IELTS.',
  'Explain this topic in simple Bangla.',
];

function FormattedTutorMessage({ text }: { text: string }) {
  const blocks = parseTutorBlocks(text);

  const renderInline = (content: string) =>
    parseInlineSegments(content).map((seg, i) =>
      seg.bold ? (
        <strong key={i} className="font-semibold text-[#1E1B4B]">
          {seg.text}
        </strong>
      ) : (
        <span key={i}>{seg.text}</span>
      )
    );

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-[#1E1B4B]">
      {blocks.map((block, idx) => {
        if (block.type === 'divider') {
          return <hr key={idx} className="border-slate-200 my-2" />;
        }
        if (block.type === 'heading') {
          return (
            <h3 key={idx} className="text-sm font-bold text-[#4338CA] pt-1">
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-1.5 pl-4 list-disc">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return <p key={idx}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}

export function TutorChatSection({ settings }: TutorChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<LanguagePreference>(settings.defaultLanguage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLanguage(settings.defaultLanguage);
  }, [settings.defaultLanguage]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setError('Please enter a question or pick a quick prompt below.');
      return;
    }

    setError(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const replyText = await requestTutorReply({
        messages: updatedMessages.map((m) => ({ role: m.role, text: m.text })),
        language,
        settings,
      });

      const aiMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach your AI tutor right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        void sendMessage(input);
      }
    }
  };

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[#10B981]">24/7 AI Tutor Chat</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E1B4B]">
            Personal Bilingual Learning Mentor
          </h1>
          <p className="text-sm text-slate-600">
            Ask follow-up questions in English or বাংলা. Conversation context is preserved
            throughout your session.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
            {[
              { id: 'auto' as const, label: 'Auto' },
              { id: 'en' as const, label: 'EN' },
              { id: 'bn' as const, label: 'বাংলা' },
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  language === lang.id
                    ? 'bg-[#4338CA] text-white'
                    : 'text-slate-600 hover:text-[#1E1B4B]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleClear}
            disabled={messages.length === 0 && !error}
            className="px-3.5 py-2 text-xs font-semibold text-[#1E1B4B] bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear Conversation</span>
          </button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-[560px]">
        {/* Scrollable Message Thread */}
        <div
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#F8FAFC]/60"
          data-testid="tutor-message-list"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
                <Bot className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#1E1B4B]">
                  Start a conversation with EduGenius AI
                </h2>
                <p className="text-sm text-slate-600">
                  Pick a quick suggestion below or ask any question about SSC, HSC, University, or
                  IELTS topics.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    className="text-left p-3.5 bg-white hover:border-[#4338CA] hover:text-[#4338CA] border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-[#1E1B4B] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl bg-[#4338CA] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" aria-hidden="true" />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-3 space-y-1 ${
                        isUser
                          ? 'bg-[#1E1B4B] text-white'
                          : 'bg-white border border-slate-200 text-[#1E1B4B]'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <FormattedTutorMessage text={msg.text} />
                      )}
                      <p
                        className={`text-[11px] tabular-nums ${
                          isUser ? 'text-white/60 text-right' : 'text-slate-400'
                        }`}
                      >
                        {isUser ? 'You' : 'EduGenius AI'} · {msg.timestamp}
                      </p>
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-slate-200 text-[#1E1B4B] flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-3" aria-live="polite">
                  <div className="w-8 h-8 rounded-xl bg-[#4338CA] text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 inline-flex items-center gap-2 text-sm text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-[#4338CA]" aria-hidden="true" />
                    <span>EduGenius AI is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </>
          )}
        </div>

        {/* Quick Prompts Strip when conversation active */}
        {messages.length > 0 && (
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-slate-400 shrink-0">Suggestions:</span>
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => void sendMessage(prompt)}
                className="px-2.5 py-1 text-xs font-medium bg-[#F8FAFC] hover:bg-[#4338CA]/10 text-[#1E1B4B] hover:text-[#4338CA] border border-slate-200 rounded-lg whitespace-nowrap shrink-0 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200 space-y-2">
          {error && (
            <p role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex items-end gap-3">
            <label htmlFor="tutor-chat-input" className="sr-only">
              Message EduGenius AI Tutor
            </label>
            <textarea
              id="tutor-chat-input"
              rows={2}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question in English or বাংলা..."
              className="flex-1 px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] resize-none"
            />
            <button
              type="submit"
              disabled={loading}
              aria-label="Send message"
              className="min-h-[44px] px-5 py-2.5 bg-[#4338CA] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2 shrink-0"
            >
              <span>Send</span>
              <Send className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
