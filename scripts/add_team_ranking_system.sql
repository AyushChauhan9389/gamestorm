-- Migration: Add Team Ranking System
-- Description: Modifies votes table to include team names array and vote_submissions to store team rankings
-- Date: 2025-09-14

-- Add team_names array field to votes table
ALTER TABLE public.votes 
ADD COLUMN team_names text[] NOT NULL DEFAULT '{}';

-- Add ranking_data field to vote_submissions table to store user's team rankings
ALTER TABLE public.vote_submissions 
ADD COLUMN ranking_data jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Add constraint to ensure ranking_data is an array
ALTER TABLE public.vote_submissions 
ADD CONSTRAINT vote_submissions_ranking_data_is_array 
CHECK (jsonb_typeof(ranking_data) = 'array');

-- Create index for better performance on team_names queries
CREATE INDEX idx_votes_team_names ON public.votes USING GIN (team_names);

-- Create index for ranking_data queries
CREATE INDEX idx_vote_submissions_ranking_data ON public.vote_submissions USING GIN (ranking_data);

-- Add comments for documentation
COMMENT ON COLUMN public.votes.team_names IS 'Array of team names that users can rank in this vote';
COMMENT ON COLUMN public.vote_submissions.ranking_data IS 'JSON array storing user rankings of teams in order of preference (first = rank 1, second = rank 2, etc.)';

-- Example usage comment
/*
Example data structure for ranking_data:
["Team Alpha", "Team Beta", "Team Gamma"] 
- Team Alpha is ranked 1st
- Team Beta is ranked 2nd  
- Team Gamma is ranked 3rd
*/
