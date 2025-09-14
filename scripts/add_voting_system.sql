-- Migration: Add Voting System
-- Description: Creates votes and vote_submissions tables with constraint for one vote per user per vote item
-- Date: 2025-09-14

-- Create votes table to store vote items/questions
CREATE TABLE public.votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT votes_pkey PRIMARY KEY (id),
  CONSTRAINT votes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Create vote_submissions table to store user votes
CREATE TABLE public.vote_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vote_id uuid NOT NULL,
  user_id uuid NOT NULL,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT vote_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT vote_submissions_vote_id_fkey FOREIGN KEY (vote_id) REFERENCES public.votes(id),
  CONSTRAINT vote_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  -- Ensure one vote per user per vote item
  CONSTRAINT vote_submissions_unique_user_vote UNIQUE (vote_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_votes_created_by ON public.votes(created_by);
CREATE INDEX idx_votes_is_active ON public.votes(is_active);
CREATE INDEX idx_vote_submissions_vote_id ON public.vote_submissions(vote_id);
CREATE INDEX idx_vote_submissions_user_id ON public.vote_submissions(user_id);
CREATE INDEX idx_vote_submissions_submitted_at ON public.vote_submissions(submitted_at);

-- Add comments for documentation
COMMENT ON TABLE public.votes IS 'Stores vote items/questions that users can vote on';
COMMENT ON TABLE public.vote_submissions IS 'Stores user vote submissions with one vote per user per vote item constraint';
COMMENT ON CONSTRAINT vote_submissions_unique_user_vote ON public.vote_submissions IS 'Ensures each user can only vote once per vote item';
