-- Add new enums for international filing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'filing_route') THEN
    CREATE TYPE filing_route AS ENUM ('national','pct','paris','madrid');
  END IF;
END $$;

-- Add international filing fields to filings table
ALTER TABLE filings ADD COLUMN IF NOT EXISTS route filing_route DEFAULT 'national';
ALTER TABLE filings ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';
ALTER TABLE filings ADD COLUMN IF NOT EXISTS needs_translation boolean DEFAULT false;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS translation_status text DEFAULT 'none';

-- Agent fields
ALTER TABLE filings ADD COLUMN IF NOT EXISTS agent_required boolean DEFAULT false;
ALTER TABLE filings ADD COLUMN if NOT EXISTS agent_assigned boolean DEFAULT false;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS agent_contact text;

-- PCT fields  
ALTER TABLE filings ADD COLUMN IF NOT EXISTS pct_app_no text;

-- Create deadlines table for international deadline management
CREATE TABLE IF NOT EXISTS deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id uuid NOT NULL REFERENCES filings(id) ON DELETE CASCADE,
  label text NOT NULL,
  due_on date NOT NULL,
  done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on deadlines table
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for deadlines
CREATE POLICY "Users can view their deadlines" 
ON deadlines FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM filings f 
  WHERE f.id = filing_id 
  AND ((auth.uid() = f.user_id) OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL)))
));

CREATE POLICY "Users can insert their deadlines" 
ON deadlines FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM filings f 
  WHERE f.id = filing_id 
  AND auth.uid() = f.user_id
));

CREATE POLICY "Users can update their deadlines" 
ON deadlines FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM filings f 
  WHERE f.id = filing_id 
  AND ((auth.uid() = f.user_id) OR ((f.user_id IS NULL) AND (f.contact_email IS NOT NULL)))
));

CREATE POLICY "Service role can manage deadlines" 
ON deadlines FOR ALL 
USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_deadlines_filing_id ON deadlines(filing_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_on ON deadlines(due_on);