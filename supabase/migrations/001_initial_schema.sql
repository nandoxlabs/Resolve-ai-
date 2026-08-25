-- ==========================================
-- RESOLVE AI: Initial Database Schema
-- ==========================================
-- This migration creates all tables and enables Row Level Security (RLS)
-- Run this in Supabase SQL Editor BEFORE deploying app

-- ==========================================
-- 1. ORGANIZATIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations are visible to their members only
CREATE POLICY "organizations_visible_to_members" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Only admins can update organization
CREATE POLICY "organizations_update_by_admin" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ==========================================
-- 2. USERS TABLE (extends Supabase auth)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  image TEXT,
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Users can read profiles from same organization
CREATE POLICY "users_read_org_members" ON public.users
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- ==========================================
-- 3. COMPLAINTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'EMAIL', 'WHATSAPP', 'GOOGLE_REVIEW', 'INSTAGRAM', 'FACEBOOK', 'WEBSITE', 'VOICE')),
  
  -- Status & Priority
  status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_TRIAGE', 'RESOLVED')),
  priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  
  -- Customer info (NEW FIELDS from TASK 1)
  customer_name TEXT,
  customer_contact TEXT,
  department TEXT,
  satisfaction_score INT CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10),
  
  -- Duplicate handling (NEW FIELDS from TASK 1)
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_of_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  
  -- Resolution (NEW FIELDS from TASK 1)
  resolution_notes TEXT,
  expected_resolution_date TIMESTAMP WITH TIME ZONE,
  actual_resolution_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata (NEW FIELDS from TASK 1)
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  has_legal_implications BOOLEAN DEFAULT false,
  
  -- Relations
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_priority ON public.complaints(priority);
CREATE INDEX idx_complaints_source ON public.complaints(source);
CREATE INDEX idx_complaints_organization_id ON public.complaints(organization_id);
CREATE INDEX idx_complaints_is_duplicate ON public.complaints(is_duplicate);
CREATE INDEX idx_complaints_has_legal ON public.complaints(has_legal_implications);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at DESC);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Users can read complaints from their organization
CREATE POLICY "complaints_read_org" ON public.complaints
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Users can create complaints in their organization
CREATE POLICY "complaints_create_org" ON public.complaints
  FOR INSERT WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND created_by_id = auth.uid()
  );

-- Users can update complaints they created or are admins
CREATE POLICY "complaints_update_own" ON public.complaints
  FOR UPDATE USING (
    created_by_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Users can delete complaints they created or are admins
CREATE POLICY "complaints_delete_own" ON public.complaints
  FOR DELETE USING (
    created_by_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ==========================================
-- 4. AI_ANALYSIS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID UNIQUE NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  
  model_name TEXT,
  sentiment TEXT DEFAULT 'NEUTRAL' CHECK (sentiment IN ('NEGATIVE', 'NEUTRAL', 'POSITIVE')),
  sentiment_score FLOAT,
  
  root_cause TEXT,
  legal_risk_level TEXT DEFAULT 'LOW' CHECK (legal_risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  
  executive_summary TEXT,
  suggested_response TEXT,
  confidence_score FLOAT,
  
  processing_time_ms INT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_analyses_complaint_id ON public.ai_analyses(complaint_id);
CREATE INDEX idx_ai_analyses_sentiment ON public.ai_analyses(sentiment);
CREATE INDEX idx_ai_analyses_legal_risk ON public.ai_analyses(legal_risk_level);

ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;

-- Users can read AI analysis for complaints in their organization
CREATE POLICY "ai_analyses_read_org" ON public.ai_analyses
  FOR SELECT USING (
    complaint_id IN (
      SELECT id FROM public.complaints WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- ==========================================
-- 5. AUDIT LOG TABLE (Optional but recommended)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read audit logs for their organization's activities
CREATE POLICY "audit_logs_read_org" ON public.audit_logs
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    ))
  );

-- ==========================================
-- 6. HELPER FUNCTIONS
-- ==========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_analyses_updated_at BEFORE UPDATE ON public.ai_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 7. GRANT PERMISSIONS
-- ==========================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.ai_analyses TO authenticated;
