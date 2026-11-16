import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Calendar,
  Check,
  Copy,
  Download,
  Layers,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  AISettings,
  ExplanationStyle,
  LanguagePreference,
  StudentLevel,
  StudyExplanation,
  StudySubTab,
  Subject,
  SyllabusPlan,
} from '../types/edugenius';
import { requestStudyExplanation } from '../utils/apiClient';
import {
  buildMarkdownNotes,
  buildPlainTextNotes,
  validateTopicInput,
} from '../utils/studyFormatter';
import { syllabusToPlannerPayload } from '../utils/workspaceLogic';
import { SmartFlashcardsPanel } from './study/SmartFlashcardsPanel';
import { StudyPlannerPanel } from './study/StudyPlannerPanel';
import { SyllabusGeneratorPanel } from './study/SyllabusGeneratorPanel';

interface StudyHubSectionProps {
  settings: AISettings;
  initialTopic?: string;
  onConsumeInitialTopic?: () => void;
}

const STUDY_TABS: { id: StudySubTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'explainer', label: 'Concept Explainer', icon: BookOpen },
  { id: 'flashcards', label: 'Smart Flashcards', icon: Layers },
  { id: 'planner', label: 'AI Study Planner', icon: Calendar },
  { id: 'syllabus', label: 'AI Syllabus Generator', icon: BookMarked },
];

const SUBJECTS: Subject[] = [
  'Science',
  'Mathematics',
  'English',
  'General Knowledge',
  'Programming',
  'Other',
];

const LEVELS: StudentLevel[] = [
  'Beginner',
  'Secondary (SSC)',
  'Higher Secondary (HSC)',
  'University / Job Preparation',
];

const STYLES: ExplanationStyle[] = [
  'Simple Summary',
  'Detailed Explanation with Examples',
  'Flashcard Points',
];

const SAMPLE_TOPICS: { label: string; subject: Subject; topic: string }[] = [
  { label: 'Photosynthesis', subject: 'Science', topic: 'Photosynthesis light and dark reactions' },
  { label: 'নিউটনের গতিসূত্র', subject: 'Science', topic: 'নিউটনের গতির তিনটি সূত্র ও উদাহরণ' },
  { label: 'Binary Search', subject: 'Programming', topic: 'Binary Search algorithm and time complexity' },
  { label: 'Calculus Limits', subject: 'Mathematics', topic: 'Limits and Continuity in Differential Calculus' },
];

