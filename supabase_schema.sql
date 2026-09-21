-- ==============================================================================
-- STUDYOS - SUPABASE DATABASE SCHEMA & IDENTITY SYSTEM (POSTGRESQL DDL)
-- Supabase Auth as the Sole Identity Core + Google OAuth + RLS + Admin RBAC
--
-- How to apply:
-- 1. Open your Supabase Project Dashboard
-- 2. Navigate to SQL Editor -> New Query
-- 3. Paste this script and click Run
-- ==============================================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS TABLE (Linked directly to Supabase auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT 'Học viên StudyOS',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    school TEXT DEFAULT 'Đại học Bách Khoa',
    major TEXT DEFAULT 'Công nghệ Thông tin & Khoa học Máy tính',
    student_id TEXT DEFAULT '',
    education_level TEXT DEFAULT 'university' CHECK (education_level IN ('high_school', 'university')),
    grade_or_year TEXT DEFAULT 'Năm 2',
    bio TEXT DEFAULT 'Học viên năng động tại StudyOS.',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index on email & role
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ==============================================================================
-- 2. ADMIN HELPER FUNCTION (Bypasses RLS recursion safely)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. AUTOMATIC PROFILE CREATION TRIGGER (Google OAuth & Email SignUp)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_name TEXT;
    raw_avatar TEXT;
    raw_edu TEXT;
    raw_grade TEXT;
    raw_school TEXT;
    raw_major TEXT;
BEGIN
    -- Extract name from user metadata or fallback to email username
    raw_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract avatar URL from Google OAuth metadata if present
    raw_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        ''
    );

    raw_edu := COALESCE(NEW.raw_user_meta_data->>'education_level', 'university');
    raw_grade := COALESCE(NEW.raw_user_meta_data->>'grade_or_year', 'Năm 2');
    raw_school := COALESCE(NEW.raw_user_meta_data->>'school', 'Đại học Bách Khoa');
    raw_major := COALESCE(NEW.raw_user_meta_data->>'major', 'Khoa học Máy tính');

    INSERT INTO public.users (
        id,
        email,
        name,
        role,
        avatar_url,
        education_level,
        grade_or_year,
        school,
        major,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        raw_name,
        'user',
        raw_avatar,
        raw_edu,
        raw_grade,
        raw_school,
        raw_major,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(NULLIF(public.users.name, 'Học viên StudyOS'), EXCLUDED.name),
        avatar_url = COALESCE(NULLIF(public.users.avatar_url, ''), EXCLUDED.avatar_url),
        updated_at = now();

    -- Also insert default user_settings
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 4. USER SETTINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    general JSONB DEFAULT '{"language": "vi", "timeFormat": "24h", "compactMode": false, "soundEnabled": true}'::jsonb,
    appearance JSONB DEFAULT '{"theme": "system", "accentColor": "#4f46e5"}'::jsonb,
    notifications JSONB DEFAULT '{"scheduleReminders": true, "upcomingExams": true, "flashcardsDue": true, "systemUpdates": false}'::jsonb,
    privacy JSONB DEFAULT '{"allowLocalCaching": true, "analyticsCollection": true}'::jsonb,
    ai JSONB DEFAULT '{"primaryProvider": "gemini", "temperature": 0.7, "maxTokens": 2048, "providers": {}}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 5. SUBJECTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    teacher TEXT,
    credit_count INTEGER DEFAULT 3,
    color TEXT NOT NULL DEFAULT '#4f46e5',
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 6. CHAPTERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 7. TOPICS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. DOCUMENTS TABLE (Metadata for Local, Supabase & Google Drive Storage)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- pdf, docx, pptx, txt, md, png, jpg, folder
    file_url TEXT,
    storage_provider TEXT DEFAULT 'local', -- 'google_drive', 'supabase', 'local'
    storage_file_id TEXT,                 -- Google Drive file ID or Supabase storage path
    storage_path TEXT,
    size_bytes BIGINT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    content_preview TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 9. NOTES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 10. FLASHCARD DECKS & FLASHCARDS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#4f46e5',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 11. QUESTIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 12. MISTAKES TABLE (Error Logbook / Sổ Lỗi Sai)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 13. EXAMS & ATTEMPTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exam_questions (
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    PRIMARY KEY (exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 14. SCHEDULES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
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

-- ==============================================================================
-- 15. NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    target_tab TEXT,
    target_id TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 16. AI CONVERSATIONS & MESSAGES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    mode TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    attached_files JSONB DEFAULT '[]'::jsonb,
    timestamp_str TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 17. SYSTEM AUDIT LOGS & BACKUPS (ADMIN EXCLUSIVE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    category TEXT NOT NULL, -- 'auth', 'storage', 'admin', 'ai', 'security'
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    storage_provider TEXT DEFAULT 'google_drive',
    drive_file_id TEXT,
    status TEXT DEFAULT 'completed', -- 'in_progress', 'completed', 'failed'
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 18. HIGH-PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user ON public.chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_user ON public.topics(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_user ON public.flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_user ON public.questions(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_exams_user ON public.exams(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON public.exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_backups_created ON public.system_backups(created_at DESC);

-- ==============================================================================
-- 19. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: user_id = auth.uid() OR is_admin()
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- Helper macro to clean and setup standard user isolation policy
DO $$
DECLARE
    tbl text;
    user_tables text[] := ARRAY[
        'user_settings', 'subjects', 'chapters', 'topics', 'documents', 'notes',
        'flashcard_decks', 'flashcards', 'questions', 'mistakes', 'exams',
        'exam_attempts', 'schedules', 'notifications', 'ai_conversations'
    ];
BEGIN
    FOREACH tbl IN ARRAY user_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "User self access or admin" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "User self access or admin" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());', tbl, tbl);
    END LOOP;
END $$;

-- Policies for public.users
DROP POLICY IF EXISTS "Users can view own profile or admin" ON public.users;
CREATE POLICY "Users can view own profile or admin" ON public.users
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile or admin" ON public.users;
CREATE POLICY "Users can update own profile or admin" ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile or admin" ON public.users;
CREATE POLICY "Users can insert own profile or admin" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- Policies for exam_questions (child of exams)
DROP POLICY IF EXISTS "Exam questions access via parent exam" ON public.exam_questions;
CREATE POLICY "Exam questions access via parent exam" ON public.exam_questions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_questions.exam_id AND (exams.user_id = auth.uid() OR public.is_admin())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.exams WHERE exams.id = exam_questions.exam_id AND (exams.user_id = auth.uid() OR public.is_admin())));

-- Policies for ai_messages (child of ai_conversations)
DROP POLICY IF EXISTS "AI messages access via conversation" ON public.ai_messages;
CREATE POLICY "AI messages access via conversation" ON public.ai_messages
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.ai_conversations WHERE ai_conversations.id = ai_messages.conversation_id AND (ai_conversations.user_id = auth.uid() OR public.is_admin())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations WHERE ai_conversations.id = ai_messages.conversation_id AND (ai_conversations.user_id = auth.uid() OR public.is_admin())));

-- Policies for system_logs & system_backups (Admin Only)
DROP POLICY IF EXISTS "Admin only logs" ON public.system_logs;
CREATE POLICY "Admin only logs" ON public.system_logs
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin only backups" ON public.system_backups;
CREATE POLICY "Admin only backups" ON public.system_backups
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- 20. SUPABASE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('studyos-files', 'studyos-files', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated User Uploads" ON storage.objects;
CREATE POLICY "Authenticated User Uploads"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'studyos-files')
WITH CHECK (bucket_id = 'studyos-files');

DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'studyos-files');
