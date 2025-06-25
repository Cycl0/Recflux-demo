import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useSupabaseUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  const fetchUserData = async (userEmail: string, retryCount = 0, mountedRef: { current: boolean }) => {
    // Check if component is still mounted before starting
    if (!mountedRef.current) return;
    
    setCreditsLoading(true);
    
    // Fallback timeout  to prevent infinite loading (10 seconds max)
    const fallbackTimeout = setTimeout(() => {
      if (mountedRef.current) {
        console.warn('Credits loading timed out after 10 seconds');
        setCreditsLoading(false);
      }
    }, 10000);
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('credits, plan')
        .eq('email', userEmail)
        .single();
      
      // Check if component is still mounted before updating state
      if (!mountedRef.current) return;
      
      if (error) {
        // If user not found and this is the first try, retry after a delay
        // This handles the case where user registration is still in progress
        if (error.code === 'PGRST116' && retryCount < 3) {
          console.log(`User not found, retrying in ${(retryCount + 1) * 1000}ms...`);
          const timeoutId = setTimeout(() => {
            if (mountedRef.current) {
              fetchUserData(userEmail, retryCount + 1, mountedRef);
            }
          }, (retryCount + 1) * 1000);
          
          // Store timeout for cleanup if component unmounts
          if (mountedRef.current && (mountedRef as any).timeouts) {
            (mountedRef as any).timeouts.push(timeoutId);
          }
          return;
        }
        
        console.error('Error fetching user data:', error);
        setCredits(0);
        setSubscriptionStatus(null);
        setCreditsLoading(false);
        clearTimeout(fallbackTimeout);
      } else {
        console.log('User data fetched successfully:', userData);
        setCredits(userData?.credits || 0);
        setSubscriptionStatus(userData?.plan || null);
        setCreditsLoading(false);
        clearTimeout(fallbackTimeout);
      }
    } catch (error) {
      // Check if component is still mounted before updating state
      if (!mountedRef.current) return;
      
      console.error('Error fetching user data:', error);
      setCredits(0);
      setSubscriptionStatus(null);
      setCreditsLoading(false);
      clearTimeout(fallbackTimeout);
    }
  };

  useEffect(() => {
    const mountedRef = { current: true, timeouts: [] as NodeJS.Timeout[] };
    
    supabase.auth.getUser().then(({ data, error }) => {
      if (mountedRef.current) {
        const authUser = data?.user || null;
        setUser(authUser);
        setLoading(false);
        
        if (authUser?.email) {
          fetchUserData(authUser.email, 0, mountedRef);
        } else {
          setCreditsLoading(false);
        }
      }
    });
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mountedRef.current) {
        const authUser = session?.user || null;
        setUser(authUser);
        setLoading(false);
        
        if (authUser?.email) {
          fetchUserData(authUser.email, 0, mountedRef);
        } else {
          setCredits(null);
          setSubscriptionStatus(null);
          setCreditsLoading(false);
        }
      }
    });
    
    // Listen for custom refresh events
    const handleRefreshCredits = () => {
      if (user?.email && mountedRef.current) {
        console.log('Refreshing credits due to custom event');
        fetchUserData(user.email, 0, mountedRef);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('refreshCredits', handleRefreshCredits);
    }
    
    return () => {
      mountedRef.current = false;
      
      // Clear any pending timeouts
      mountedRef.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
      mountedRef.timeouts = [];
      
      authListener?.subscription.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('refreshCredits', handleRefreshCredits);
      }
    };
  }, [user?.email]);

  return { 
    user, 
    loading, 
    credits, 
    creditsLoading, 
    subscriptionStatus, 
    refetchCredits: user?.email ? () => {
      const mountedRef = { current: true };
      fetchUserData(user.email, 0, mountedRef);
    } : () => {} 
  };
} 