import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  AISettings,
  LanguagePreference,
  QuizQuestion,
  QuizSubTab,
  SavedQuizAttempt,
  StudentLevel,
} from '../types/edugenius';
import { requestQuizGeneration } from '../utils/apiClient';
import { calculateQuizScore } from '../utils/quizLogic';
import { validateTopicInput } from '../utils/studyFormatter';
import { buildQuizAttemptRecord } from '../utils/workspaceLogic';
import { PerformanceAnalyticsPanel } from './quiz/PerformanceAnalyticsPanel';
import { QuestionPaperPanel } from './quiz/QuestionPaperPanel';

interface QuizEngineSectionProps {
  settings: AISettings;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const ATTEMPTS_STORAGE_KEY = 'edugenius_quiz_attempts_v1';

const SAMPLE_QUIZ_TOPICS = [
  "Newton's Laws of Motion",
  'বাংলা ব্যাকরণ: সমাস ও কারক',
  'Organic Chemistry Hydrocarbons',
  'IELTS Reading & Academic Vocabulary',
];

function loadSavedAttempts(): SavedQuizAttempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedQuizAttempt[]) : [];
  } catch {
    return [];
  }
}

export function QuizEngineSection({ settings }: QuizEngineSectionProps) {
  const [activeTab, setActiveTab] = useState<QuizSubTab>('quiz');
  const [attempts, setAttempts] = useState<SavedQuizAttempt[]>(() => loadSavedAttempts());

  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<5 | 10>(5);
  const [level, setLevel] = useState<StudentLevel>(settings.defaultLevel);
  const [language, setLanguage] = useState<LanguagePreference>(settings.defaultLanguage);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect'>('all');
  const [activeQuizTopic, setActiveQuizTopic] = useState('');
  const [activeQuizLevel, setActiveQuizLevel] = useState<StudentLevel>(settings.defaultLevel);
  const [attemptRunId, setAttemptRunId] = useState(0);
  const lastRecordedRunIdRef = useRef<number>(-1);

  const summary = calculateQuizScore(questions, selectedAnswers);

  useEffect(() => {
    setLevel(settings.defaultLevel);
    setLanguage(settings.defaultLanguage);
  }, [settings.defaultLevel, settings.defaultLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts));
    } catch {
      // Ignore storage quota issues
    }
  }, [attempts]);

  useEffect(() => {
    if (
      questions.length > 0 &&
      summary.isComplete &&
      attemptRunId > 0 &&
      lastRecordedRunIdRef.current !== attemptRunId
    ) {
      lastRecordedRunIdRef.current = attemptRunId;
      const record = buildQuizAttemptRecord({
        id: `attempt_${Date.now()}_${attemptRunId}`,
        topic: activeQuizTopic || topic || 'Practice Quiz',
        level: activeQuizLevel,
        questions,
        selectedAnswers,
      });
      setAttempts((prev) => [record, ...prev].slice(0, 50));
    }
  }, [
    questions,
    summary.isComplete,
    attemptRunId,
    activeQuizTopic,
    activeQuizLevel,
    topic,
    selectedAnswers,
  ]);

  const handleGenerate = async (targetTopic = topic) => {
    const err = validateTopicInput(targetTopic);
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setApiError(null);
    setLoading(true);
    setSelectedAnswers({});
    setReviewFilter('all');

    try {
      const cleanTopic = targetTopic.trim();
      const generated = await requestQuizGeneration({
        topic: cleanTopic,
        questionCount,
        level,
        language,
        settings,
      });
      setQuestions(generated);
      setActiveQuizTopic(cleanTopic);
      setActiveQuizLevel(level);
      setAttemptRunId((prev) => prev + 1);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Unable to generate quiz questions right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleGenerate();
  };

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (selectedAnswers[questionId] !== undefined) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleReattempt = () => {
    setSelectedAnswers({});
    setReviewFilter('all');
    setAttemptRunId((prev) => prev + 1);
  };

  const handleClearHistory = () => {
    setAttempts([]);
    try {
      localStorage.removeItem(ATTEMPTS_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const visibleQuestions =
    reviewFilter === 'incorrect'
      ? questions.filter(
          (q) => selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== q.correctIndex
        )
      : questions;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2 max-w-3xl print:hidden">
        <p className="text-xs font-semibold text-[#7C3AED]">Smart AI Quiz & Assessment Suite</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E1B4B]">
          Practice Quizzes, Performance Analytics & Exam Papers
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Take instant-graded MCQ quizzes, review weak topics from your real saved attempts, or
          compose printable teacher question papers with separate answer keys.
        </p>
      </div>

      {/* Smart Quiz Workspace Sub-tabs */}
      <div
        role="tablist"
        aria-label="Smart Quiz tools"
        className="flex flex-wrap gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-full lg:w-fit print:hidden"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'quiz'}
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'quiz'
              ? 'bg-[#4338CA] text-white'
              : 'text-[#1E1B4B]/75 hover:text-[#1E1B4B] hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Practice Quiz</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'analytics'}
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-[#4338CA] text-white'
              : 'text-[#1E1B4B]/75 hover:text-[#1E1B4B] hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Performance Analytics{attempts.length > 0 ? ` (${attempts.length})` : ''}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'paper'}
          onClick={() => setActiveTab('paper')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'paper'
              ? 'bg-[#4338CA] text-white'
              : 'text-[#1E1B4B]/75 hover:text-[#1E1B4B] hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Question Paper Generator</span>
        </button>
      </div>

      {activeTab === 'analytics' && (
        <PerformanceAnalyticsPanel
          attempts={attempts}
          onClearHistory={handleClearHistory}
          onStartQuiz={() => setActiveTab('quiz')}
        />
      )}

      {activeTab === 'paper' && <QuestionPaperPanel settings={settings} />}

      {activeTab === 'quiz' && (
        <>
          {/* Quiz Generator Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
          >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5 space-y-1.5">
            <label htmlFor="quiz-topic-input" className="block text-xs font-semibold text-[#1E1B4B]">
              Topic or Chapter
            </label>
            <input
              id="quiz-topic-input"
              type="text"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. Cellular Respiration, Trigonometry, বা বাংলা সাহিত্য..."
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            />
          </div>

          <div className="lg:col-span-2 space-y-1.5">
            <span className="block text-xs font-semibold text-[#1E1B4B]">Questions</span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl min-h-[44px]">
              {([5, 10] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    questionCount === cnt
                      ? 'bg-white text-[#4338CA] shadow-xs'
                      : 'text-slate-600 hover:text-[#1E1B4B]'
                  }`}
                >
                  {cnt} MCQs
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-1.5">
            <label htmlFor="quiz-level" className="block text-xs font-semibold text-[#1E1B4B]">
              Academic Level
            </label>
            <select
              id="quiz-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as StudentLevel)}
              className="w-full min-h-[44px] px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Secondary (SSC)">Secondary (SSC)</option>
              <option value="Higher Secondary (HSC)">Higher Secondary (HSC)</option>
              <option value="University / Job Preparation">University / Job Preparation</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] px-4 py-2.5 bg-[#4338CA] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Building...</span>
                </>
              ) : (
                <span>Generate Quiz</span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Quick topics:</span>
            {SAMPLE_QUIZ_TOPICS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setTopic(sample);
                  setValidationError(null);
                }}
                className="px-2.5 py-1 text-xs font-medium bg-[#F8FAFC] hover:bg-[#4338CA]/10 text-[#1E1B4B] hover:text-[#4338CA] border border-slate-200 rounded-lg transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Language:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              {[
                { id: 'auto' as const, label: 'Auto' },
                { id: 'en' as const, label: 'EN' },
                { id: 'bn' as const, label: 'বাংলা' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
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
        </div>

        {validationError && (
          <p
            role="alert"
            className="text-xs font-medium text-red-600 flex items-center gap-1.5"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{validationError}</span>
          </p>
        )}
      </form>

      {apiError && (
        <div role="alert" className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-red-900">Quiz generation failed</h2>
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            className="px-4 py-2 text-xs font-semibold bg-white border border-red-300 text-red-700 hover:bg-red-100 rounded-lg inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 animate-pulse" aria-live="polite" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="h-5 w-2/3 bg-slate-200 rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Content & Scoreboard */}
      {!loading && questions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Questions List */}
          <div className="lg:col-span-8 space-y-5">
            {summary.incorrect > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3">
                <span className="text-xs font-semibold text-slate-600 tabular-nums">
                  {summary.incorrect} incorrect answer{summary.incorrect === 1 ? '' : 's'} available
                  for review
                </span>
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setReviewFilter('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      reviewFilter === 'all'
                        ? 'bg-white text-[#4338CA] shadow-xs'
                        : 'text-slate-600 hover:text-[#1E1B4B]'
                    }`}
                  >
                    All Questions ({questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewFilter('incorrect')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      reviewFilter === 'incorrect'
                        ? 'bg-white text-red-600 shadow-xs'
                        : 'text-slate-600 hover:text-[#1E1B4B]'
                    }`}
                  >
                    Review Incorrect ({summary.incorrect})
                  </button>
                </div>
              </div>
            )}

            {visibleQuestions.map((q) => {
              const userChoice = selectedAnswers[q.id];
              const isAnswered = userChoice !== undefined;
              const isUserCorrect = isAnswered && userChoice === q.correctIndex;

              return (
                <article
                  key={q.id}
                  data-testid="quiz-question-card"
                  className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 tabular-nums">
                        Question {q.id} of {questions.length}
                      </p>
                      <h2 className="text-base sm:text-lg font-bold text-[#1E1B4B] leading-snug">
                        {q.question}
                      </h2>
                    </div>

                    {isAnswered && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                          isUserCorrect ? 'text-[#10B981]' : 'text-red-600'
                        }`}
                      >
                        {isUserCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            <span>Correct</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" aria-hidden="true" />
                            <span>Incorrect</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt, idx) => {
                      const letter = OPTION_LETTERS[idx];
                      const isThisCorrect = idx === q.correctIndex;
                      const isThisSelected = userChoice === idx;

                      let stateClasses =
                        'bg-[#F8FAFC] border-slate-200 text-[#1E1B4B] hover:border-[#4338CA] hover:bg-[#4338CA]/[0.04]';

                      if (isAnswered) {
                        if (isThisCorrect) {
                          stateClasses =
                            'bg-[#10B981]/12 border-[#10B981] text-[#065F46] font-semibold';
                        } else if (isThisSelected && !isThisCorrect) {
                          stateClasses =
                            'bg-red-50 border-red-500 text-red-800 font-semibold';
                        } else {
                          stateClasses =
                            'bg-slate-50 border-slate-200 text-slate-400 opacity-80';
                        }
                      }

                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={isAnswered}
                          onClick={() => handleSelectOption(q.id, idx)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${stateClasses}`}
                        >
                          <div className="flex items-start gap-2.5 text-sm">
                            <span className="font-mono-tabular font-bold shrink-0">{letter}.</span>
                            <span>{opt}</span>
                          </div>
                          {isAnswered && isThisCorrect && (
                            <CheckCircle2
                              className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5"
                              aria-label="Correct option"
                            />
                          )}
                          {isAnswered && isThisSelected && !isThisCorrect && (
                            <XCircle
                              className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
                              aria-label="Incorrect selection"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div className="pt-4 border-t border-slate-200 space-y-1.5">
                      <p className="text-xs font-bold text-[#1E1B4B]">
                        Correct Answer: {OPTION_LETTERS[q.correctIndex]}. {q.options[q.correctIndex]}
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Scoreboard Sidebar */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#4338CA]">Live Scoreboard</p>
              <h2 className="text-xl font-bold text-[#1E1B4B]">
                {summary.isComplete ? 'Quiz Complete' : 'Progress Summary'}
              </h2>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600 tabular-nums">
                <span>
                  Answered {summary.answered} of {summary.total}
                </span>
                <span>{Math.round((summary.answered / summary.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4338CA] transition-all duration-300"
                  style={{ width: `${(summary.answered / summary.total) * 100}%` }}
                />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
              <div>
                <dt className="text-xs text-slate-500">Total Questions</dt>
                <dd className="text-xl font-bold text-[#1E1B4B] tabular-nums">{summary.total}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Final Score</dt>
                <dd className="text-xl font-bold text-[#4338CA] tabular-nums">
                  {summary.scoreLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Correct Answers</dt>
                <dd className="text-xl font-bold text-[#10B981] tabular-nums">
                  {summary.correct}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Incorrect Answers</dt>
                <dd className="text-xl font-bold text-red-600 tabular-nums">{summary.incorrect}</dd>
              </div>
            </dl>

            <div className="p-4 bg-[#1E1B4B] text-white rounded-xl flex items-center justify-between">
              <span className="text-xs font-medium text-white/80">Accuracy Percentage</span>
              <span className="text-2xl font-bold tabular-nums">{summary.accuracyPercent}%</span>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleReattempt}
                className="w-full py-2.5 px-4 text-sm font-semibold text-[#1E1B4B] bg-[#F8FAFC] hover:bg-slate-200/70 border border-slate-300 rounded-xl transition-colors inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Re-attempt Quiz</span>
              </button>

              {summary.isComplete && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('analytics');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#4338CA] hover:bg-[#7C3AED] rounded-xl transition-colors inline-flex items-center justify-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" aria-hidden="true" />
                  <span>View Saved Performance Analytics</span>
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Empty State */}
      {!loading && questions.length === 0 && !apiError && (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-2xl mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-[#1E1B4B]">Generate your first practice quiz</h2>
          <p className="text-sm text-slate-600">
            Enter a chapter or select one of the quick topics above, pick 5 or 10 questions, and
            click Generate Quiz to test your mastery.
          </p>
        </div>
      )}
        </>
      )}
    </section>
  );
}
