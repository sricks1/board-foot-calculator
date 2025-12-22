-- Migration: Add species column to boards and cut_pieces tables
-- Run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Add species column to boards table
ALTER TABLE boards ADD COLUMN IF NOT EXISTS species TEXT;

-- Add species column to cut_pieces table
ALTER TABLE cut_pieces ADD COLUMN IF NOT EXISTS species TEXT;
