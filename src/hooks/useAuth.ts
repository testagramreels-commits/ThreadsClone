import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore, mapSupabaseUser } from '@/stores/authStore';

export function useAuth() {
  const { user, loading, login, logout, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    // Check existing session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Session error:', error.message);
          // Clear any invalid session
          supabase.auth.signOut();
        }
        if (mounted && session?.user) {
          login(mapSupabaseUser(session.user));
        }
        if (mounted) setLoading(false);
      })
      .catch((error) => {
        console.error('Session check failed:', error);
        if (mounted) setLoading(false);
      });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          login(mapSupabaseUser(session.user));
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          logout();
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          login(mapSupabaseUser(session.user));
        } else if (event === 'USER_DELETED') {
          logout();
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [login, logout, setLoading]);

  return { user, loading, logout };
}
