export type SectionId = 'home' | 'study' | 'quiz' | 'tutor' | 'settings';

export type StudySubTab = 'explainer' | 'flashcards' | 'planner' | 'syllabus';
export type QuizSubTab = 'quiz' | 'analytics' | 'paper';

export type Subject =
  | 'Science'
  | 'Mathematics'
  | 'English'
  | 'General Knowledge'
  | 'Programming'
  | 'Other';

export type StudentLevel =
  | 'Beginner'
  | 'Secondary (SSC)'
  | 'Higher Secondary (HSC)'
  | 'University / Job Preparation';

export type ExplanationStyle =
  | 'Simple Summary'
  | 'Detailed Explanation with Examples'
  | 'Flashcard Points';

export type LanguagePreference = 'auto' | 'en' | 'bn';

export type SupportedGeminiModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export interface FlashcardItem {
  front: string;
  back: string;
}

export type FlashcardStatus = 'unreviewed' | 'known' | 'revision';

export interface SmartFlashcard {
  id: string;
  topic: string;
  front: string;
  back: string;
  status: FlashcardStatus;
}

export interface StudyExplanation {
  title: string;
  language: 'en' | 'bn';
  conceptDefinition: string;
  realWorldAnalogy: string;
  practicalExamples: string[];
  keyPoints: string[];
  summary: string;
  flashcards?: FlashcardItem[];
}

export interface StudyTask {
  id: string;
  dayLabel: string;
  subject: string;
  taskTitle: string;
  durationMinutes: number;
  completed: boolean;
}

export interface WeeklyScheduleItem {
  day: string;
  focusSubject: string;
  objective: string;
  hours: number;
}

export interface StudyPlan {
  id: string;
  title: string;
  academicLevel: StudentLevel;
  subjects: string;
  examDate: string;
  goals: string;
  overview: string;
  dailyTasks: StudyTask[];
  weeklySchedule: WeeklyScheduleItem[];
  createdAt: string;
}

export interface SyllabusChapter {
  chapterNumber: number;
  title: string;
  estimatedHours: number;
  keyLearningAreas: string[];
  priority: 'High Priority' | 'Core' | 'Practice Focus';
}

export interface SyllabusPlan {
  id: string;
  subjectOrTopic: string;
  academicLevel: StudentLevel;
  summary: string;
  chapters: SyllabusChapter[];
  createdAt: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface QuizResultSummary {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  accuracyPercent: number;
  scoreLabel: string;
  isComplete: boolean;
}

export interface SavedIncorrectItem {
  question: string;
  selectedOption: string;
  correctOption: string;
  explanation: string;
}

export interface SavedQuizAttempt {
  id: string;
  topic: string;
  level: StudentLevel;
  total: number;
  correct: number;
  incorrect: number;
  accuracyPercent: number;
  incorrectItems: SavedIncorrectItem[];
  completedAt: string;
}

export interface TopicPerformanceSummary {
  topic: string;
  attempts: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracyPercent: number;
  isWeak: boolean;
}

export interface AnalyticsOverview {
  totalQuizzes: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  overallAccuracyPercent: number;
  weakTopics: TopicPerformanceSummary[];
  topicSummaries: TopicPerformanceSummary[];
  recentIncorrectItems: (SavedIncorrectItem & { topic: string; completedAt: string })[];
}

export type PaperDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Board Standard';

export interface QuestionPaperMcq {
  number: number;
  question: string;
  options: [string, string, string, string];
  correctLetter: 'A' | 'B' | 'C' | 'D';
  answerText: string;
  explanation: string;
}

export interface QuestionPaperWritten {
  number: number;
  type: 'Short Question' | 'Creative / Broad Question';
  marks: number;
  question: string;
  markingRubric: string;
}

export interface QuestionPaper {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  academicLevel: StudentLevel;
  difficulty: PaperDifficulty;
  totalMarks: number;
  timeAllowedMinutes: number;
  mcqs: QuestionPaperMcq[];
  writtenQuestions: QuestionPaperWritten[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface AISettings {
  model: SupportedGeminiModel;
  precision: number; // 0.2 to 0.7
  defaultLanguage: LanguagePreference;
  defaultLevel: StudentLevel;
}

export interface ApiHealthStatus {
  configured: boolean;
  provider: string;
  activeModels: SupportedGeminiModel[];
  checkedAt?: string;
  latencyMs?: number;
  liveVerified?: boolean;
  message?: string;
}
