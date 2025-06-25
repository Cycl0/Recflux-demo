import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useSupabaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const fetchUserData = async (userEmail: string, retryCount = 0) => {
    setCreditsLoading(true);
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('credits, plan')
        .eq('email', userEmail)
        .single();
      
      if (error) {
        // If user not found and this is the first try, retry after a delay
        // This handles the case where user registration is still in progress
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log(`User not found, retrying in ${(retryCount + 1) * 1000}ms...`);
          setTimeout(() => {
            fetchUserData(userEmail, retryCount + 1);
          }, (retryCount + 1) * 1000);
          return;
        }
        
        console.error('Error fetching user data:', error);
        setCredits(0);
        setSubscriptionStatus(null);
        setCreditsLoading(false);
      } else {
        console.log('User data fetched successfully:', userData);
        setCredits(userData?.credits || 0);
        setSubscriptionStatus(userData?.plan || null);
        setCreditsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setCredits(0);
      setSubscriptionStatus(null);
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
    
    // Listen for custom refresh events
    const handleRefreshCredits = () => {
      if (user?.email) {
        console.log('Refreshing credits due to custom event');
        fetchUserData(user.email);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('refreshCredits', handleRefreshCredits);
    }
    
    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('refreshCredits', handleRefreshCredits);
      }
    };
  }, [user?.email]);

  return { user, loading, credits, creditsLoading, subscriptionStatus, refetchCredits: user?.email ? () => fetchUserData(user.email) : () => {} };
} 