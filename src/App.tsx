import { useEffect, useState } from 'react';
import { LandingSection } from './components/LandingSection';
import { Navbar } from './components/Navbar';
import { QuizEngineSection } from './components/QuizEngineSection';
import { SettingsSection } from './components/SettingsSection';
import { StudyHubSection } from './components/StudyHubSection';
import { TutorChatSection } from './components/TutorChatSection';
import type { AISettings, SectionId } from './types/edugenius';
import { DEFAULT_AI_SETTINGS, sanitizeSettings } from './utils/studyFormatter';

const SETTINGS_STORAGE_KEY = 'edugenius_ai_preferences_v1';

function loadSavedSettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    return sanitizeSettings(JSON.parse(raw) as Partial<AISettings>);
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('home');
  const [settings, setSettings] = useState<AISettings>(() => loadSavedSettings());
  const [queuedStudyTopic, setQueuedStudyTopic] = useState<string | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view') as SectionId | null;
    if (view && ['home', 'study', 'quiz', 'tutor', 'settings'].includes(view)) {
      setActiveSection(view);
    }
  }, []);

  const navigateTo = (section: SectionId) => {
    setActiveSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickAsk = (topic: string) => {
    setQueuedStudyTopic(topic);
    navigateTo('study');
  };

  const handleSaveSettings = (next: AISettings) => {
    const clean = sanitizeSettings(next);
    setSettings(clean);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Ignore storage quota issues in private browsing
    }
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_AI_SETTINGS);
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E1B4B]">
      <Navbar
        activeSection={activeSection}
        onNavigate={navigateTo}
        onTryFree={() => navigateTo('study')}
      />

      <main className="flex-1">
        {activeSection === 'home' && (
          <LandingSection onQuickAsk={handleQuickAsk} onNavigate={navigateTo} />
        )}
        {activeSection === 'study' && (
          <StudyHubSection
            settings={settings}
            initialTopic={queuedStudyTopic}
            onConsumeInitialTopic={() => setQueuedStudyTopic(undefined)}
          />
        )}
        {activeSection === 'quiz' && <QuizEngineSection settings={settings} />}
        {activeSection === 'tutor' && <TutorChatSection settings={settings} />}
        {activeSection === 'settings' && (
          <SettingsSection
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetSettings={handleResetSettings}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <img
                src="./assets/aistudio/logo_20b7252e.png"
                alt=""
                aria-hidden="true"
                width={20}
                height={18}
                className="w-5 h-5 object-contain rounded shrink-0"
              />
              <p className="font-semibold text-[#1E1B4B]">
                EduGenius AI — Learn Smarter, Faster, Better.
              </p>
            </div>
            <p>© {new Date().getFullYear()} Apex Edutech Labs. Bilingual Bengali & English AI Learning Platform.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigateTo('study')}
              className="hover:text-[#4338CA] transition-colors"
            >
              Study Hub
            </button>
            <button
              type="button"
              onClick={() => navigateTo('quiz')}
              className="hover:text-[#4338CA] transition-colors"
            >
              Smart Quiz
            </button>
            <button
              type="button"
              onClick={() => navigateTo('tutor')}
              className="hover:text-[#4338CA] transition-colors"
            >
              Live Tutor
            </button>
            <button
              type="button"
              onClick={() => navigateTo('settings')}
              className="hover:text-[#4338CA] transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
