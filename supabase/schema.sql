-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT UNIQUE,
  name TEXT
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID REFERENCES public.organizations(id),
  email TEXT,
  company_name TEXT
);

-- Workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  start_event TEXT,
  end_event TEXT,
  workflow_data JSONB,
  diagram_data JSONB,
  opportunities TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.workflows(id),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id),
  role TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to assign new users to organizations and profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  org_id UUID;
BEGIN
  email_domain := split_part(NEW.email, '@', 2);

  SELECT id INTO org_id FROM public.organizations WHERE domain = email_domain;

  IF org_id IS NULL THEN
    INSERT INTO public.organizations(domain, name)
    VALUES (email_domain, email_domain)
    RETURNING id INTO org_id;
  END IF;

  INSERT INTO public.profiles(user_id, org_id, email, company_name)
  VALUES (NEW.id, org_id, NEW.email, email_domain);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_after_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organizations
CREATE POLICY "org members read org" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.org_id = organizations.id
    )
  );

-- Profiles
CREATE POLICY "users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Workflows
CREATE POLICY "org members select workflow" ON public.workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.org_id = workflows.org_id
    )
  );

CREATE POLICY "org members insert workflow" ON public.workflows
  FOR INSERT WITH CHECK (
    NEW.org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "org members update workflow" ON public.workflows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.org_id = workflows.org_id
    )
  ) WITH CHECK (
    NEW.org_id = (SELECT org_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "org members delete workflow" ON public.workflows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.org_id = workflows.org_id
    )
  );

-- Conversations
CREATE POLICY "org members select conversation" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.workflows w ON w.id = conversations.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );

CREATE POLICY "org members insert conversation" ON public.conversations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.workflows w ON w.id = NEW.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );

CREATE POLICY "org members update conversation" ON public.conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.workflows w ON w.id = conversations.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.workflows w ON w.id = NEW.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );

CREATE POLICY "org members delete conversation" ON public.conversations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.workflows w ON w.id = conversations.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );

-- Messages
CREATE POLICY "org members select message" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.conversations c ON c.id = messages.conversation_id
      JOIN public.workflows w ON w.id = c.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );

CREATE POLICY "org members insert message" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.conversations c ON c.id = NEW.conversation_id
      JOIN public.workflows w ON w.id = c.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );

CREATE POLICY "org members update message" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.conversations c ON c.id = messages.conversation_id
      JOIN public.workflows w ON w.id = c.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.conversations c ON c.id = NEW.conversation_id
      JOIN public.workflows w ON w.id = c.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );

CREATE POLICY "org members delete message" ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.conversations c ON c.id = messages.conversation_id
      JOIN public.workflows w ON w.id = c.workflow_id
      WHERE p.user_id = auth.uid() AND p.org_id = w.org_id
    )
  );
