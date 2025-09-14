-- Migration: Add Vote Lifecycle Fields
-- Description: Adds is_started and is_completed fields to votes table for managing vote lifecycle
-- Date: 2025-09-14

-- Add is_started field to votes table
ALTER TABLE public.votes 
ADD COLUMN is_started boolean NOT NULL DEFAULT false;

-- Add is_completed field to votes table
ALTER TABLE public.votes 
ADD COLUMN is_completed boolean NOT NULL DEFAULT false;

-- Add started_at and completed_at timestamp fields for tracking
ALTER TABLE public.votes 
ADD COLUMN started_at timestamp with time zone,
ADD COLUMN completed_at timestamp with time zone;

-- Create indexes for better query performance on lifecycle fields
CREATE INDEX idx_votes_is_started ON public.votes(is_started);
CREATE INDEX idx_votes_is_completed ON public.votes(is_completed);
CREATE INDEX idx_votes_started_at ON public.votes(started_at);
CREATE INDEX idx_votes_completed_at ON public.votes(completed_at);

-- Add constraint to ensure logical order of lifecycle states
ALTER TABLE public.votes 
ADD CONSTRAINT votes_lifecycle_logic 
CHECK (
  (is_started = false AND is_completed = false) OR  -- Not started yet
  (is_started = true AND is_completed = false) OR   -- Started but not completed
  (is_started = true AND is_completed = true)       -- Started and completed
);

-- Add constraint to ensure started_at is set when is_started is true
ALTER TABLE public.votes 
ADD CONSTRAINT votes_started_at_required 
CHECK (
  (is_started = false AND started_at IS NULL) OR 
  (is_started = true AND started_at IS NOT NULL)
);

-- Add constraint to ensure completed_at is set when is_completed is true
ALTER TABLE public.votes 
ADD CONSTRAINT votes_completed_at_required 
CHECK (
  (is_completed = false AND completed_at IS NULL) OR 
  (is_completed = true AND completed_at IS NOT NULL)
);

-- Add comments for documentation
COMMENT ON COLUMN public.votes.is_started IS 'Indicates if the vote has been started and users can submit rankings';
COMMENT ON COLUMN public.votes.is_completed IS 'Indicates if the vote has been completed and no more submissions are accepted';
COMMENT ON COLUMN public.votes.started_at IS 'Timestamp when the vote was started';
COMMENT ON COLUMN public.votes.completed_at IS 'Timestamp when the vote was completed';
COMMENT ON CONSTRAINT votes_lifecycle_logic ON public.votes IS 'Ensures votes cannot be completed without being started first';
COMMENT ON CONSTRAINT votes_started_at_required ON public.votes IS 'Ensures started_at timestamp is set when vote is started';
COMMENT ON CONSTRAINT votes_completed_at_required ON public.votes IS 'Ensures completed_at timestamp is set when vote is completed';
