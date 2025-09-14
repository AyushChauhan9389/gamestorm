-- Migration: Ensure Unique Vote Constraint
-- Description: Adds unique constraint to vote_submissions if it doesn't exist
-- Date: 2025-09-14

-- Check if constraint exists and add it if missing
DO $$
BEGIN
    -- Try to add the unique constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'vote_submissions_unique_user_vote'
    ) THEN
        ALTER TABLE public.vote_submissions 
        ADD CONSTRAINT vote_submissions_unique_user_vote UNIQUE (vote_id, user_id);
        
        RAISE NOTICE 'Added unique constraint vote_submissions_unique_user_vote';
    ELSE
        RAISE NOTICE 'Unique constraint vote_submissions_unique_user_vote already exists';
    END IF;
END
$$;
