import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
// @ts-expect-error - JS theme module
import { theme } from '@/ui/theme/theme.js'
// @ts-expect-error - JS hook module
import { useAuth } from '@/ui/hooks/useAuth.js'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/account')({
  head: () => ({
    meta: [
      { title: 'Account, Wine Flight' },
      { name: 'description', content: 'Manage your Wine Flight account, sign out, or permanently delete your data.' },
    ],
  }),
  component: AccountPage,
})

function AccountPage() {
  const auth = useAuth() as {
    user: { email?: string; id: string } | null
    profile: { display_name?: string; avatar_url?: string } | null
    loading: boolean
    signOut: () => Promise<void>
  }
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const user = auth.user
  const displayName = auth.profile?.display_name || user?.email || 'Guest'

  async function handleDelete() {
    if (confirmText !== 'DELETE') {
      setError('Type DELETE to confirm.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Session expired, please sign in again.')

      const { error: fnErr } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (fnErr) throw fnErr

      await supabase.auth.signOut()
      navigate({ to: '/' })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not delete account'
      setError(msg)
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at top, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 70%)`,
      fontFamily: theme.typography.fontSans,
      color: theme.colors.parchment,
      padding: '32px 20px 80px',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <Link to="/" style={{
          display: 'inline-block', marginBottom: 32,
          color: theme.colors.gold, fontSize: 11,
          letterSpacing: '0.2em', textTransform: 'uppercase', textDecoration: 'none',
        }}>
          ← Back to Wine Flight
        </Link>

        <div style={{ fontSize: 10, letterSpacing: '0.32em', color: theme.colors.gold, textTransform: 'uppercase', marginBottom: 8 }}>
          Your Cellar Pass
        </div>
        <h1 style={{
          fontFamily: theme.typography.fontDisplay,
          fontSize: 44, fontStyle: 'italic',
          color: theme.colors.cream, margin: 0,
          letterSpacing: '0.02em', lineHeight: 1.05,
        }}>
          Account
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 32px' }}>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}, transparent)` }} />
          <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.colors.gold }} />
          <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}, transparent)` }} />
        </div>

        {auth.loading ? (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        ) : !user ? (
          <div>
            <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              You&rsquo;re not signed in. Sign in to view your account, your taste profile, and
              the wines you&rsquo;ve rated.
            </p>
            <Link to="/" style={{
              display: 'inline-block', padding: '14px 22px',
              background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold})`,
              color: theme.colors.brandDark, textDecoration: 'none',
              borderRadius: theme.radius.sm, fontSize: 13, fontWeight: 600,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              boxShadow: theme.shadows.brass,
            }}>
              Go to Home
            </Link>
          </div>
        ) : (
          <>
            {/* Profile card */}
            <section style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${theme.colors.gold}40`,
              borderRadius: theme.radius.md,
              padding: 20, marginBottom: 24,
            }}>
              <div style={{ fontSize: 11, letterSpacing: '0.2em', color: theme.colors.gold, textTransform: 'uppercase', marginBottom: 10 }}>
                Signed in as
              </div>
              <div style={{ fontFamily: theme.typography.fontDisplay, fontStyle: 'italic', fontSize: 26, color: theme.colors.cream, marginBottom: 4 }}>
                {displayName}
              </div>
              <div style={{ fontSize: 13, opacity: 0.75 }}>{user.email}</div>

              <button
                onClick={() => auth.signOut()}
                style={{
                  marginTop: 20, padding: '12px 18px',
                  background: 'transparent',
                  border: `1px solid ${theme.colors.gold}80`,
                  borderRadius: theme.radius.sm,
                  color: theme.colors.gold,
                  fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </section>

            {/* Danger zone */}
            <section style={{
              background: 'rgba(140, 45, 45, 0.08)',
              border: `1px solid #8C2D2D80`,
              borderRadius: theme.radius.md,
              padding: 20,
            }}>
              <div style={{ fontSize: 11, letterSpacing: '0.2em', color: '#E8B4B4', textTransform: 'uppercase', marginBottom: 10 }}>
                Danger zone
              </div>
              <h2 style={{
                fontFamily: theme.typography.fontDisplay, fontStyle: 'italic',
                fontSize: 22, color: theme.colors.cream, margin: '0 0 8px',
              }}>
                Delete account
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                Permanently removes your profile, taste profile, ratings, and quiz answers.
                This cannot be undone.
              </p>

              <label style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.colors.gold, display: 'block', marginBottom: 8 }}>
                Type <strong style={{ color: theme.colors.cream }}>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'rgba(0,0,0,0.25)',
                  border: `1px solid ${theme.colors.gold}55`,
                  borderRadius: theme.radius.sm,
                  color: theme.colors.cream,
                  fontFamily: theme.typography.fontSans, fontSize: 14,
                  outline: 'none', marginBottom: 16,
                }}
              />

              {error && (
                <div style={{ color: '#E8B4B4', fontSize: 13, marginBottom: 12 }}>{error}</div>
              )}

              <button
                onClick={handleDelete}
                disabled={busy || confirmText !== 'DELETE'}
                style={{
                  padding: '14px 20px',
                  background: confirmText === 'DELETE' ? '#8C2D2D' : 'rgba(140,45,45,0.4)',
                  color: theme.colors.cream,
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  cursor: busy ? 'wait' : (confirmText === 'DELETE' ? 'pointer' : 'not-allowed'),
                  opacity: busy ? 0.7 : 1,
                }}
              >
                {busy ? 'Deleting…' : 'Permanently delete account'}
              </button>
            </section>
          </>
        )}

        <div style={{
          marginTop: 56, paddingTop: 24,
          borderTop: `1px solid ${theme.colors.gold}40`,
          display: 'flex', gap: 20, flexWrap: 'wrap',
          fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          <Link to="/privacy" style={{ color: theme.colors.gold, textDecoration: 'none' }}>Privacy</Link>
          <Link to="/terms" style={{ color: theme.colors.gold, textDecoration: 'none' }}>Terms</Link>
          <a href="mailto:brian@forgeproductstrategy.com" style={{ color: theme.colors.gold, textDecoration: 'none', marginLeft: 'auto' }}>
            Contact
          </a>
        </div>
      </div>
    </div>
  )
}
