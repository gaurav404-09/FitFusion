-- CampusTitan: Persistent AI Conversation Memory
-- Each user has one ongoing conversation stored as a JSONB array of messages.
-- Older messages are compressed into a summary to keep the context window bounded.

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT DEFAULT NULL,  -- LLM-compressed summary of old messages
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)  -- one conversation per user (we rotate/append, not create new)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_conversations_updated_at();

-- RLS: users can only read/write their own conversation
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own conversation" ON public.conversations;
CREATE POLICY "Users can read own conversation"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversation" ON public.conversations;
CREATE POLICY "Users can insert own conversation"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversation" ON public.conversations;
CREATE POLICY "Users can update own conversation"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user_id);
