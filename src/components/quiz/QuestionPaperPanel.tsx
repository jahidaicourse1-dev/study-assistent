import {
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type {
  AISettings,
  LanguagePreference,
  PaperDifficulty,
  QuestionPaper,
  StudentLevel,
} from '../../types/edugenius';
import { requestQuestionPaper } from '../../utils/apiClient';
import { validateTopicInput } from '../../utils/studyFormatter';
import { buildQuestionPaperMarkdown } from '../../utils/workspaceLogic';

interface QuestionPaperPanelProps {
  settings: AISettings;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export function QuestionPaperPanel({ settings }: QuestionPaperPanelProps) {
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [academicLevel, setAcademicLevel] = useState<StudentLevel>(settings.defaultLevel);
  const [difficulty, setDifficulty] = useState<PaperDifficulty>('Medium');
  const [mcqCount, setMcqCount] = useState(5);
  const [writtenCount, setWrittenCount] = useState(3);
  const [language, setLanguage] = useState<LanguagePreference>(settings.defaultLanguage);

  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const sErr = validateTopicInput(subject);
    const cErr = validateTopicInput(chapter);
    if (sErr || cErr) {
      setValidationError(sErr || cErr || 'Please enter both subject and chapter.');
      return;
    }

    setValidationError(null);
    setApiError(null);
    setLoading(true);

    try {
      const generated = await requestQuestionPaper({
        subject,
        chapter,
        academicLevel,
        difficulty,
        mcqCount,
        writtenCount,
        language,
        settings,
      });
      setPaper(generated);
      setShowAnswerKey(true);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to generate question paper.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!paper) return;
    const md = buildQuestionPaperMarkdown(paper);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paper.subject.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-question-paper.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 print:hidden"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#1E1B4B]">AI Question Paper Generator</h2>
          <p className="text-xs text-slate-600">
            Teacher exam builder creating printable MCQ + Written sections with a separate Answer
            Key.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="qp-subject" className="block text-xs font-semibold text-[#1E1B4B]">
            Subject
          </label>
          <input
            id="qp-subject"
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. Biology, Physics, English 1st Paper"
            className="w-full min-h-[42px] px-3.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="qp-chapter" className="block text-xs font-semibold text-[#1E1B4B]">
            Chapter / Topic
          </label>
          <input
            id="qp-chapter"
            type="text"
            value={chapter}
            onChange={(e) => {
              setChapter(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. Cell Division or Thermodynamics"
            className="w-full min-h-[42px] px-3.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="qp-level" className="block text-xs font-semibold text-[#1E1B4B]">
              Academic Level
            </label>
            <select
              id="qp-level"
              value={academicLevel}
              onChange={(e) => setAcademicLevel(e.target.value as StudentLevel)}
              className="w-full min-h-[40px] px-2.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B]"
            >
              <option value="Beginner">Beginner</option>
              <option value="Secondary (SSC)">Secondary (SSC)</option>
              <option value="Higher Secondary (HSC)">Higher Secondary (HSC)</option>
              <option value="University / Job Preparation">University / Job</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="qp-difficulty" className="block text-xs font-semibold text-[#1E1B4B]">
              Difficulty
            </label>
            <select
              id="qp-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as PaperDifficulty)}
              className="w-full min-h-[40px] px-2.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B]"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Board Standard">Board Standard</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <label htmlFor="qp-mcqs" className="block text-xs font-semibold text-[#1E1B4B]">
              MCQs
            </label>
            <select
              id="qp-mcqs"
              value={mcqCount}
              onChange={(e) => setMcqCount(Number(e.target.value))}
              className="w-full min-h-[40px] px-2 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="qp-written" className="block text-xs font-semibold text-[#1E1B4B]">
              Written
            </label>
            <select
              id="qp-written"
              value={writtenCount}
              onChange={(e) => setWrittenCount(Number(e.target.value))}
              className="w-full min-h-[40px] px-2 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B]"
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="qp-lang" className="block text-xs font-semibold text-[#1E1B4B]">
              Language
            </label>
            <select
              id="qp-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
              className="w-full min-h-[40px] px-2 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B]"
            >
              <option value="auto">Auto</option>
              <option value="en">EN</option>
              <option value="bn">বাংলা</option>
            </select>
          </div>
        </div>

        {validationError && (
          <p role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{validationError}</span>
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] px-4 py-2.5 bg-[#4338CA] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Composing Paper...</span>
            </>
          ) : (
            <span>Generate Question Paper</span>
          )}
        </button>
      </form>

      <div className="lg:col-span-8 space-y-6">
        {apiError && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-red-800">{apiError}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector('#qp-subject')?.closest('form');
                form?.requestSubmit();
              }}
              className="px-3.5 py-1.5 text-xs font-semibold bg-white border border-red-300 text-red-700 hover:bg-red-100 rounded-lg inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Retry Generation</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-7 w-2/3 bg-slate-200 rounded" />
            <div className="h-32 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        ) : paper ? (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 print:hidden">
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {paper.mcqs.length} MCQs + {paper.writtenQuestions.length} Written · Total{' '}
                {paper.totalMarks} Marks
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnswerKey((prev) => !prev)}
                  className="px-3.5 py-2 text-xs font-semibold bg-[#F8FAFC] hover:bg-slate-200/70 text-[#1E1B4B] border border-slate-200 rounded-xl inline-flex items-center gap-1.5"
                >
                  {showAnswerKey ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Hide Answer Key</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Show Answer Key</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 text-xs font-semibold bg-[#F8FAFC] hover:bg-slate-200/70 text-[#1E1B4B] border border-slate-200 rounded-xl inline-flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Print Paper</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3.5 py-2 text-xs font-semibold bg-[#1E1B4B] hover:bg-[#4338CA] text-white rounded-xl inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Download (.md)</span>
                </button>
              </div>
            </div>

            {/* Printable Question Paper */}
            <article className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-7">
              <header className="text-center pb-5 border-b border-slate-200 space-y-1.5">
                <p className="text-xs font-semibold text-[#4338CA]">
                  EduGenius AI Assessment · {paper.academicLevel}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1E1B4B]">{paper.title}</h3>
                <p className="text-xs text-slate-600 tabular-nums">
                  Subject: {paper.subject} · Chapter: {paper.chapter} · Difficulty: {paper.difficulty}{' '}
                  · Time: {paper.timeAllowedMinutes} mins · Total Marks: {paper.totalMarks}
                </p>
              </header>

              {/* Section A: MCQs */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#1E1B4B]">
                  Section A: Multiple Choice Questions ({paper.mcqs.length} × 1 = {paper.mcqs.length}{' '}
                  Marks)
                </h4>
                <div className="space-y-4">
                  {paper.mcqs.map((q) => (
                    <div key={q.number} className="space-y-2">
                      <p className="text-sm font-medium text-[#1E1B4B]">
                        <span className="font-mono-tabular font-bold mr-1.5">{q.number}.</span>
                        {q.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5 text-xs sm:text-sm text-slate-700">
                        {q.options.map((opt, idx) => (
                          <p key={idx}>
                            <span className="font-mono-tabular font-semibold mr-1.5">
                              {OPTION_LETTERS[idx]}.
                            </span>
                            {opt}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section B: Written Questions */}
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <h4 className="text-sm font-bold text-[#1E1B4B]">
                  Section B: Written Questions
                </h4>
                <div className="space-y-4">
                  {paper.writtenQuestions.map((w) => (
                    <div key={w.number} className="flex items-start justify-between gap-4">
                      <p className="text-sm text-[#1E1B4B] leading-relaxed">
                        <span className="font-mono-tabular font-bold mr-1.5">{w.number}.</span>
                        <span className="text-xs font-semibold text-[#4338CA] mr-1.5">
                          [{w.type}]
                        </span>
                        {w.question}
                      </p>
                      <span className="text-xs font-mono-tabular font-semibold text-slate-500 shrink-0">
                        [{w.marks} Marks]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            {/* Separate Answer Key */}
            {showAnswerKey && (
              <section
                aria-label="Separate Answer Key"
                className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5"
              >
                <div className="pb-3 border-b border-slate-200">
                  <p className="text-xs font-semibold text-[#10B981]">Separate Answer Key</p>
                  <h4 className="text-lg font-bold text-[#1E1B4B]">
                    Solutions & Marking Guidelines
                  </h4>
                </div>

                <div className="space-y-2.5">
                  <h5 className="text-xs font-bold text-[#4338CA]">Section A: MCQ Answers</h5>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {paper.mcqs.map((q) => (
                      <li key={q.number}>
                        <span className="font-mono-tabular font-bold text-[#1E1B4B]">
                          Q{q.number}: {q.correctLetter} ({q.answerText})
                        </span>{' '}
                        — {q.explanation}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-200 space-y-2.5">
                  <h5 className="text-xs font-bold text-[#7C3AED]">
                    Section B: Written Marking Rubric
                  </h5>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {paper.writtenQuestions.map((w) => (
                      <li key={w.number}>
                        <span className="font-mono-tabular font-bold text-[#1E1B4B]">
                          Q{w.number} ({w.marks} Marks):
                        </span>{' '}
                        {w.markingRubric}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 min-h-[340px] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-[#1E1B4B]">Compose a Printable Exam Paper</h3>
            <p className="text-sm text-slate-600 max-w-md">
              Enter a subject, chapter, and difficulty to generate formatted MCQs and written
              questions along with a separate, toggleable Answer Key.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
