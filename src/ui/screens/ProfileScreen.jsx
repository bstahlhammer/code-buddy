import { useState } from 'react'
import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'
import ScoreBar from '../components/ScoreBar.jsx'
import { nearestTasteProfile } from '@/core/api'
import { useTasteProfileSync } from '../hooks/useTasteProfileSync.js'
import { supabase } from '@/integrations/supabase/client'

const AXES = [
  { key: 'body',      label: 'Body' },
  { key: 'sweetness', label: 'Sweetness' },
  { key: 'tannin',    label: 'Tannin' },
  { key: 'acidity',   label: 'Acidity' },
]

export default function ProfileScreen({
  navigate, goBack, auth, tasteProfile, onProfileUpdate,
}) {
  const { saveProfile } = useTasteProfileSync()
  const [palate, setPalate] = useState(tasteProfile?.palate || { body: 50, sweetness: 30, tannin: 50, acidity: 55 })
  const [displayName, setDisplayName] = useState(auth?.profile?.display_name || '')
  const [savingTune, setSavingTune] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function flash(msg) { setToast(msg); setTimeout(() => setToast(null), 2000) }

  function updateAxis(key, value) {
    setPalate(p => ({ ...p, [key]: Number(value) }))
  }

  async function handleSaveTune() {
    if (!tasteProfile) return
    setSavingTune(true)
    const archetype = nearestTasteProfile(palate)
    const updated = { ...tasteProfile, ...archetype, palate }
    await saveProfile(updated, { refined: true })
    onProfileUpdate?.(updated)
    setSavingTune(false)
    flash('Palate updated')
  }

  async function handleSaveName() {
    if (!auth?.user?.id) return
    setSavingName(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', auth.user.id)
    setSavingName(false)
    flash(error ? 'Could not save' : 'Name updated')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Delete failed')
      await supabase.auth.signOut()
      navigate('home')
    } catch (e) {
      flash('Could not delete account')
    } finally {
      setDeleting(false)
    }
  }

  if (!tasteProfile) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
        <div style={{ backgroundColor: theme.colors.brandDark }}>
          <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, textAlign: 'center', gap: theme.spacing.md }}>
          <div style={{ fontFamily: theme.typography.fontSerif, fontStyle: 'italic', fontSize: theme.typography.sizes.xxl, color: theme.colors.text }}>
            No taste profile yet
          </div>
          <div style={{ fontFamily: theme.typography.fontSans, color: theme.colors.textMuted, fontSize: theme.typography.sizes.md, maxWidth: 280 }}>
            Take the quick guided tasting to unlock personalized matches.
          </div>
          <button
            onClick={() => navigate('quizIntro')}
            style={primaryBtn()}
          >
            Help me find wines I'll love
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl} ${theme.spacing.lg}` }}>
          <div style={{
            fontSize: theme.typography.sizes.xs, color: theme.colors.gold,
            fontFamily: theme.typography.fontSans, fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: theme.spacing.sm,
          }}>
            Your palate
          </div>
          <h1 style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.xl,
            fontStyle: 'italic', fontWeight: 400, color: theme.colors.cream, margin: 0,
          }}>
            {tasteProfile.name}
          </h1>
          {tasteProfile.description && (
            <p style={{
              margin: `${theme.spacing.xs} 0 0`,
              color: `${theme.colors.cream}b0`,
              fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.sm,
              lineHeight: 1.4,
            }}>
              {tasteProfile.description}
            </p>
          )}
        </div>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        {/* Snapshot */}
        <SectionLabel>Current palate</SectionLabel>
        <ScoreBar label="Body"      value={tasteProfile.palate.body} />
        <ScoreBar label="Sweetness" value={tasteProfile.palate.sweetness} />
        <ScoreBar label="Tannin"    value={tasteProfile.palate.tannin} />
        <ScoreBar label="Acidity"   value={tasteProfile.palate.acidity} />

        {/* Fine tune */}
        <div style={{ marginTop: theme.spacing.xl }}>
          <SectionLabel>Fine-tune</SectionLabel>
          <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.md }}>
            Nudge each axis to match what you've been loving lately.
          </div>
          {AXES.map(a => (
            <div key={a.key} style={{ marginBottom: theme.spacing.md }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm, marginBottom: 4, color: theme.colors.text }}>
                <span>{a.label}</span>
                <span style={{ color: theme.colors.textMuted }}>{palate[a.key]}</span>
              </div>
              <input
                type="range" min="0" max="100" value={palate[a.key]}
                onChange={e => updateAxis(a.key, e.target.value)}
                style={{ width: '100%', accentColor: theme.colors.ember }}
              />
            </div>
          ))}
          <button
            onClick={handleSaveTune}
            disabled={savingTune}
            style={primaryBtn()}
          >
            {savingTune ? 'Saving…' : 'Save palate'}
          </button>
          <button
            onClick={() => navigate('quizIntro')}
            style={secondaryLink()}
          >
            Or retake the guided tasting →
          </button>
        </div>

        {/* Account */}
        <div style={{ marginTop: theme.spacing.xxl }}>
          <SectionLabel>Account</SectionLabel>
          <div style={{ marginBottom: theme.spacing.sm, fontSize: theme.typography.sizes.sm, fontFamily: theme.typography.fontSans, color: theme.colors.textMuted }}>
            Signed in as {auth?.user?.email}
          </div>
          <label style={{ display: 'block', fontSize: theme.typography.sizes.xs, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Display name
          </label>
          <div style={{ display: 'flex', gap: theme.spacing.xs }}>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.md,
                backgroundColor: '#fff',
              }}
            />
            <button onClick={handleSaveName} disabled={savingName} style={{ ...primaryBtn(), width: 'auto', padding: '10px 16px', marginTop: 0 }}>
              {savingName ? '…' : 'Save'}
            </button>
          </div>

          <div style={{ marginTop: theme.spacing.lg, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
            <button onClick={() => auth?.signOut()} style={secondaryBtn()}>
              Sign out
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={dangerLink()}>
                Delete my account and data
              </button>
            ) : (
              <div style={{ border: `1px solid ${theme.colors.crimson}50`, borderRadius: theme.radius.sm, padding: theme.spacing.md, backgroundColor: `${theme.colors.crimson}10` }}>
                <div style={{ fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm, color: theme.colors.text, marginBottom: theme.spacing.sm }}>
                  This permanently deletes your taste profile, scan history, and account. There's no undo.
                </div>
                <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                  <button onClick={handleDeleteAccount} disabled={deleting} style={{ ...primaryBtn(), backgroundColor: theme.colors.crimson, marginTop: 0, flex: 1 }}>
                    {deleting ? 'Deleting…' : 'Yes, delete everything'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} style={{ ...secondaryBtn(), marginTop: 0, flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: theme.colors.brandDark, color: theme.colors.cream,
            padding: '8px 16px', borderRadius: theme.radius.pill,
            fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm,
            zIndex: 100,
          }}>
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: theme.typography.sizes.xs, color: theme.colors.ember,
      fontFamily: theme.typography.fontSans, fontWeight: 500,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      marginBottom: theme.spacing.sm,
    }}>{children}</div>
  )
}
function primaryBtn() {
  return {
    width: '100%',
    padding: '14px',
    marginTop: theme.spacing.md,
    background: `linear-gradient(135deg, ${theme.colors.ember}, ${theme.colors.emberBright})`,
    color: theme.colors.cream,
    border: 'none',
    borderRadius: theme.radius.md,
    fontFamily: "'Inter', sans-serif",
    fontSize: 15, fontWeight: 500,
    cursor: 'pointer',
  }
}
function secondaryBtn() {
  return {
    width: '100%', padding: '12px',
    background: 'transparent',
    color: theme.colors.brand,
    border: `1px solid ${theme.colors.brand}`,
    borderRadius: theme.radius.md,
    fontFamily: "'Inter', sans-serif", fontSize: 14, cursor: 'pointer',
  }
}
function secondaryLink() {
  return {
    display: 'block', margin: '8px auto 0', background: 'none', border: 'none',
    color: theme.colors.textMuted,
    fontFamily: "'Inter', sans-serif", fontSize: 13,
    textDecoration: 'underline', textUnderlineOffset: 3,
    cursor: 'pointer', padding: 6,
  }
}
function dangerLink() {
  return {
    width: '100%', background: 'none', border: 'none',
    color: theme.colors.crimson,
    fontFamily: "'Inter', sans-serif", fontSize: 13,
    textDecoration: 'underline', textUnderlineOffset: 3,
    cursor: 'pointer', padding: 8,
  }
}
