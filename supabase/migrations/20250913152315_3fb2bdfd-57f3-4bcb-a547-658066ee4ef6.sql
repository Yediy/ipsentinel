-- Add columns if missing
ALTER TABLE filings ADD COLUMN IF NOT EXISTS abstract text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS background text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS detailed_description text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS claims text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS features text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS prior_art text;

-- CN type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='cn_type') THEN
    CREATE TYPE cn_type AS ENUM ('invention','utility_model','design');
  END IF;
END $$;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS cn_type cn_type DEFAULT 'invention';

-- Trademark fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='mark_type') THEN
    CREATE TYPE mark_type AS ENUM ('word','device','combined');
  END IF;
END $$;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS tm_mark_text text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS tm_mark_type mark_type DEFAULT 'word';
ALTER TABLE filings ADD COLUMN IF NOT EXISTS tm_mark_image_url text;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS tm_classes jsonb;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS tm_cn_subclasses jsonb;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS tm_specimens jsonb;

-- Deadlines
ALTER TABLE filings ADD COLUMN IF NOT EXISTS pct_national_deadline date;
ALTER TABLE filings ADD COLUMN IF NOT EXISTS paris_deadline date;

-- Documents dedupe index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='ux_documents_filing_sha256'
  ) THEN
    CREATE UNIQUE INDEX ux_documents_filing_sha256
      ON documents(filing_id, sha256)
      WHERE sha256 is not null;
  END IF;
END $$;

-- BACKFILL from filing_sections (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='filing_sections') THEN
    -- abstract
    UPDATE filings f SET abstract = s.content
      FROM (
        SELECT filing_id, MAX(content) as content FROM filing_sections
        WHERE section_key IN ('abstract')
        GROUP BY filing_id
      ) s
      WHERE f.id = s.filing_id AND COALESCE(f.abstract,'') = '';

    -- background
    UPDATE filings f SET background = s.content
      FROM (
        SELECT filing_id, MAX(content) as content FROM filing_sections
        WHERE section_key IN ('background')
        GROUP BY filing_id
      ) s
      WHERE f.id = s.filing_id AND COALESCE(f.background,'') = '';

    -- summary
    UPDATE filings f SET summary = s.content
      FROM (
        SELECT filing_id, MAX(content) as content FROM filing_sections
        WHERE section_key IN ('summary')
        GROUP BY filing_id
      ) s
      WHERE f.id = s.filing_id AND COALESCE(f.summary,'') = '';

    -- detailed_description
    UPDATE filings f SET detailed_description = s.content
      FROM (
        SELECT filing_id, STRING_AGG(content, E'\n\n' ORDER BY order_index NULLS LAST) as content
        FROM filing_sections
        WHERE section_key IN ('description','spec')
        GROUP BY filing_id
      ) s
      WHERE f.id = s.filing_id AND COALESCE(f.detailed_description,'') = '';

    -- claims (join lines)
    UPDATE filings f SET claims = s.content
      FROM (
        SELECT filing_id, STRING_AGG(content, E'\n' ORDER BY order_index NULLS LAST) as content
        FROM filing_sections
        WHERE section_key='claims'
        GROUP BY filing_id
      ) s
      WHERE f.id = s.filing_id AND COALESCE(f.claims,'') = '';

    -- features
    UPDATE filings f SET features = s.content
      FROM (
        SELECT filing_id, MAX(content) as content FROM filing_sections
        WHERE section_key='features'
        GROUP BY filing_id
      ) s
      WHERE f.id = s.filing_id AND COALESCE(f.features,'') = '';

    -- prior_art
    UPDATE filings f SET prior_art = s.content
      FROM (
        SELECT filing_id, MAX(content) as content FROM filing_sections
        WHERE section_key='prior_art'
        GROUP BY filing_id
      ) s
      WHERE f.id = s.filing_id AND COALESCE(f.prior_art,'') = '';
  END IF;
END $$;