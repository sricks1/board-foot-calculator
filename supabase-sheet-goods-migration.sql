-- Sheet Goods Persistence Migration
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create sheet_goods table
CREATE TABLE sheet_goods (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  thickness TEXT NOT NULL,
  length DECIMAL NOT NULL,
  width DECIMAL NOT NULL,
  quantity INTEGER DEFAULT 1,
  price_per_sheet DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create sheet_cut_pieces table
CREATE TABLE sheet_cut_pieces (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  length DECIMAL NOT NULL,
  width DECIMAL NOT NULL,
  thickness TEXT NOT NULL,
  product_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  grain_direction TEXT DEFAULT 'any',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add sheet_cut_plan column to projects
ALTER TABLE projects ADD COLUMN sheet_cut_plan JSONB;

-- 4. Enable RLS
ALTER TABLE sheet_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_cut_pieces ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for sheet_goods (through project ownership)
CREATE POLICY "Users can view sheet_goods of their projects" ON sheet_goods
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_goods.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sheet_goods to their projects" ON sheet_goods
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_goods.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sheet_goods of their projects" ON sheet_goods
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_goods.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sheet_goods of their projects" ON sheet_goods
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_goods.project_id AND projects.user_id = auth.uid()
    )
  );

-- 6. RLS Policies for sheet_cut_pieces (through project ownership)
CREATE POLICY "Users can view sheet_cut_pieces of their projects" ON sheet_cut_pieces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sheet_cut_pieces to their projects" ON sheet_cut_pieces
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sheet_cut_pieces of their projects" ON sheet_cut_pieces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sheet_cut_pieces of their projects" ON sheet_cut_pieces
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = sheet_cut_pieces.project_id AND projects.user_id = auth.uid()
    )
  );

-- 7. Create indexes
CREATE INDEX idx_sheet_goods_project_id ON sheet_goods(project_id);
CREATE INDEX idx_sheet_cut_pieces_project_id ON sheet_cut_pieces(project_id);
