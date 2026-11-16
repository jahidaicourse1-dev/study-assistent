import { AlertCircle, ArrowRight, BookMarked, Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { AISettings, LanguagePreference, StudentLevel, SyllabusPlan } from '../../types/edugenius';
import { requestChapterSyllabus } from '../../utils/apiClient';
import { validateTopicInput } from '../../utils/studyFormatter';

interface SyllabusGeneratorPanelProps {
  settings: AISettings;
  onSendToPlanner: (syllabus: SyllabusPlan) => void;
}

const STORAGE_KEY = 'edugenius_syllabus_v1';

function loadSavedSyllabus(): SyllabusPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SyllabusPlan) : null;
  } catch {
    return null;
  }
}

export function SyllabusGeneratorPanel({
  settings,
  onSendToPlanner,
}: SyllabusGeneratorPanelProps) {
  const [subjectOrTopic, setSubjectOrTopic] = useState('');
  const [academicLevel, setAcademicLevel] = useState<StudentLevel>(settings.defaultLevel);
  const [language, setLanguage] = useState<LanguagePreference>(settings.defaultLanguage);

  const [syllabus, setSyllabus] = useState<SyllabusPlan | null>(() => loadSavedSyllabus());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (syllabus) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(syllabus));
      }
    } catch {
      // ignore storage errors
    }
  }, [syllabus]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateTopicInput(subjectOrTopic);
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setApiError(null);
    setLoading(true);

    try {
      const result = await requestChapterSyllabus({
        subjectOrTopic,
        academicLevel,
        language,
        settings,
      });
      setSyllabus(result);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to generate syllabus.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-5"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#1E1B4B]">AI Syllabus Generator</h2>
          <p className="text-xs text-slate-600">
            Break down any subject into prioritized chapters, highlight key learning areas, and send
            straight to your Study Planner.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="syllabus-subject" className="block text-xs font-semibold text-[#1E1B4B]">
            Subject or Topic
          </label>
          <input
            id="syllabus-subject"
            type="text"
            value={subjectOrTopic}
            onChange={(e) => {
              setSubjectOrTopic(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. HSC Physics 1st Paper or IELTS Academic"
            className="w-full min-h-[42px] px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
          />
          {validationError && (
            <p role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{validationError}</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="syllabus-level" className="block text-xs font-semibold text-[#1E1B4B]">
            Academic Level
          </label>
          <select
            id="syllabus-level"
            value={academicLevel}
            onChange={(e) => setAcademicLevel(e.target.value as StudentLevel)}
            className="w-full min-h-[42px] px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
          >
            <option value="Beginner">Beginner</option>
            <option value="Secondary (SSC)">Secondary (SSC)</option>
            <option value="Higher Secondary (HSC)">Higher Secondary (HSC)</option>
            <option value="University / Job Preparation">University / Job Preparation</option>
          </select>
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
              <span>Mapping Syllabus...</span>
            </>
          ) : (
            <span>Generate Syllabus</span>
          )}
        </button>
      </form>

      <div className="lg:col-span-8 space-y-6">
        {apiError && (
          <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-7 w-1/2 bg-slate-200 rounded" />
            <div className="h-24 bg-slate-100 rounded-xl" />
            <div className="h-24 bg-slate-100 rounded-xl" />
          </div>
        ) : syllabus ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">
                  {syllabus.academicLevel} · {syllabus.chapters.length} Chapters
                </p>
                <h3 className="text-xl font-bold text-[#1E1B4B]">{syllabus.subjectOrTopic}</h3>
                <p className="text-sm text-slate-600">{syllabus.summary}</p>
              </div>

              <button
                type="button"
                onClick={() => onSendToPlanner(syllabus)}
                className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <span>Connect to Study Planner</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {syllabus.chapters.map((ch) => (
                <div key={ch.chapterNumber} className="py-4 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-[#1E1B4B]">
                      Chapter {ch.chapterNumber}: {ch.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          ch.priority === 'High Priority'
                            ? 'text-[#7C3AED]'
                            : ch.priority === 'Practice Focus'
                              ? 'text-[#10B981]'
                              : 'text-[#4338CA]'
                        }`}
                      >
                        {ch.priority}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">·</span>
                      <span className="font-mono-tabular text-slate-500">{ch.estimatedHours} hrs</span>
                    </div>
                  </div>
                  <ul className="space-y-1 text-sm text-slate-700 pl-4 list-disc">
                    {ch.keyLearningAreas.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 min-h-[340px] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center">
              <BookMarked className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-[#1E1B4B]">Chapter-Wise Study Roadmap</h3>
            <p className="text-sm text-slate-600 max-w-md">
              Enter any subject or exam syllabus to map out prioritized chapters, important learning
              areas, and import them directly into your Study Planner.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
