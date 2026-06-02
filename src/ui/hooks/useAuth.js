import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
export function useAuth() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set up listener FIRST, then fetch session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) setProfile(null)
    })
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load profile when session changes
  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!cancelled) setProfile(data ?? null)
    })()
    return () => { cancelled = true }
  }, [session?.user?.id])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return error ? { error } : {}
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }, [])

  const signUpWithEmail = useCallback(async (email, password, displayName) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: displayName },
      },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}
