import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useSupabaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const fetchUserData = async (userEmail: string) => {
    setCreditsLoading(true);
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('credits, plan')
        .eq('email', userEmail)
        .single();
      
      if (error) {
        console.error('Error fetching user data:', error);
        setCredits(0);
        setSubscriptionStatus(null);
      } else {
        setCredits(userData?.credits || 0);
        setSubscriptionStatus(userData?.plan || null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setCredits(0);
      setSubscriptionStatus(null);
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
          fetchUserData(authUser.email);
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
        fetchUserData(authUser.email);
      } else {
        setCredits(null);
        setSubscriptionStatus(null);
        setCreditsLoading(false);
      }
    });
    
    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, credits, creditsLoading, subscriptionStatus, refetchCredits: user?.email ? () => fetchUserData(user.email) : () => {} };
} 