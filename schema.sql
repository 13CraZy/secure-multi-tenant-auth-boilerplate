-- ==========================================================
-- SECURE MULTI-TENANT AUTH BOILERPLATE
-- PostgreSQL Database Schema & Security RLS Setup (V2.0 Hardened)
-- Optimized for Supabase Database SQL Editor
-- ==========================================================

-- ----------------------------------------------------------
-- 0. CLEANUP / DROP EXISTING POLICIES & TRIGGERS (For updates)
-- ----------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;

DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view profiles of their org members or own" ON public.profiles;

DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners and Admins can update organization details" ON public.organizations;

DROP POLICY IF EXISTS "Members can view other members in their organization" ON public.organization_members;
DROP POLICY IF EXISTS "Only Owners and Admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Only Owners and Admins can update member roles" ON public.organization_members;
DROP POLICY IF EXISTS "Only Owners and Admins can delete members" ON public.organization_members;

DROP POLICY IF EXISTS "Users can read resources of their organization" ON public.tenant_resources;
DROP POLICY IF EXISTS "Owners and Admins can write resources in their organization" ON public.tenant_resources;
DROP POLICY IF EXISTS "Owners and Admins can update resources in their organization" ON public.tenant_resources;
DROP POLICY IF EXISTS "Owners and Admins can delete resources in their organization" ON public.tenant_resources;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------
-- 1. TABLES DEFINITIONS
-- ----------------------------------------------------------

-- PUBLIC PROFILES (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ORGANIZATIONS (The Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    invite_code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ORGANIZATION MEMBERS (RBAC Bridge)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (organization_id, profile_id)
);

-- TENANT PROTECTED RESOURCES (Demo data for RLS validation)
CREATE TABLE IF NOT EXISTS public.tenant_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables (Standard security enforcement)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_resources ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- 2. SECURITY DEFINER HELPER FUNCTIONS (Prevents RLS Recursion)
-- ----------------------------------------------------------

-- Check if user is a member of a specific organization
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, user_id UUID)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = org_id
          AND organization_members.profile_id = user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Check if user has owner/admin privileges in a specific organization
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID, user_id UUID)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = org_id
          AND organization_members.profile_id = user_id
          AND organization_members.role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql;

-- Check if two users share at least one organization (for profile lookup privacy)
CREATE OR REPLACE FUNCTION public.share_organization(user_id_1 UUID, user_id_2 UUID)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.organization_members m1
        JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
        WHERE m1.profile_id = user_id_1 
          AND m2.profile_id = user_id_2
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- 3. AUTOMATIC PROFILE & TENANT OWNER CREATION TRIGGERS
-- ----------------------------------------------------------

-- Trigger: Automatically create profile on user registration
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

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Automatically make organization creator the Tenant Owner (Atomic)
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger AS $$
BEGIN
    -- Only auto-insert owner if trigger is fired from an authenticated client session
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.organization_members (organization_id, profile_id, role)
        VALUES (new.id, auth.uid(), 'owner');
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- ----------------------------------------------------------
-- 4. RPC / API FUNCTIONS (High Security Encapsulation)
-- ----------------------------------------------------------

-- Safe API Join: Check invite code and register member atomically
CREATE OR REPLACE FUNCTION public.join_organization(invite_code_param TEXT)
RETURNS json SECURITY DEFINER AS $$
DECLARE
    org_record RECORD;
    user_id UUID;
    member_id UUID;
BEGIN
    -- Validate current session
    user_id := auth.uid();
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to join an organization';
    END IF;

    -- Find organization by invite code
    SELECT id, name INTO org_record
    FROM public.organizations
    WHERE upper(trim(organizations.invite_code)) = upper(trim(invite_code_param))
    LIMIT 1;

    IF org_record.id IS NULL THEN
        RAISE EXCEPTION 'Invalid invite code. Organization not found';
    END IF;

    -- Check if user is already a member
    IF EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = org_record.id
          AND organization_members.profile_id = user_id
    ) THEN
        RAISE EXCEPTION 'You are already a member of this organization';
    END IF;

    -- Insert member record with default role 'member'
    INSERT INTO public.organization_members (organization_id, profile_id, role)
    VALUES (org_record.id, user_id, 'member')
    RETURNING id INTO member_id;

    RETURN json_build_object(
        'success', true,
        'organization_id', org_record.id,
        'organization_name', org_record.name,
        'member_id', member_id
    );
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------

-- --- PROFILES POLICIES (Hardened) ---
-- Users can only view profiles of people in their organization or their own profile.
-- Prevents harvesting or scraping email lists of other tenants.
CREATE POLICY "Allow users to view profiles of their org members or own" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR public.share_organization(auth.uid(), id)
    );

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);


-- --- ORGANIZATIONS POLICIES ---
-- Users can only see details of organizations they belong to.
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
    FOR SELECT USING (
        public.is_org_member(id, auth.uid())
    );

-- Any authenticated user can create a new organization.
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only Owner and Admin roles can update organization metadata (e.g. name, slug).
CREATE POLICY "Owners and Admins can update organization details" ON public.organizations
    FOR UPDATE USING (
        public.is_org_admin(id, auth.uid())
    );


-- --- ORGANIZATION MEMBERS POLICIES ---
-- Members can only see fellow members belonging to the same organization.
CREATE POLICY "Members can view other members in their organization" ON public.organization_members
    FOR SELECT USING (
        public.is_org_member(organization_id, auth.uid())
    );

-- Only Owner and Admin can manually invite/add members.
CREATE POLICY "Only Owners and Admins can add members" ON public.organization_members
    FOR INSERT WITH CHECK (
        public.is_org_admin(organization_id, auth.uid())
    );

-- Only Owner and Admin can edit roles of other members.
CREATE POLICY "Only Owners and Admins can update member roles" ON public.organization_members
    FOR UPDATE USING (
        public.is_org_admin(organization_id, auth.uid())
    );

-- Only Owner and Admin can delete/kick members.
CREATE POLICY "Only Owners and Admins can delete members" ON public.organization_members
    FOR DELETE USING (
        public.is_org_admin(organization_id, auth.uid())
    );


-- --- TENANT RESOURCES POLICIES ---
-- Isolation: Users can read resources of their organization.
CREATE POLICY "Users can read resources of their organization" ON public.tenant_resources
    FOR SELECT USING (
        public.is_org_member(organization_id, auth.uid())
    );

-- Write: Only Owners and Admins can add resources.
CREATE POLICY "Owners and Admins can write resources in their organization" ON public.tenant_resources
    FOR INSERT WITH CHECK (
        public.is_org_admin(organization_id, auth.uid())
    );

-- Update: Only Owners and Admins can modify resources.
CREATE POLICY "Owners and Admins can update resources in their organization" ON public.tenant_resources
    FOR UPDATE USING (
        public.is_org_admin(organization_id, auth.uid())
    );

-- Delete: Only Owners and Admins can remove resources.
CREATE POLICY "Owners and Admins can delete resources in their organization" ON public.tenant_resources
    FOR DELETE USING (
        public.is_org_admin(organization_id, auth.uid())
    );
