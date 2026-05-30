-- ==========================================
-- SECURE MULTI-TENANT AUTH BOILERPLATE
-- PostgreSQL Database Schema & Security RLS Setup
-- Suitable for Supabase Database SQL Editor
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------
-- 1. TABLES DEFINITIONS
-- ------------------------------------------

-- PUBLIC PROFILES (linked to Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ORGANIZATIONS (The Tenants)
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ORGANIZATION MEMBERS (RBAC Bridge)
CREATE TABLE public.organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (organization_id, profile_id)
);

-- TENANT PROTECTED RESOURCES (Demo data for RLS validation)
CREATE TABLE public.tenant_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ------------------------------------------
-- 2. AUTOMATIC PROFILE SYNCRONIZATION TRIGGER
-- ------------------------------------------

-- Trigger function that runs when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        coalesce(new.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users insert event
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_resources ENABLE ROW LEVEL SECURITY;

-- --- PROFILES POLICIES ---
CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- --- ORGANIZATIONS POLICIES ---
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
              AND organization_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners and Admins can update organization details" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = organizations.id
              AND organization_members.profile_id = auth.uid()
              AND organization_members.role IN ('owner', 'admin')
        )
    );

-- --- ORGANIZATION MEMBERS POLICIES ---
CREATE POLICY "Members can view other members in their organization" ON public.organization_members
    FOR SELECT USING (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
        )
    );

CREATE POLICY "Only Owners and Admins can add members" ON public.organization_members
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
              AND org_id.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Only Owners and Admins can update member roles" ON public.organization_members
    FOR UPDATE USING (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
              AND org_id.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Only Owners and Admins can delete members" ON public.organization_members
    FOR DELETE USING (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
              AND org_id.role IN ('owner', 'admin')
        )
    );

-- --- TENANT RESOURCES POLICIES (Strict isolation) ---
CREATE POLICY "Users can read resources of their organization" ON public.tenant_resources
    FOR SELECT USING (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
        )
    );

CREATE POLICY "Owners and Admins can write resources in their organization" ON public.tenant_resources
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
              AND org_id.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and Admins can update resources in their organization" ON public.tenant_resources
    FOR UPDATE USING (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
              AND org_id.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and Admins can delete resources in their organization" ON public.tenant_resources
    FOR DELETE USING (
        organization_id IN (
            SELECT org_id.organization_id FROM public.organization_members org_id
            WHERE org_id.profile_id = auth.uid()
              AND org_id.role IN ('owner', 'admin')
        )
    );
