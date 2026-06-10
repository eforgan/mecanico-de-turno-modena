-- Schema Definition for Modena Mecánico de Turno

-- 1. Bases Operativas
CREATE TABLE bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL, -- e.g. 'baires', 'dontorcuato'
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Aeronaves (Helicópteros) e Instalaciones
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id uuid REFERENCES bases(id),
  type text NOT NULL, -- 'AIRCRAFT' or 'FACILITY'
  model text, -- 'BO105', 'AW109'
  registration text, -- e.g., 'LV-ABC'
  status text DEFAULT 'OPERATIVE',
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Plantillas de Checklists (ANAC / BARS)
CREATE TABLE checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type text NOT NULL,
  model text,
  version text NOT NULL,
  title text NOT NULL,
  items jsonb NOT NULL, -- array of { id, category, question, isCritical }
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Reportes de Inspección Diaria
CREATE TABLE inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspector_id uuid NOT NULL, -- Auth User ID
  asset_id uuid REFERENCES assets(id),
  base_id uuid REFERENCES bases(id),
  
  -- Pre-filled/Recurring fields
  inspector_name text,
  temperature text,
  pressure text,
  humidity text,
  
  -- GPS Location
  latitude numeric,
  longitude numeric,

  fuel_status text,
  novelties_count integer default 0,
  items_data jsonb,
  activity_comments text,
  status text DEFAULT 'SUBMITTED', -- 'DRAFT', 'SUBMITTED', 'REVIEWED'
  
  -- JSON of the completed items
  completed_items jsonb NOT NULL, -- array of { id, passed, note, photo_url }
  
  -- Attachments
  audio_url text,
  
  created_at timestamp with time zone DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Everyone can view bases" ON bases FOR SELECT USING (true);
CREATE POLICY "Everyone can view assets" ON assets FOR SELECT USING (true);
CREATE POLICY "Everyone can view templates" ON checklist_templates FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reports" ON inspection_reports FOR INSERT WITH CHECK (auth.uid() = inspector_id);
CREATE POLICY "Users can view their own reports" ON inspection_reports FOR SELECT USING (auth.uid() = inspector_id);
