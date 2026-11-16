# EduGenius AI — Apex Edutech Labs

**Tagline:** Learn Smarter, Faster, Better.

EduGenius AI is a full-stack, bilingual (English & বাংলা) educational platform powered by Google Gemini (`@google/genai`). It helps SSC, HSC, University, IELTS, and Job Preparation students master complex concepts, practice with auto-graded MCQ quizzes, and chat with a contextual 24/7 AI tutor.

## Features

1. **Landing & Home Page**: Hero quick-question bar, editorial study illustrations, animated illustrative platform counters, and direct navigation to every AI workspace.
2. **AI Study Hub**:
   - **Concept Explainer**: Subject, Student Level, Style (`Simple Summary`, `Detailed Explanation with Examples`, `Flashcard Points`), and Language controls producing 3-level structured notes, Key Points, Summary, clipboard copy, `.md` download, and one-click send to Smart Flashcards.
   - **Smart Flashcards**: Interactive flip cards generated from any topic with `Know This` and `Need Revision` controls plus `Revision Mode` filtering persisted in `localStorage`.
   - **Personalized AI Study Planner**: Academic level, subjects, goals, and target exam date generate daily tasks and a 7-day routine with checkable progress tracking.
   - **AI Syllabus Generator**: Maps subjects into prioritized chapters with key learning areas and connects straight to the Study Planner.
3. **Smart AI Quiz & Assessment Suite**:
   - **Practice Quiz**: Dynamically generates 5 or 10 MCQs with instant green/red grading, explanations, an incorrect-answer review filter, live accuracy scoreboard, and one-click re-attempt.
   - **Student Performance Analytics**: Tracks real saved quiz attempts, overall accuracy, weak topics (<70%), and incorrect-answer explanations from `localStorage`.
   - **AI Question Paper Generator**: Teacher exam builder creating printable MCQ + Written sections with marking rubrics, toggleable separate Answer Key, and `.md` export.
4. **24/7 AI Tutor Chat**: Bilingual session-aware conversational tutor with quick prompt suggestions, structured formatting, typing indicator, and conversation reset.
5. **AI Settings & Configuration**: Select between supported Gemini models (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`), adjust precision/creativity (`0.20`–`0.70`), set default language/level preferences, and verify live server-side API connectivity.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Express + Vite middleware (`server.ts`)
- **AI SDK**: `@google/genai` (server-side proxy routes under `/api/*`)
- **Testing**: `node:test` (`npx tsx --test src/utils/eduGenius.test.ts`)

## Installation & Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   Copy `.env.example` to `.env` and set your `GEMINI_API_KEY`.
   ```bash
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
3. Run unit tests:
   ```bash
   npx tsx --test src/utils/eduGenius.test.ts
   ```
4. Start the development server (port `3000`):
   ```bash
   npm run dev
   ```
5. Build & run in production:
   ```bash
   npm run build
   npm start
   ```
