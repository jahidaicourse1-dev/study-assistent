import { AlertCircle, Calendar, CheckSquare, Loader2, Square } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { AISettings, LanguagePreference, StudentLevel, StudyPlan } from '../../types/edugenius';
import { requestStudyPlan } from '../../utils/apiClient';
import {
  calculatePlanProgress,
  toggleStudyTaskCompletion,
  validateStudyPlanInput,
} from '../../utils/workspaceLogic';

interface StudyPlannerPanelProps {
  settings: AISettings;
  importedSyllabus?: {
    subjects: string;
    goals: string;
    academicLevel: StudentLevel;
  } | null;
  onConsumeImportedSyllabus?: () => void;
}

const STORAGE_KEY = 'edugenius_study_plan_v1';

function loadSavedPlan(): StudyPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudyPlan) : null;
  } catch {
    return null;
  }
}

function defaultExamDate(): string {
  const dt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return dt.toISOString().slice(0, 10);
}

export function StudyPlannerPanel({
  settings,
  importedSyllabus,
  onConsumeImportedSyllabus,
}: StudyPlannerPanelProps) {
  const [academicLevel, setAcademicLevel] = useState<StudentLevel>(settings.defaultLevel);
  const [subjects, setSubjects] = useState('');
  const [goals, setGoals] = useState('');
  const [examDate, setExamDate] = useState(defaultExamDate);
  const [language, setLanguage] = useState<LanguagePreference>(settings.defaultLanguage);

  const [plan, setPlan] = useState<StudyPlan | null>(() => loadSavedPlan());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (plan) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
      }
    } catch {
      // ignore storage errors
    }
  }, [plan]);

  useEffect(() => {
    if (importedSyllabus) {
      setSubjects(importedSyllabus.subjects);
      setGoals(importedSyllabus.goals);
      setAcademicLevel(importedSyllabus.academicLevel);
      setValidationError(null);
      onConsumeImportedSyllabus?.();
    }
  }, [importedSyllabus, onConsumeImportedSyllabus]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validateStudyPlanInput({ subjects, goals, examDate });
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setApiError(null);
    setLoading(true);

    try {
      const generated = await requestStudyPlan({
        academicLevel,
        subjects,
        goals,
        examDate,
        language,
        settings,
      });
      setPlan(generated);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to generate study plan.');
    } finally {
      setLoading(false);
    }
  };

  const progress = plan ? calculatePlanProgress(plan.dailyTasks) : { completed: 0, total: 0, percent: 0 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Planner Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
      >
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#1E1B4B]">Personalized AI Study Planner</h2>
          <p className="text-xs text-slate-600">
            Generate a daily task checklist and 7-day routine aligned with your exam deadline.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="planner-level" className="block text-xs font-semibold text-[#1E1B4B]">
            Academic Level
          </label>
          <select
            id="planner-level"
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
          <label htmlFor="planner-subjects" className="block text-xs font-semibold text-[#1E1B4B]">
            Subjects
          </label>
          <input
            id="planner-subjects"
            type="text"
            value={subjects}
            onChange={(e) => {
              setSubjects(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. Physics, Higher Math, English"
            className="w-full min-h-[42px] px-3.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="planner-goals" className="block text-xs font-semibold text-[#1E1B4B]">
            Study Goals
          </label>
          <textarea
            id="planner-goals"
            rows={3}
            value={goals}
            onChange={(e) => {
              setGoals(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g. Finish Thermodynamics, solve 50 past paper MCQs, improve IELTS Reading..."
            className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="planner-date" className="block text-xs font-semibold text-[#1E1B4B]">
              Target Exam Date
            </label>
            <input
              id="planner-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full min-h-[40px] px-2.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="planner-lang" className="block text-xs font-semibold text-[#1E1B4B]">
              Language
            </label>
            <select
              id="planner-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguagePreference)}
              className="w-full min-h-[40px] px-2.5 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-xs text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            >
              <option value="auto">Auto</option>
              <option value="en">English</option>
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
              <span>Generating Routine...</span>
            </>
          ) : (
            <span>Generate Study Plan</span>
          )}
        </button>
      </form>

      {/* Plan Stage */}
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
            <div className="h-20 bg-slate-100 rounded-xl" />
            <div className="h-44 bg-slate-100 rounded-xl" />
          </div>
        ) : plan ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{plan.academicLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span>Exam Date: {plan.examDate}</span>
                </div>
                <h3 className="text-xl font-bold text-[#1E1B4B]">{plan.title}</h3>
                <p className="text-sm text-slate-600">{plan.overview}</p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="text-2xl font-bold text-[#10B981] tabular-nums">{progress.percent}%</p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {progress.completed} of {progress.total} tasks done
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10B981] transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {/* Daily Tasks Checklist */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[#4338CA]">Daily Study Tasks</h4>
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {plan.dailyTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setPlan((prev) => (prev ? toggleStudyTaskCompletion(prev, task.id) : prev))}
                    className="w-full py-3.5 text-left flex items-start justify-between gap-4 hover:bg-[#F8FAFC] px-2 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <div className="space-y-0.5">
                        <p
                          className={`text-sm font-medium ${
                            task.completed ? 'line-through text-slate-400' : 'text-[#1E1B4B]'
                          }`}
                        >
                          {task.taskTitle}
                        </p>
                        <p className="text-xs text-slate-500">
                          {task.dayLabel} · {task.subject}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-mono-tabular font-semibold text-slate-500 shrink-0">
                      {task.durationMinutes} min
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Routine */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-[#1E1B4B]">Weekly Study Routine</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plan.weeklySchedule.map((slot, idx) => (
                  <div key={idx} className="p-3.5 bg-[#F8FAFC] rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#4338CA]">{slot.day}</span>
                      <span className="font-mono-tabular text-slate-500">{slot.hours} hrs</span>
                    </div>
                    <p className="text-sm font-semibold text-[#1E1B4B]">{slot.focusSubject}</p>
                    <p className="text-xs text-slate-600">{slot.objective}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 min-h-[340px] flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
              <Calendar className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-[#1E1B4B]">Build your personalized routine</h3>
            <p className="text-sm text-slate-600 max-w-md">
              Fill in your subjects, goals, and target exam date — or import a chapter plan directly
              from the AI Syllabus Generator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
