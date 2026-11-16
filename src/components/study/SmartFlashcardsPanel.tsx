import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Layers,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { AISettings, LanguagePreference, SmartFlashcard, StudentLevel } from '../../types/edugenius';
import { requestSmartFlashcards } from '../../utils/apiClient';
import { validateTopicInput } from '../../utils/studyFormatter';
import {
  calculateFlashcardStats,
  filterFlashcardsForMode,
  updateFlashcardStatus,
} from '../../utils/workspaceLogic';

interface SmartFlashcardsPanelProps {
  settings: AISettings;
  seedTopic?: string;
  onConsumeSeedTopic?: () => void;
}

const STORAGE_KEY = 'edugenius_flashcards_v1';

function loadSavedCards(): SmartFlashcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SmartFlashcardsPanel({
  settings,
  seedTopic,
  onConsumeSeedTopic,
}: SmartFlashcardsPanelProps) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<StudentLevel>(settings.defaultLevel);
  const [language, setLanguage] = useState<LanguagePreference>(settings.defaultLanguage);
  const [cardCount, setCardCount] = useState<number>(6);

  const [cards, setCards] = useState<SmartFlashcard[]>(() => loadSavedCards());
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [revisionMode, setRevisionMode] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch {
      // ignore storage errors
    }
  }, [cards]);

  const generateDeck = async (targetTopic: string) => {
    const err = validateTopicInput(targetTopic);
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setApiError(null);
    setLoading(true);
    setRevisionMode(false);
    setFlipped({});

    try {
      const generated = await requestSmartFlashcards({
        topic: targetTopic.trim(),
        count: cardCount,
        level,
        language,
        settings,
      });
      setCards(generated);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Could not generate flashcards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seedTopic && seedTopic.trim()) {
      const incoming = seedTopic.trim();
      setTopic(incoming);
      onConsumeSeedTopic?.();
      void generateDeck(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedTopic]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void generateDeck(topic);
  };

  const stats = calculateFlashcardStats(cards);
  const visibleCards = filterFlashcardsForMode(cards, revisionMode);

  const handleStatusChange = (cardId: string, status: 'known' | 'revision') => {
    setCards((prev) => updateFlashcardStatus(prev, cardId, status));
  };

  const handleResetDeckProgress = () => {
    setCards((prev) => prev.map((c) => ({ ...c, status: 'unreviewed' })));
    setRevisionMode(false);
    setFlipped({});
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Controls */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#1E1B4B]">Smart Flashcard Deck</h2>
          <p className="text-xs text-slate-600">
            Generate active-recall flashcards from any topic and track mastery with Revision Mode.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="fc-topic" className="block text-xs font-semibold text-[#1E1B4B]">
            Study Hub Topic
          </label>
          <input
            id="fc-topic"
            type="text"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. Organic Functional Groups or সমাস"
            className="w-full min-h-[42px] px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
          />
          {validationError && (
            <p role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{validationError}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="fc-level" className="block text-xs font-semibold text-[#1E1B4B]">
              Level
            </label>
            <select
              id="fc-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as StudentLevel)}
              className="w-full min-h-[40px] px-2.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Secondary (SSC)">Secondary (SSC)</option>
              <option value="Higher Secondary (HSC)">Higher Secondary (HSC)</option>
              <option value="University / Job Preparation">University / Job</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fc-count" className="block text-xs font-semibold text-[#1E1B4B]">
              Cards
            </label>
            <select
              id="fc-count"
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full min-h-[40px] px-2.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            >
              <option value={4}>4 Cards</option>
              <option value={6}>6 Cards</option>
              <option value={8}>8 Cards</option>
              <option value={12}>12 Cards</option>
              <option value={16}>16 Cards</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-semibold text-[#1E1B4B]">Language</span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'auto' as const, label: 'Auto' },
              { id: 'en' as const, label: 'English' },
              { id: 'bn' as const, label: 'বাংলা' },
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  language === lang.id
                    ? 'bg-white text-[#4338CA] shadow-xs'
                    : 'text-slate-600 hover:text-[#1E1B4B]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 bg-[#4338CA] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Building Flashcards...</span>
            </>
          ) : (
            <span>Generate Flashcards</span>
          )}
        </button>

        {cards.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1E1B4B]">Mastery Progress</span>
              <span className="font-bold text-[#10B981] tabular-nums">{stats.masteryPercent}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-[#F8FAFC] rounded-lg">
                <p className="text-base font-bold text-[#10B981] tabular-nums">{stats.known}</p>
                <p className="text-[11px] text-slate-500">Known</p>
              </div>
              <div className="p-2 bg-[#F8FAFC] rounded-lg">
                <p className="text-base font-bold text-[#7C3AED] tabular-nums">
                  {stats.needRevision}
                </p>
                <p className="text-[11px] text-slate-500">Revision</p>
              </div>
              <div className="p-2 bg-[#F8FAFC] rounded-lg">
                <p className="text-base font-bold text-[#1E1B4B] tabular-nums">
                  {stats.unreviewed}
                </p>
                <p className="text-[11px] text-slate-500">Unseen</p>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Deck Stage */}
      <div className="lg:col-span-8 space-y-5">
        {apiError && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-52 bg-white border border-slate-200 rounded-2xl p-6" />
            ))}
          </div>
        ) : cards.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-[#1E1B4B]">{cards[0]?.topic}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-xs text-slate-500 tabular-nums">
                  Showing {visibleCards.length} of {cards.length} cards
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRevisionMode((prev) => !prev)}
                  aria-pressed={revisionMode}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                    revisionMode
                      ? 'bg-[#7C3AED] border-[#7C3AED] text-white'
                      : 'bg-[#F8FAFC] border-slate-200 text-[#1E1B4B] hover:border-[#7C3AED]'
                  }`}
                >
                  {revisionMode
                    ? `Revision Mode (${stats.needRevision})`
                    : `Revision Mode (${stats.needRevision})`}
                </button>
                <button
                  type="button"
                  onClick={handleResetDeckProgress}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-[#1E1B4B] bg-[#F8FAFC] border border-slate-200 rounded-lg inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {visibleCards.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-[#10B981] mx-auto" aria-hidden="true" />
                <h3 className="text-base font-bold text-[#1E1B4B]">No cards marked for revision</h3>
                <p className="text-sm text-slate-600">
                  All cards needing revision have been mastered, or switch back to see the full deck.
                </p>
                <button
                  type="button"
                  onClick={() => setRevisionMode(false)}
                  className="px-4 py-2 text-xs font-semibold bg-[#4338CA] text-white rounded-xl"
                >
                  Show All Cards
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleCards.map((card, idx) => {
                  const isFlipped = Boolean(flipped[card.id]);
                  return (
                    <article
                      key={card.id}
                      data-testid="smart-flashcard"
                      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-500 tabular-nums">
                            Card {idx + 1} · {isFlipped ? 'Answer' : 'Question'}
                          </span>
                          <span
                            className={`font-semibold ${
                              card.status === 'known'
                                ? 'text-[#10B981]'
                                : card.status === 'revision'
                                  ? 'text-[#7C3AED]'
                                  : 'text-slate-400'
                            }`}
                          >
                            {card.status === 'known'
                              ? 'Known'
                              : card.status === 'revision'
                                ? 'Needs Revision'
                                : 'Unreviewed'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setFlipped((prev) => ({ ...prev, [card.id]: !prev[card.id] }))
                          }
                          className={`w-full text-left p-4 rounded-xl min-h-[112px] flex flex-col justify-between transition-colors ${
                            isFlipped
                              ? 'bg-[#4338CA]/[0.05] text-[#1E1B4B]'
                              : 'bg-[#F8FAFC] text-[#1E1B4B] hover:bg-slate-100'
                          }`}
                        >
                          <p className="text-sm font-medium leading-relaxed">
                            {isFlipped ? card.back : card.front}
                          </p>
                          <span className="mt-3 text-[11px] font-semibold text-[#4338CA] inline-flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{isFlipped ? 'Show Question' : 'Reveal Answer'}</span>
                          </span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(card.id, 'known')}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                            card.status === 'known'
                              ? 'bg-[#10B981] text-white'
                              : 'bg-[#10B981]/10 text-[#065F46] hover:bg-[#10B981]/20'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Know This</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(card.id, 'revision')}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                            card.status === 'revision'
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#7C3AED]/10 text-[#5B21B6] hover:bg-[#7C3AED]/20'
                          }`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Need Revision</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 min-h-[340px] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
              <Layers className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-[#1E1B4B]">Interactive Flashcard Studio</h3>
            <p className="text-sm text-slate-600 max-w-md">
              Enter any topic on the left or send a topic straight from the Concept Explainer to
              practice active recall and filter cards in Revision Mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
