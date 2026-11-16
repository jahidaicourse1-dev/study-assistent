import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type {
  AISettings,
  ApiHealthStatus,
  LanguagePreference,
  StudentLevel,
  SupportedGeminiModel,
} from '../types/edugenius';
import { fetchApiHealth, runLiveConnectionCheck } from '../utils/apiClient';
import {
  clampPrecisionValue,
  DEFAULT_AI_SETTINGS,
  describePrecisionMode,
  SUPPORTED_MODELS,
} from '../utils/studyFormatter';

interface SettingsSectionProps {
  settings: AISettings;
  onSaveSettings: (next: AISettings) => void;
  onResetSettings: () => void;
}

export function SettingsSection({
  settings,
  onSaveSettings,
  onResetSettings,
}: SettingsSectionProps) {
  const [draftModel, setDraftModel] = useState<SupportedGeminiModel>(settings.model);
  const [draftPrecision, setDraftPrecision] = useState<number>(settings.precision);
  const [draftLanguage, setDraftLanguage] = useState<LanguagePreference>(settings.defaultLanguage);
  const [draftLevel, setDraftLevel] = useState<StudentLevel>(settings.defaultLevel);

  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [health, setHealth] = useState<ApiHealthStatus | null>(null);
  const [checkingLive, setCheckingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  useEffect(() => {
    setDraftModel(settings.model);
    setDraftPrecision(settings.precision);
    setDraftLanguage(settings.defaultLanguage);
    setDraftLevel(settings.defaultLevel);
  }, [settings]);

  useEffect(() => {
    let active = true;
    fetchApiHealth()
      .then((res) => {
        if (active) setHealth(res);
      })
      .catch(() => {
        if (active) {
          setHealth({
            configured: false,
            provider: 'Google Gemini (@google/genai)',
            activeModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const clean: AISettings = {
      model: draftModel,
      precision: clampPrecisionValue(draftPrecision),
      defaultLanguage: draftLanguage,
      defaultLevel: draftLevel,
    };
    onSaveSettings(clean);
    setSavedNotice('AI configuration preferences saved.');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleReset = () => {
    onResetSettings();
    setDraftModel(DEFAULT_AI_SETTINGS.model);
    setDraftPrecision(DEFAULT_AI_SETTINGS.precision);
    setDraftLanguage(DEFAULT_AI_SETTINGS.defaultLanguage);
    setDraftLevel(DEFAULT_AI_SETTINGS.defaultLevel);
    setSavedNotice('Preferences restored to recommended defaults.');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleTestLiveConnection = async () => {
    setCheckingLive(true);
    setLiveError(null);
    try {
      const result = await runLiveConnectionCheck(draftModel);
      setHealth(result);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : 'Unable to verify live Gemini connection.');
    } finally {
      setCheckingLive(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2 max-w-3xl">
        <p className="text-xs font-semibold text-[#4338CA]">AI Settings & Configuration</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E1B4B]">
          Model Preferences & Server Connection
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Customize your preferred Gemini model, reasoning focus, and bilingual defaults. API
          credentials are securely managed on the server via environment secrets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Preferences Form */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6"
        >
          <div className="space-y-3">
            <span className="block text-xs font-semibold text-[#1E1B4B]">
              Gemini Model Selection
            </span>
            <div className="space-y-3" role="radiogroup" aria-label="Gemini Model Selection">
              {SUPPORTED_MODELS.map((m) => {
                const selected = draftModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDraftModel(m.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors space-y-1 ${
                      selected
                        ? 'bg-[#4338CA]/[0.06] border-[#4338CA]'
                        : 'bg-[#F8FAFC] border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#1E1B4B]">{m.label}</span>
                      <span className="text-xs font-mono-tabular text-[#4338CA]">{m.id}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Note on legacy models: <code className="font-mono-tabular">gemini-1.5-flash</code> and{' '}
              <code className="font-mono-tabular">gemini-1.5-pro</code> are deprecated and
              unavailable on this Gemini API version, so active Gemini 4 / 3.1 models are provided
              above for reliable responses.
            </p>
          </div>

          {/* Temperature / Precision Control Slider (0.2 - 0.7) */}
          <div className="space-y-3 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="precision-slider" className="text-xs font-semibold text-[#1E1B4B]">
                Temperature Control ({draftPrecision.toFixed(2)})
              </label>
              <span className="text-xs font-semibold text-[#7C3AED]">
                {describePrecisionMode(draftPrecision)}
              </span>
            </div>
            <input
              id="precision-slider"
              type="range"
              min={0.2}
              max={0.7}
              step={0.05}
              value={draftPrecision}
              onChange={(e) => setDraftPrecision(clampPrecisionValue(parseFloat(e.target.value)))}
              className="w-full accent-[#4338CA] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
              <span>0.2 · Focused & Exam-Exact</span>
              <span>0.7 · Creative & Analogy-Rich</span>
            </div>
          </div>

          {/* Default Language & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div className="space-y-1.5">
              <label htmlFor="default-language" className="block text-xs font-semibold text-[#1E1B4B]">
                Default Language
              </label>
              <select
                id="default-language"
                value={draftLanguage}
                onChange={(e) => setDraftLanguage(e.target.value as LanguagePreference)}
                className="w-full min-h-[42px] px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              >
                <option value="auto">Auto-detect (English / বাংলা)</option>
                <option value="en">English</option>
                <option value="bn">বাংলা (Bengali)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="default-level" className="block text-xs font-semibold text-[#1E1B4B]">
                Default Student Level
              </label>
              <select
                id="default-level"
                value={draftLevel}
                onChange={(e) => setDraftLevel(e.target.value as StudentLevel)}
                className="w-full min-h-[42px] px-3 py-2 bg-[#F8FAFC] border border-slate-300 rounded-xl text-sm text-[#1E1B4B] focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              >
                <option value="Beginner">Beginner</option>
                <option value="Secondary (SSC)">Secondary (SSC)</option>
                <option value="Higher Secondary (HSC)">Higher Secondary (HSC)</option>
                <option value="University / Job Preparation">University / Job Preparation</option>
              </select>
            </div>
          </div>

          {savedNotice && (
            <p
              role="status"
              className="text-xs font-semibold text-[#10B981] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{savedNotice}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#4338CA] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>Save Configuration</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 bg-[#F8FAFC] hover:bg-slate-200/70 text-[#1E1B4B] border border-slate-300 text-sm font-semibold rounded-xl transition-colors inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </form>

        {/* Server Connection Status Sidebar */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">API Connection Status</p>
              <h2 className="text-lg font-bold text-[#1E1B4B]">Server-Side Gemini Proxy</h2>
            </div>
            <ShieldCheck className="w-6 h-6 text-[#4338CA] shrink-0" aria-hidden="true" />
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            <div className="py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Environment Key</span>
              {health?.configured ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#10B981]">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Configured</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  <span>Not Detected</span>
                </span>
              )}
            </div>

            <div className="py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">SDK Runtime</span>
              <span className="font-medium text-[#1E1B4B]">@google/genai (Server)</span>
            </div>

            <div className="py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Generation Quota</span>
              <span className="font-semibold text-[#10B981]">
                Unlimited · Auto-Failover
              </span>
            </div>

            {typeof health?.latencyMs === 'number' && (
              <div className="py-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Last Verified Latency</span>
                <span className="font-mono-tabular font-semibold text-[#10B981]">
                  {health.latencyMs} ms
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            EduGenius AI imposes zero daily generation caps and automatically switches between{' '}
            <code className="font-mono-tabular">gemini-4-hydrogen</code> and{' '}
            <code className="font-mono-tabular">gemini-3.1-flash-lite</code> if an upstream API
            rate limit occurs. Your Gemini API key remains secured in server environment secrets (
            <code className="font-mono-tabular">GEMINI_API_KEY</code>).
          </p>

          {health?.liveVerified && health.message && (
            <p className="text-xs font-medium text-[#10B981]">{health.message}</p>
          )}

          {liveError && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {liveError}
            </p>
          )}

          <button
            type="button"
            disabled={checkingLive}
            onClick={handleTestLiveConnection}
            className="w-full py-2.5 px-4 bg-[#1E1B4B] hover:bg-[#4338CA] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors inline-flex items-center justify-center gap-2"
          >
            {checkingLive ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Verifying Live Connection...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" aria-hidden="true" />
                <span>Verify Live AI Connection</span>
              </>
            )}
          </button>
        </aside>
      </div>
    </section>
  );
}
