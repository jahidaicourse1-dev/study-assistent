import { ArrowRight, BookOpenCheck, CheckCircle2, MessageSquareText, Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { SectionId } from '../types/edugenius';

interface LandingSectionProps {
  onQuickAsk: (topic: string) => void;
  onNavigate: (section: SectionId) => void;
}

function useAnimatedCounter(target: number, durationMs = 1100, decimals = 0) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      setValue(Number(current.toFixed(decimals)));
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, decimals]);

  return value;
}

const QUICK_SAMPLES = [
  'Photosynthesis & Light Reaction',
  'সালোকসংশ্লেষণ প্রক্রিয়া (HSC Biology)',
  'Quadratic Equations & Discriminant',
  'IELTS Task 2 Essay Structure',
];

export function LandingSection({ onQuickAsk, onNavigate }: LandingSectionProps) {
  const [heroQuestion, setHeroQuestion] = useState('');
  const [heroError, setHeroError] = useState<string | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);
  const [diagramImgError, setDiagramImgError] = useState(false);

  const questionsSolved = useAnimatedCounter(50000, 1100, 0);
  const quizzesGenerated = useAnimatedCounter(10000, 1100, 0);
  const satisfactionRate = useAnimatedCounter(99.4, 1100, 1);

  const handleHeroSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = heroQuestion.trim();
    if (!trimmed) {
      setHeroError('Enter any topic or question in English or বাংলা to begin.');
      return;
    }
    setHeroError(null);
    onQuickAsk(trimmed);
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="pt-10 sm:pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Copy & Interactive Input */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#4338CA]">
                <span>Apex Edutech Labs</span>
                <span aria-hidden="true">·</span>
                <span>Learn Smarter, Faster, Better</span>
                <span aria-hidden="true">·</span>
                <span>English & বাংলা</span>
              </div>

              <h1 className="text-[clamp(2.25rem,4vw,3.5rem)] font-bold tracking-tight leading-[1.1] text-[#1E1B4B] max-w-2xl">
                Learn Any Subject 3x Faster with AI Assistance.
              </h1>

              <p className="text-base sm:text-lg text-[#1E1B4B]/75 leading-relaxed max-w-xl">
                Understand complex subjects, practice smarter, and achieve your learning goals with
                your personal AI tutor.
              </p>

              <form onSubmit={handleHeroSubmit} className="space-y-3 max-w-xl">
                <label htmlFor="hero-topic-input" className="sr-only">
                  Ask any topic or study question
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    id="hero-topic-input"
                    type="text"
                    value={heroQuestion}
                    onChange={(e) => {
                      setHeroQuestion(e.target.value);
                      if (heroError) setHeroError(null);
                    }}
                    placeholder="Ask any topic in English or বাংলা..."
                    className="flex-1 min-h-[48px] px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm sm:text-base text-[#1E1B4B] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] focus:border-[#4338CA]"
                  />
                  <button
                    type="submit"
                    className="min-h-[48px] px-6 py-3 bg-[#4338CA] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-colors duration-150 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4338CA]"
                  >
                    <span>Try AI Free</span>
                    <Send className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>

                {heroError && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    {heroError}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-slate-500">Try sample:</span>
                  {QUICK_SAMPLES.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => onQuickAsk(sample)}
                      className="text-xs font-medium text-[#4338CA] hover:text-[#7C3AED] hover:underline underline-offset-4 px-2 py-1 rounded-md bg-white border border-slate-200 transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={scrollToFeatures}
                  className="px-5 py-2.5 text-sm font-semibold text-[#1E1B4B] bg-white border border-slate-300 hover:border-[#4338CA] hover:text-[#4338CA] rounded-xl transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>Explore Features</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('quiz')}
                  className="px-4 py-2.5 text-sm font-medium text-[#4338CA] hover:text-[#7C3AED] underline underline-offset-4 whitespace-nowrap shrink-0"
                >
                  Launch Smart Quiz
                </button>
              </div>
            </div>

            {/* Right Editorial Illustration */}
            <div className="lg:col-span-5 flex">
              <div className="w-full rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_edugenius_workspace_1794629038940.jpg"
                    alt="EduGenius AI structured bilingual study workspace with geometry notebooks and precision study tools"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-64 sm:h-80 lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-64 sm:h-80 lg:h-full bg-[#1E1B4B]/[0.04] flex flex-col items-center justify-center p-8 text-center">
                    <BookOpenCheck className="w-12 h-12 text-[#4338CA] mb-3" />
                    <p className="text-sm font-semibold text-[#1E1B4B]">
                      Structured Bilingual Concept Workspace
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Animated Statistics Strip */}
      <section aria-label="Platform Highlights" className="border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="pt-2 sm:pt-0 sm:pr-6">
              <p className="text-3xl sm:text-4xl font-bold text-[#1E1B4B] tabular-nums">
                {questionsSolved.toLocaleString()}+
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">Questions Solved</p>
            </div>
            <div className="pt-6 sm:pt-0 sm:px-6">
              <p className="text-3xl sm:text-4xl font-bold text-[#4338CA] tabular-nums">
                {quizzesGenerated.toLocaleString()}+
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">Quizzes Generated</p>
            </div>
            <div className="pt-6 sm:pt-0 sm:pl-6">
              <p className="text-3xl sm:text-4xl font-bold text-[#10B981] tabular-nums">
                {satisfactionRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-sm font-medium text-slate-600">Satisfaction Rating</p>
            </div>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            Illustrative platform benchmarks for Apex Edutech Labs — not verified live usage data.
          </p>
        </div>
      </section>

      {/* Three Core Feature Cards */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold text-[#4338CA]">Core Learning Engines</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E1B4B]">
            Three focused tools built for SSC, HSC, University & IELTS mastery
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-[#4338CA]/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
                <BookOpenCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-medium text-slate-500">01 · Concept Clarity</p>
              <h3 className="text-lg font-bold text-[#1E1B4B]">Instant Concept Explainer</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Breaks any difficult Science, Math, Programming, or Humanities topic into Concept
                Definition, Real-world Analogy, and Practical Examples in English or বাংলা.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('study')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-[#4338CA] bg-[#4338CA]/[0.06] hover:bg-[#4338CA] hover:text-white rounded-xl transition-colors inline-flex items-center justify-between"
            >
              <span>Open AI Study Hub</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </article>

          <article className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-[#7C3AED]/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-medium text-slate-500">02 · Active Recall</p>
              <h3 className="text-lg font-bold text-[#1E1B4B]">AI Quiz & Practice Generator</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Generate 5 or 10 targeted MCQs per chapter with instant emerald & crimson answer
                feedback, step-by-step explanations, and a live accuracy scoreboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('quiz')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-[#7C3AED] bg-[#7C3AED]/[0.06] hover:bg-[#7C3AED] hover:text-white rounded-xl transition-colors inline-flex items-center justify-between"
            >
              <span>Start Smart Quiz</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </article>

          <article className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between space-y-6 hover:border-[#10B981]/50 transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
                <MessageSquareText className="w-5 h-5" aria-hidden="true" />
              </div>
              <p className="text-xs font-medium text-slate-500">03 · Bilingual Guidance</p>
              <h3 className="text-lg font-bold text-[#1E1B4B]">24/7 Personal AI Tutor</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ask follow-up questions in English or বাংলা, get memory tricks for formulas,
                unpack hard paragraphs, and prepare confidently for IELTS or admission tests.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tutor')}
              className="w-full py-2.5 px-4 text-sm font-semibold text-[#1E1B4B] bg-slate-100 hover:bg-[#1E1B4B] hover:text-white rounded-xl transition-colors inline-flex items-center justify-between"
            >
              <span>Chat with Live Tutor</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </article>
        </div>

        {/* Visual Pedagogical Spotlight */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center space-y-4">
            <p className="text-xs font-semibold text-[#7C3AED]">Three-Level Pedagogy</p>
            <h3 className="text-2xl font-bold text-[#1E1B4B]">
              From abstract textbook theory to real intuition
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every explanation follows a structured 3-tier blueprint designed for rapid retention:
              first a crisp Concept Definition, then a relatable Real-World Analogy, and finally
              worked Practical Examples ready for exams.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onNavigate('study')}
                className="px-5 py-2.5 bg-[#1E1B4B] hover:bg-[#4338CA] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
              >
                <span>Generate Study Notes</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="lg:col-span-6 border-t lg:border-t-0 lg:border-l border-slate-200 bg-[#F8FAFC]">
            {!diagramImgError ? (
              <img
                src="/src/assets/images/study_concept_diagram_1794629040333.jpg"
                alt="Scientific and mathematical concept blueprint combining cellular biology and wave equations"
                referrerPolicy="no-referrer"
                onError={() => setDiagramImgError(true)}
                className="w-full h-64 lg:h-full object-cover"
              />
            ) : (
              <div className="w-full h-64 lg:h-full flex items-center justify-center p-8 text-sm text-slate-500">
                Visual Concept Diagram
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