export function StudyHubSection({
  settings,
  initialTopic,
  onConsumeInitialTopic,
}: StudyHubSectionProps) {
  const [activeTab, setActiveTab] = useState<StudySubTab>('explainer');
  const [flashcardSeedTopic, setFlashcardSeedTopic] = useState<string | undefined>(undefined);
  const [importedSyllabusPayload, setImportedSyllabusPayload] = useState<{
    subjects: string;
    goals: string;
    academicLevel: StudentLevel;
  } | null>(null);

  const [subject, setSubject] = useState<Subject>('Science');
  const [level, setLevel] = useState<StudentLevel>(settings.defaultLevel);
  const [style, setStyle] = useState<ExplanationStyle>('Detailed Explanation with Examples');
  const [language, setLanguage] = useState<LanguagePreference>(settings.defaultLanguage);
  const [topic, setTopic] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<StudyExplanation | null>(null);
  const [copied, setCopied] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLevel(settings.defaultLevel);
    setLanguage(settings.defaultLanguage);
  }, [settings.defaultLevel, settings.defaultLanguage]);

  const executeExplain = async (
    targetTopic: string,
    targetSubject = subject,
    targetLevel = level,
    targetStyle = style,
    targetLanguage = language
  ) => {
    const err = validateTopicInput(targetTopic);
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setApiError(null);
    setLoading(true);
    setFlippedCards({});

    try {
      const result = await requestStudyExplanation({
        topic: targetTopic.trim(),
        subject: targetSubject,
        level: targetLevel,
        style: targetStyle,
        language: targetLanguage,
        settings,
      });
      setExplanation(result);
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Unable to generate explanation right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTopic && initialTopic.trim()) {
      const incoming = initialTopic.trim();
      setActiveTab('explainer');
      setTopic(incoming);
      onConsumeInitialTopic?.();
      void executeExplain(incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTopic]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void executeExplain(topic);
  };

  const handleCopy = async () => {
    if (!explanation) return;
    const text = buildPlainTextNotes(explanation);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setApiError('Clipboard access was blocked by the browser.');
    }
  };

  const handleDownload = () => {
    if (!explanation) return;
    const md = buildMarkdownNotes(explanation, { subject, level, style });
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeSlug = explanation.title
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09FF]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    a.href = url;
    a.download = `${safeSlug || 'edugenius-study-notes'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendTopicToFlashcards = () => {
    const seed = topic.trim() || explanation?.title || '';
    if (!seed) return;
    setFlashcardSeedTopic(seed);
    setActiveTab('flashcards');
  };

  const handleSendSyllabusToPlanner = (syllabus: SyllabusPlan) => {
    setImportedSyllabusPayload(syllabusToPlannerPayload(syllabus));
    setActiveTab('planner');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <p className="text-xs font-semibold text-[#4338CA]">AI Study Hub</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E1B4B]">
            Complete AI Study Workspace
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Master tough chapters with structured explanations, practice Smart Flashcards, plan your
            weekly routine, and map out subject syllabi in English or বাংলা.
          </p>
        </div>
      </div>

      {/* Study Hub Workspace Sub-tabs */}
      <div
        role="tablist"
        aria-label="Study Hub tools"
        className="flex flex-wrap gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-full lg:w-fit"
      >
        {STUDY_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap ${
                active
                  ? 'bg-[#4338CA] text-white'
                  : 'text-[#1E1B4B]/75 hover:text-[#1E1B4B] hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'flashcards' && (
        <SmartFlashcardsPanel
          settings={settings}
          seedTopic={flashcardSeedTopic}
          onConsumeSeedTopic={() => setFlashcardSeedTopic(undefined)}
        />
      )}

      {activeTab === 'planner' && (
        <StudyPlannerPanel
          settings={settings}
          importedSyllabus={importedSyllabusPayload}
          onConsumeImportedSyllabus={() => setImportedSyllabusPayload(null)}
        />
      )}

      {activeTab === 'syllabus' && (
        <SyllabusGeneratorPanel
          settings={settings}
          onSendToPlanner={handleSendSyllabusToPlanner}
        />
      )}

      {activeTab === 'explainer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form Panel */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
          >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="study-subject" className="block text-xs font-semibold text-[#1E1B4B]">
                Subject
              </label>
              <select
                id="study-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="w-full min-h-[42px] px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="study-level" className="block text-xs font-semibold text-[#1E1B4B]">
                Student Level
              </label>
              <select
                id="study-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as StudentLevel)}
                className="w-full min-h-[42px] px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#1E1B4B]">Explanation Style</span>
            <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Explanation Style">
              {STYLES.map((option) => {
                const active = style === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setStyle(option)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#4338CA]/[0.08] border-[#4338CA] text-[#4338CA] font-semibold'
                        : 'bg-[#F8FAFC] border-slate-200 text-[#1E1B4B]/80 hover:border-slate-300'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[#1E1B4B]">Response Language</span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'auto' as const, label: 'Auto' },
                { id: 'en' as const, label: 'English' },
                { id: 'bn' as const, label: 'বাংলা' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
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

          <div className="space-y-1.5">
            <label htmlFor="study-topic-input" className="block text-xs font-semibold text-[#1E1B4B]">
              Topic or Question
            </label>
            <textarea
              id="study-topic-input"
              rows={4}
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Enter any topic or question (e.g. Osmosis, Quadratic Formula, বা গ্যালভানিক কোষ)..."
              className="w-full px-3.5 py-3 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:border-[#4338CA]"
            />
            {validationError && (
              <p
                role="alert"
                className="text-xs font-medium text-red-600 flex items-center gap-1.5 pt-1"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500">Quick fill examples:</p>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TOPICS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    setSubject(item.subject);
                    setTopic(item.topic);
                    setValidationError(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium bg-[#F8FAFC] hover:bg-[#4338CA]/10 text-[#1E1B4B] hover:text-[#4338CA] border border-slate-200 rounded-lg transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] px-5 py-3 bg-[#4338CA] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Generating Explanation...</span>
              </>
            ) : (
              <span>Generate Explanation</span>
            )}
          </button>
        </form>

        {/* Right Output Panel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 min-h-[480px]">
          {loading ? (
            <div className="space-y-6 animate-pulse" aria-live="polite" aria-busy="true">
              <div className="space-y-2">
                <div className="h-4 w-36 bg-slate-200 rounded" />
                <div className="h-8 w-3/4 bg-slate-200 rounded" />
              </div>
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
          ) : apiError ? (
            <div
              role="alert"
              className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <h2 className="text-sm font-bold text-red-900">Could not generate explanation</h2>
                  <p className="text-sm text-red-700">{apiError}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void executeExplain(topic)}
                className="px-4 py-2 text-xs font-semibold bg-white border border-red-300 text-red-700 hover:bg-red-100 rounded-lg inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry Generation</span>
              </button>
            </div>
          ) : explanation ? (
            <article className="space-y-7">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{level}</span>
                    <span aria-hidden="true">·</span>
                    <span>{style}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#1E1B4B]">{explanation.title}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleSendTopicToFlashcards}
                    className="px-3.5 py-2 text-xs font-semibold text-[#4338CA] bg-[#4338CA]/10 hover:bg-[#4338CA]/15 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Practice as Flashcards</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3.5 py-2 text-xs font-semibold text-[#1E1B4B] bg-[#F8FAFC] hover:bg-slate-200/70 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#10B981]" aria-hidden="true" />
                        <span className="text-[#10B981]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy to Clipboard</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1E1B4B] hover:bg-[#4338CA] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download Notes</span>
                  </button>
                </div>
              </div>

              {/* 1. Concept Definition */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[#4338CA]">01. Concept Definition</h3>
                <p className="text-sm sm:text-base text-[#1E1B4B] leading-relaxed">
                  {explanation.conceptDefinition}
                </p>
              </div>

              {/* 2. Real-world Analogy */}
              <div className="pt-5 border-t border-slate-200 space-y-2">
                <h3 className="text-sm font-bold text-[#7C3AED]">02. Real-World Analogy</h3>
                <p className="text-sm sm:text-base text-[#1E1B4B]/90 leading-relaxed">
                  {explanation.realWorldAnalogy}
                </p>
              </div>

              {/* 3. Practical Examples */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#1E1B4B]">03. Practical Examples</h3>
                <ol className="space-y-2.5 list-decimal list-inside text-sm sm:text-base text-slate-700 leading-relaxed">
                  {explanation.practicalExamples.map((example, idx) => (
                    <li key={idx} className="pl-1">
                      {example}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Important Key Points */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-[#10B981]">Important Key Points</h3>
                <ul className="space-y-2 text-sm sm:text-base text-slate-700">
                  {explanation.keyPoints.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-2 w-1.5 h-1.5 rounded-full bg-[#10B981] shrink-0"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Interactive Flashcards if included */}
              {explanation.flashcards && explanation.flashcards.length > 0 && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#4338CA]">
                      Active Recall Flashcards
                    </h3>
                    <span className="text-xs text-slate-500">Click card to reveal answer</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {explanation.flashcards.map((card, idx) => {
                      const revealed = Boolean(flippedCards[idx]);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setFlippedCards((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className={`text-left p-4 rounded-xl border transition-colors ${
                            revealed
                              ? 'bg-[#10B981]/[0.06] border-[#10B981]/50'
                              : 'bg-[#F8FAFC] border-slate-200 hover:border-[#4338CA]'
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-500 mb-1">
                            {revealed ? `Answer · Card ${idx + 1}` : `Prompt · Card ${idx + 1}`}
                          </p>
                          <p className="text-sm font-medium text-[#1E1B4B]">
                            {revealed ? card.back : card.front}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="p-4 sm:p-5 bg-[#1E1B4B] text-white rounded-xl space-y-1.5">
                <h3 className="text-xs font-semibold text-white/75">Summary</h3>
                <p className="text-sm sm:text-base leading-relaxed">{explanation.summary}</p>
              </div>
            </article>
          ) : (
            <div className="h-full min-h-[380px] flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
                <BookOpen className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#1E1B4B]">Ready when you are</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Choose your subject and academic level on the left, enter any topic in English or
                  বাংলা, and generate structured study notes in seconds.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
