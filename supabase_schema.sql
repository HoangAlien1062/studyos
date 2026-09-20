-- ==============================================================================
-- STUDYOS - SUPABASE DATABASE SCHEMA (POSTGRESQL DDL)
-- Paste and run this entire script into your Supabase SQL Editor:
-- Supabase Dashboard -> Project -> SQL Editor -> New query -> Run
-- ==============================================================================

-- 0. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    school TEXT DEFAULT 'Đại học Bách Khoa',
    major TEXT DEFAULT 'Công nghệ Thông tin & Khoa học Máy tính',
    student_id TEXT DEFAULT '20235678',
    education_level TEXT DEFAULT 'university', -- 'high_school' | 'university'
    grade_or_year TEXT DEFAULT 'Năm 2',
    bio TEXT DEFAULT 'Sinh viên năm 2 đam mê AI & Kỹ thuật lập trình. Mục tiêu GPA > 3.6',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    general JSONB DEFAULT '{"language": "vi", "timeFormat": "24h", "compactMode": false, "soundEnabled": true}'::jsonb,
    appearance JSONB DEFAULT '{"theme": "system", "accentColor": "#4f46e5"}'::jsonb,
    notifications JSONB DEFAULT '{"scheduleReminders": true, "upcomingExams": true, "flashcardsDue": true, "systemUpdates": false}'::jsonb,
    privacy JSONB DEFAULT '{"allowLocalCaching": true, "analyticsCollection": true}'::jsonb,
    ai JSONB DEFAULT '{"primaryProvider": "gemini", "temperature": 0.7, "maxTokens": 2048, "providers": {}}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    teacher TEXT,
    credit_count INTEGER DEFAULT 3,
    color TEXT NOT NULL DEFAULT '#4f46e5',
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CHAPTERS TABLE
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TOPICS TABLE
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- pdf, docx, pptx, txt, md, png, jpg, folder
    file_url TEXT,
    storage_path TEXT,
    size_bytes BIGINT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    content_preview TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. FLASHCARD DECKS TABLE
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#4f46e5',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. FLASHCARDS TABLE (SRS Spaced Repetition)
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    deck_id UUID NOT NULL REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    notes TEXT,
    state TEXT DEFAULT 'new', -- 'new', 'due', 'learned'
    repetition_count INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 0,
    next_review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_reviewed_at DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_id TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    type TEXT DEFAULT 'single',       -- 'single', 'multi', 'boolean'
    source TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. MISTAKES TABLE (Error Book / Sổ Lỗi Sai)
CREATE TABLE IF NOT EXISTS public.mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    question_content TEXT NOT NULL,
    options JSONB NOT NULL,
    selected_option_id TEXT NOT NULL,
    correct_option_id TEXT NOT NULL,
    explanation TEXT,
    subject_id UUID,
    subject_name TEXT NOT NULL,
    chapter_id UUID,
    reason TEXT DEFAULT 'Chưa nắm chắc kiến thức lý thuyết',
    review_count INTEGER DEFAULT 1,
    last_reviewed_at DATE DEFAULT CURRENT_DATE,
    is_reviewed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. EXAM QUESTIONS LINKING TABLE
CREATE TABLE IF NOT EXISTS public.exam_questions (
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    PRIMARY KEY (exam_id, question_id)
);

-- 14. EXAM ATTEMPTS / SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    user_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score REAL NOT NULL DEFAULT 0,
    accuracy_percentage REAL NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    weak_topics JSONB DEFAULT '[]'::jsonb,
    is_submitted BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID,
    subject_name TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT NOT NULL,
    teacher TEXT,
    notes TEXT,
    color TEXT NOT NULL DEFAULT '#4f46e5',
    repeat_type TEXT DEFAULT 'weekly',
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- 'info', 'reminder', 'warning', 'achievement'
    target_tab TEXT,
    target_id TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. AI CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    mode TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. AI MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    attached_files JSONB DEFAULT '[]'::jsonb,
    timestamp_str TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_chapter ON public.topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON public.documents(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON public.flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_user ON public.questions(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON public.schedules(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_subject ON public.questions(subject_id, difficulty);
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_state ON public.flashcards(deck_id, state);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams(user_id, status);
CREATE INDEX IF NOT EXISTS idx_mistakes_count ON public.mistakes(user_id, review_count);

-- ==============================================================================
-- SUPABASE STORAGE BUCKET CREATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('studyos-files', 'studyos-files', true)
ON CONFLICT (id) DO NOTHING;

-- Grant public read access to the studyos-files bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'studyos-files');

-- Allow service_role or authenticated users to insert/update/delete objects
CREATE POLICY "Full Access For All Operations"
ON storage.objects FOR ALL
USING (bucket_id = 'studyos-files')
WITH CHECK (bucket_id = 'studyos-files');

-- ==============================================================================
-- DEFAULT SEED USER & ROW LEVEL SECURITY (RLS) POLICIES FOR PERSONAL APP
-- ==============================================================================

-- 1. Insert default user for initial setup & foreign keys
INSERT INTO public.users (id, email, password_hash, name, school, major, student_id, education_level, grade_or_year, bio)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'student@studyos.edu.vn',
    'managed_by_client',
    'Nguyễn Văn An',
    'Đại học Bách Khoa TP.HCM',
    'Khoa học Máy tính',
    '2210456',
    'university',
    'Năm 2',
    'Sinh viên năm 2 đam mê AI & Kỹ thuật lập trình. Mục tiêu GPA > 3.6'
) ON CONFLICT (id) DO NOTHING;

-- 2. Set default user_id so inserts without user_id link to the default user automatically
ALTER TABLE public.subjects ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.chapters ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.topics ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.documents ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.notes ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.flashcard_decks ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.flashcards ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.questions ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.mistakes ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.exams ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.exam_attempts ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.schedules ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.notifications ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';
ALTER TABLE public.ai_conversations ALTER COLUMN user_id SET DEFAULT '11111111-1111-1111-1111-111111111111';

-- 3. Enable RLS and grant read/write access to anon & authenticated roles for client web app
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public full access %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Public full access %I" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
    END LOOP;
END $$;

