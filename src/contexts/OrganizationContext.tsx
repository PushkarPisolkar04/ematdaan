import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  settings: any;
  subscription_tier: string;
  max_users: number;
  max_elections: number;
  is_active: boolean;
}

interface OrganizationContextType {
  organization: Organization | null;
  setOrganization: (org: Organization | null) => void;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
  organizationSlug?: string;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ 
  children, 
  organizationSlug 
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = async (slug: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Organization not found');
      }

      setOrganization(data);
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organization');
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshOrganization = async () => {
    if (organization?.slug) {
      await fetchOrganization(organization.slug);
    }
  };

  useEffect(() => {
    if (organizationSlug) {
      fetchOrganization(organizationSlug);
    } else {
      // Try to get from URL or localStorage
      const slugFromUrl = window.location.hostname.split('.')[0];
      if (slugFromUrl && slugFromUrl !== 'localhost' && slugFromUrl !== 'www') {
        fetchOrganization(slugFromUrl);
      } else {
        // No organization found - this is expected for the main SaaS landing
        setLoading(false);
        setOrganization(null);
      }
    }
  }, [organizationSlug]);

  const value: OrganizationContextType = {
    organization,
    setOrganization,
    loading,
    error,
    refreshOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}; 