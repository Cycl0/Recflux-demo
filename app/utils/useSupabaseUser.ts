import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useSupabaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);

  const fetchUserCredits = async (userEmail: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('credits')
        .eq('email', userEmail)
        .single();
      
      if (error) {
        console.error('Error fetching user credits:', error);
        setCredits(0);
      } else {
        setCredits(userData?.credits || 0);
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setCredits(0);
    } finally {
      setCreditsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (mounted) {
        const authUser = data?.user || null;
        setUser(authUser);
        setLoading(false);
        
        if (authUser?.email) {
          fetchUserCredits(authUser.email);
        } else {
          setCreditsLoading(false);
        }
      }
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user || null;
      setUser(authUser);
      setLoading(false);
      
      if (authUser?.email) {
        setCreditsLoading(true);
        fetchUserCredits(authUser.email);
      } else {
        setCredits(null);
        setCreditsLoading(false);
      }
    });
    
    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, credits, creditsLoading, refetchCredits: user?.email ? () => fetchUserCredits(user.email) : () => {} };
} 