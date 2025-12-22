-- Board Foot Calculator - Supabase Schema
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Enable Row Level Security
-- Projects table
CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  workflow TEXT DEFAULT 'calculate',
  cut_plan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boards table (stock boards)
CREATE TABLE boards (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  length DECIMAL NOT NULL,
  width DECIMAL NOT NULL,
  thickness TEXT NOT NULL,
  thickness_inches DECIMAL NOT NULL,
  species TEXT,
  quantity INTEGER DEFAULT 1,
  board_feet_per_piece DECIMAL NOT NULL,
  board_feet DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cut pieces table
CREATE TABLE cut_pieces (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  length DECIMAL NOT NULL,
  width DECIMAL NOT NULL,
  thickness TEXT NOT NULL,
  species TEXT,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cut_pieces ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for boards (through project ownership)
CREATE POLICY "Users can view boards of their projects" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = boards.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert boards to their projects" ON boards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = boards.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update boards of their projects" ON boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = boards.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete boards of their projects" ON boards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = boards.project_id AND projects.user_id = auth.uid()
    )
  );

-- RLS Policies for cut_pieces (through project ownership)
CREATE POLICY "Users can view cut_pieces of their projects" ON cut_pieces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cut_pieces to their projects" ON cut_pieces
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cut_pieces of their projects" ON cut_pieces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cut_pieces of their projects" ON cut_pieces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_boards_project_id ON boards(project_id);
CREATE INDEX idx_cut_pieces_project_id ON cut_pieces(project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
