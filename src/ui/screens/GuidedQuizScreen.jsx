import { useState, useMemo } from 'react'
import { theme } from '../theme/theme.js'
import {
  getGuidedInitialNode,
  getGuidedNode,
  getGuidedNextNode,
} from '@/core/api'
import TopBar from '../components/TopBar.jsx'
import QuizOptionCard from '../components/QuizOptionCard.jsx'

/**
 * Branching guided quiz driver.
 *
 * Local state holds:
 *   - `path`: array of visited node ids (back button pops this)
 *   - `answers`: { [nodeId]: { optionId? , optionIds?, notSure? } }
 * On final node completion, calls `onComplete(answers)`.
 */
export default function GuidedQuizScreen({ navigate, goBack, onComplete }) {
  const [path,    setPath]    = useState([getGuidedInitialNode()])
  const [answers, setAnswers] = useState({})

  const currentId = path[path.length - 1]
  const node      = getGuidedNode(currentId)

  // Estimate progress: count of distinct nodes likely to be visited.
  // We approximate by visited + 1 vs visited + remaining-min (4) for the bar.
  const estimatedTotal = Math.max(path.length + 2, 6)
  const stepIndex      = path.length - 1

  const currentAnswer = answers[currentId]

  const canContinue = useMemo(() => {
    if (!node) return false
    if (node.type === 'multi') {
      return Array.isArray(currentAnswer?.optionIds) && currentAnswer.optionIds.length > 0
    }
    return Boolean(currentAnswer?.optionId)
  }, [node, currentAnswer])

  if (!node) {
    return null
  }

  function handleSingleSelect(opt) {
    setAnswers(prev => ({
      ...prev,
      [currentId]: { optionId: opt.id, notSure: !!opt.notSure },
    }))
  }

  function handleMultiToggle(opt) {
    setAnswers(prev => {
      const existing = prev[currentId]?.optionIds ?? []
      const next = existing.includes(opt.id)
        ? existing.filter(x => x !== opt.id)
        : [...existing, opt.id]
      return { ...prev, [currentId]: { optionIds: next } }
    })
  }

  function handleContinue() {
    const answer = answers[currentId]
    const nextId = getGuidedNextNode(currentId, answer, { ...answers, [currentId]: answer })
    if (nextId) {
      setPath(p => [...p, nextId])
    } else {
      onComplete(answers)
    }
  }

  function handleBack() {
    if (path.length > 1) {
      setPath(p => p.slice(0, -1))
    } else {
      goBack()
    }
  }

  function handleSkip() {
    // Treat skip as "not sure" if such an option exists; otherwise advance with empty answer.
    const notSureOpt = node.options.find(o => o.notSure)
    let answerForBranch = answers[currentId]
    if (notSureOpt) {
      answerForBranch = { optionId: notSureOpt.id, notSure: true }
      setAnswers(prev => ({ ...prev, [currentId]: answerForBranch }))
    } else if (node.type === 'multi') {
      answerForBranch = { optionIds: [] }
      setAnswers(prev => ({ ...prev, [currentId]: answerForBranch }))
    }
    const nextId = getGuidedNextNode(currentId, answerForBranch, { ...answers, [currentId]: answerForBranch })
    if (nextId) setPath(p => [...p, nextId])
    else onComplete({ ...answers, [currentId]: answerForBranch ?? answers[currentId] })
  }

  const isLast = !node.options.some(o => (typeof o.next === 'function' ? o.next(answers) : o.next))
                  && (typeof node.next === 'function' ? !node.next(answers) : !node.next)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <TopBar onBack={handleBack} onHome={() => navigate('home')} />

      {/* Progress strip */}
      <div style={{ padding: `${theme.spacing.md} ${theme.spacing.lg} 0` }}>
        <div style={{ height: 3, borderRadius: 2, backgroundColor: theme.colors.barTrack }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, ((stepIndex + 1) / estimatedTotal) * 100)}%`,
              background: `linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright})`,
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Header */}
      <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.md}` }}>
        <div
          style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.gold,
            fontFamily: theme.typography.fontSans,
            fontWeight: theme.typography.weights.medium,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: theme.spacing.sm,
          }}
        >
          Level {node.level} · {node.levelLabel}
        </div>
        <h2
          style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.xxl,
            color: theme.colors.text,
            fontWeight: theme.typography.weights.normal,
            lineHeight: 1.2,
            marginBottom: theme.spacing.sm,
          }}
        >
          {node.question}
        </h2>
        {node.subtitle && (
          <p
            style={{
              fontSize: theme.typography.sizes.md,
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontSans,
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            {node.subtitle}
          </p>
        )}
      </div>

      {/* Options */}
      <div
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.sm,
        }}
      >
        {node.options.map(opt => {
          const selected = node.type === 'multi'
            ? Boolean(currentAnswer?.optionIds?.includes(opt.id))
            : currentAnswer?.optionId === opt.id
          return (
            <QuizOptionCard
              key={opt.id}
              label={opt.label}
              hint={opt.hint}
              selected={selected}
              onClick={() => node.type === 'multi'
                ? handleMultiToggle(opt)
                : handleSingleSelect(opt)
              }
            />
          )
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: theme.spacing.lg,
          borderTop: `0.5px solid ${theme.colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.sm,
        }}
      >
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            width: '100%',
            padding: '16px',
            background: canContinue
              ? `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`
              : theme.colors.border,
            color: canContinue ? theme.colors.brandDark : theme.colors.textMuted,
            border: 'none',
            borderRadius: theme.radius.sm,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: theme.typography.fontSans,
            cursor: canContinue ? 'pointer' : 'not-allowed',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: canContinue ? theme.shadows.brass : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          {isLast ? 'See my taste profile' : 'Continue'}
        </button>

        <button
          onClick={handleSkip}
          style={{
            background: 'none',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            padding: theme.spacing.xs,
          }}
        >
          Not sure, skip this question
        </button>
      </div>
    </div>
  )
}
