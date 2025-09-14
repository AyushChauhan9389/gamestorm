-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.form_submissions (
  form_id uuid NOT NULL,
  team_id uuid NOT NULL,
  submitted_by uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submitted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT form_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id),
  CONSTRAINT form_submissions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT form_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id)
);
CREATE TABLE public.forms (
  title text NOT NULL,
  description text,
  updated_at timestamp with time zone,
  created_by uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT forms_pkey PRIMARY KEY (id),
  CONSTRAINT forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.game_answers (
  game_participant_id uuid NOT NULL,
  game_question_id uuid NOT NULL,
  answer_text text,
  answer_index integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_correct boolean NOT NULL DEFAULT false,
  points_earned integer NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  answered_at timestamp with time zone NOT NULL DEFAULT now(),
  time_taken_seconds integer CHECK (time_taken_seconds >= 0),
  CONSTRAINT game_answers_pkey PRIMARY KEY (id),
  CONSTRAINT game_answers_game_participant_id_fkey FOREIGN KEY (game_participant_id) REFERENCES public.game_participants(id),
  CONSTRAINT game_answers_game_question_id_fkey FOREIGN KEY (game_question_id) REFERENCES public.game_questions(id)
);
CREATE TABLE public.game_participants (
  time_remaining_seconds integer,
  is_completed boolean NOT NULL DEFAULT false,
  total_points_earned integer NOT NULL DEFAULT 0 CHECK (total_points_earned >= 0),
  current_question_index integer DEFAULT 0 CHECK (current_question_index >= 0),
  is_online boolean NOT NULL DEFAULT true,
  game_id uuid NOT NULL,
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT game_participants_pkey PRIMARY KEY (id),
  CONSTRAINT game_participants_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id),
  CONSTRAINT game_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.game_questions (
  game_id uuid NOT NULL,
  question_index integer NOT NULL CHECK (question_index >= 0),
  image_url text,
  question_text text NOT NULL,
  updated_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  reveal_time_seconds integer NOT NULL DEFAULT 30 CHECK (reveal_time_seconds > 0),
  total_points_can_be_earned integer NOT NULL DEFAULT 10 CHECK (total_points_can_be_earned > 0),
  question_duration_seconds integer NOT NULL DEFAULT 30 CHECK (question_duration_seconds > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT game_questions_pkey PRIMARY KEY (id),
  CONSTRAINT game_questions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id)
);
CREATE TABLE public.games (
  game_code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  updated_at timestamp with time zone,
  created_by uuid NOT NULL,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'waiting'::text, 'in_progress'::text, 'paused'::text, 'completed'::text, 'cancelled'::text])),
  is_started boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  max_participants integer DEFAULT 50 CHECK (max_participants > 0),
  game_duration_minutes integer DEFAULT 30 CHECK (game_duration_minutes > 0),
  total_questions integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT games_pkey PRIMARY KEY (id),
  CONSTRAINT games_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.mentors (
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT mentors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text,
  handle text UNIQUE,
  mobile text,
  registration_number text,
  is_hosteler boolean,
  hostel_name text,
  room_no text,
  gender text,
  undertaking_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_signed_up_for_red_bull boolean DEFAULT false,
  parent_undertaking_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.redbull_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  image_url_2 text,
  CONSTRAINT redbull_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT redbull_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.rooms (
  name text NOT NULL UNIQUE,
  location text,
  building text,
  floor text,
  amenities ARRAY,
  updated_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity > 0),
  room_type text DEFAULT 'meeting_room'::text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rooms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.team_members (
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member'::text,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.team_room_assignments (
  team_id uuid NOT NULL,
  room_id uuid NOT NULL,
  assigned_by uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_room_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT team_room_assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_room_assignments_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id)
);
CREATE TABLE public.teams (
  name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_finalized boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  mentor_id uuid,
  mentor_assigned_at timestamp with time zone,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT teams_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.mentors(id)
);
CREATE TABLE public.vote_submissions (
  vote_id uuid NOT NULL,
  user_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  ranking_data jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(ranking_data) = 'array'::text),
  CONSTRAINT vote_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT vote_submissions_vote_id_fkey FOREIGN KEY (vote_id) REFERENCES public.votes(id),
  CONSTRAINT vote_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.votes (
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  updated_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  team_names ARRAY NOT NULL DEFAULT '{}'::text[],
  is_started boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT votes_pkey PRIMARY KEY (id),
  CONSTRAINT votes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);