import type {
  AISettings,
  ApiHealthStatus,
  ChatMessage,
  ExplanationStyle,
  LanguagePreference,
  PaperDifficulty,
  QuestionPaper,
  QuizQuestion,
  SmartFlashcard,
  StudentLevel,
  StudyExplanation,
  StudyPlan,
  Subject,
  SyllabusPlan,
} from '../types/edugenius';

async function handleJsonResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.error === 'string' && data.error.trim().length > 0
        ? data.error
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchApiHealth(): Promise<ApiHealthStatus> {
  const res = await fetch('/api/health');
  return handleJsonResponse<ApiHealthStatus>(res);
}

export async function runLiveConnectionCheck(model: string): Promise<ApiHealthStatus> {
  const res = await fetch('/api/ai/health-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model }),
  });
  return handleJsonResponse<ApiHealthStatus>(res);
}

export async function requestStudyExplanation(params: {
  topic: string;
  subject: Subject;
  level: StudentLevel;
  style: ExplanationStyle;
  language: LanguagePreference;
  settings: AISettings;
}): Promise<StudyExplanation> {
  const res = await fetch('/api/study/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      subject: params.subject,
      level: params.level,
      style: params.style,
      language: params.language,
      model: params.settings.model,
      precision: params.settings.precision,
    }),
  });
  const data = await handleJsonResponse<{ explanation: StudyExplanation }>(res);
  return data.explanation;
}

export async function requestSmartFlashcards(params: {
  topic: string;
  count?: number;
  level: StudentLevel;
  language: LanguagePreference;
  settings: AISettings;
}): Promise<SmartFlashcard[]> {
  const res = await fetch('/api/study/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      count: params.count ?? 6,
      level: params.level,
      language: params.language,
      model: params.settings.model,
      precision: params.settings.precision,
    }),
  });
  const data = await handleJsonResponse<{ flashcards: SmartFlashcard[] }>(res);
  return data.flashcards;
}

export async function requestStudyPlan(params: {
  academicLevel: StudentLevel;
  subjects: string;
  goals: string;
  examDate: string;
  language: LanguagePreference;
  settings: AISettings;
}): Promise<StudyPlan> {
  const res = await fetch('/api/study/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      academicLevel: params.academicLevel,
      subjects: params.subjects,
      goals: params.goals,
      examDate: params.examDate,
      language: params.language,
      model: params.settings.model,
      precision: params.settings.precision,
    }),
  });
  const data = await handleJsonResponse<{ plan: StudyPlan }>(res);
  return data.plan;
}

export async function requestChapterSyllabus(params: {
  subjectOrTopic: string;
  academicLevel: StudentLevel;
  language: LanguagePreference;
  settings: AISettings;
}): Promise<SyllabusPlan> {
  const res = await fetch('/api/study/syllabus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjectOrTopic: params.subjectOrTopic,
      academicLevel: params.academicLevel,
      language: params.language,
      model: params.settings.model,
      precision: params.settings.precision,
    }),
  });
  const data = await handleJsonResponse<{ syllabus: SyllabusPlan }>(res);
  return data.syllabus;
}

export async function requestQuizGeneration(params: {
  topic: string;
  questionCount: 5 | 10;
  level: StudentLevel;
  language: LanguagePreference;
  settings: AISettings;
}): Promise<QuizQuestion[]> {
  const res = await fetch('/api/quiz/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: params.topic,
      questionCount: params.questionCount,
      level: params.level,
      language: params.language,
      model: params.settings.model,
      precision: params.settings.precision,
    }),
  });
  const data = await handleJsonResponse<{ questions: QuizQuestion[] }>(res);
  return data.questions;
}

export async function requestQuestionPaper(params: {
  subject: string;
  chapter: string;
  academicLevel: StudentLevel;
  difficulty: PaperDifficulty;
  mcqCount: number;
  writtenCount: number;
  language: LanguagePreference;
  settings: AISettings;
}): Promise<QuestionPaper> {
  const res = await fetch('/api/quiz/paper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: params.subject,
      chapter: params.chapter,
      academicLevel: params.academicLevel,
      difficulty: params.difficulty,
      mcqCount: params.mcqCount,
      writtenCount: params.writtenCount,
      language: params.language,
      model: params.settings.model,
      precision: params.settings.precision,
    }),
  });
  const data = await handleJsonResponse<{ paper: QuestionPaper }>(res);
  return data.paper;
}

export async function requestTutorReply(params: {
  messages: Pick<ChatMessage, 'role' | 'text'>[];
  language: LanguagePreference;
  settings: AISettings;
}): Promise<string> {
  const res = await fetch('/api/tutor/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: params.messages,
      language: params.language,
      level: params.settings.defaultLevel,
      model: params.settings.model,
      precision: params.settings.precision,
    }),
  });
  const data = await handleJsonResponse<{ reply: string }>(res);
  return data.reply;
}
