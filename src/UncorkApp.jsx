import { useState, useCallback } from 'react'
import {
  inferPalateFromRatings,
  nearestTasteProfile,
  groupRatingsByBucket,
  computePalateFromGuidedAnswers,
} from '@/core/api'
import DeviceFrame from './ui/components/DeviceFrame.jsx'
import ScreenTransition from './ui/components/ScreenTransition.jsx'
import Toast from './ui/components/Toast.jsx'

import HomeScreen from './ui/screens/HomeScreen.jsx'
import ScanPromptScreen from './ui/screens/ScanPromptScreen.jsx'
import ScanningScreen from './ui/screens/ScanningScreen.jsx'
import AnonResultsScreen from './ui/screens/AnonResultsScreen.jsx'
import QuizIntroScreen from './ui/screens/QuizIntroScreen.jsx'
import QuizScreen from './ui/screens/QuizScreen.jsx'
import GuidedQuizScreen from './ui/screens/GuidedQuizScreen.jsx'
import RateBottlesScreen from './ui/screens/RateBottlesScreen.jsx'
import ProfileRevealScreen from './ui/screens/ProfileRevealScreen.jsx'
import PersonalizedResultsScreen from './ui/screens/PersonalizedResultsScreen.jsx'
import WineDetailScreen from './ui/screens/WineDetailScreen.jsx'

const INITIAL_QUIZ_ANSWERS = {
  // Free-form quiz (legacy QuizScreen) — still supported
  flavorPreferences: [],
  goToDrink: null,
  mealAppeal: null,
  boldness: 50,
  sweetness: null,
  // Wine-rating path
  wineRatings: {},          // { [wineId]: bucketId }
  // Guided sommelier-style quiz path
  guidedAnswers: {},        // { [nodeId]: { optionId? , optionIds?, notSure? } }
  // legacy fields kept for backwards compatibility
  lovedWineIds: [],
  hatedWineIds: [],
}

const SWEETNESS_MAP = {
  'I love sweet':              80,
  'Slightly sweet is perfect': 55,
  'Dry is fine':               30,
  'Bone dry always':           10,
}

/**
 * Blend up to three signal sources by confidence:
 *   1. Wine ratings        — from inferPalateFromRatings
 *   2. Guided sommelier quiz — from computePalateFromGuidedAnswers
 *   3. Slider/sweetness fallback (legacy quiz) — confidence 0.3 if any answered
 */
function deriveProfile(quizAnswers) {
  const ratings = quizAnswers.wineRatings ?? {}
  const inferredR = inferPalateFromRatings(ratings)

  const guided  = quizAnswers.guidedAnswers ?? {}
  const inferredG = computePalateFromGuidedAnswers(guided)

  // AI free-text describe palate — strong signal when the user confirms it.
  // Weight ~1.5 (same as a couple of rated bottles): meaningful but not
  // overwhelming if the user also rates specific wines.
  const aiPalate = quizAnswers.aiPalate ?? null
  const aiConfidence = aiPalate ? 1.5 : 0

  // Legacy slider/sweetness signal
  const hasSlider = quizAnswers.boldness !== undefined || quizAnswers.sweetness
  const boldness     = quizAnswers.boldness ?? 50
  const sweetnessVal = SWEETNESS_MAP[quizAnswers.sweetness] ?? 30
  const sliderPalate = {
    body:      boldness,
    sweetness: sweetnessVal,
    tannin:    boldness * 0.9,
    acidity:   Math.max(0, 100 - boldness * 0.5),
  }
  const sliderConfidence = hasSlider && quizAnswers.sweetness ? 0.3 : 0

  // Weighted blend across all sources.
  const sources = [
    { palate: inferredR.palate,  weight: inferredR.confidence },
    { palate: inferredG.palate,  weight: inferredG.confidence },
    { palate: aiPalate,          weight: aiConfidence },
    { palate: sliderPalate,      weight: sliderConfidence },
  ].filter(s => s.palate)
  const totalWeight = sources.reduce((s, x) => s + x.weight, 0)

  let palate
  if (totalWeight === 0) {
    palate = { ...sliderPalate }
  } else {
    palate = { body: 0, sweetness: 0, tannin: 0, acidity: 0 }
    for (const { palate: p, weight: w } of sources) {
      palate.body      += p.body      * w
      palate.sweetness += p.sweetness * w
      palate.tannin    += p.tannin    * w
      palate.acidity   += p.acidity   * w
    }
    palate.body      = Math.round(palate.body      / totalWeight)
    palate.sweetness = Math.round(palate.sweetness / totalWeight)
    palate.tannin    = Math.round(palate.tannin    / totalWeight)
    palate.acidity   = Math.round(palate.acidity   / totalWeight)
  }

  const archetype = nearestTasteProfile(palate)
  const ratingsByBucket = groupRatingsByBucket(ratings)

  return {
    ...archetype,
    palate,
    ratingsByBucket,
    inferenceConfidence: Math.min(1, totalWeight),
    flavorCharacter: inferredG.flavorCharacter,
    lovedWineIds: ratingsByBucket.loved ?? [],
    hatedWineIds: ratingsByBucket.hated ?? [],
    hasAiSignal: !!aiPalate,
  }
}

export default function App() {
  const [screen,       setScreen]       = useState('home')
  const [history,      setHistory]      = useState([])
  const [direction,    setDirection]    = useState('forward')
  const [selectedWine, setSelectedWine] = useState(null)
  const [returnScreen, setReturnScreen] = useState('anonResults')
  const [buyingFor,    setBuyingFor]    = useState('me')
  const [quizAnswers,  setQuizAnswers]  = useState(INITIAL_QUIZ_ANSWERS)
  const [tasteProfile, setTasteProfile] = useState(null)
  const [toast,        setToast]        = useState(null)

  const [hasScanned, setHasScanned] = useState(false)
  const [scanFile, setScanFile] = useState(null)
  const [scannedWines, setScannedWines] = useState(null)

  const navigate = useCallback((to) => {
    setDirection('forward')
    setHistory(h => [...h, screen])
    if (to === 'scanning') setHasScanned(true)
    setScreen(to)
  }, [screen])

  const goBack = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setDirection('back')
      setScreen(prev)
      return h.slice(0, -1)
    })
  }, [])

  const handleAnswerChange = useCallback((key, value) => {
    setQuizAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleQuizComplete = useCallback((answers) => {
    const merged = { ...quizAnswers, ...answers }
    setQuizAnswers(merged)
    const profile = deriveProfile(merged)
    setTasteProfile(profile)
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('profileReveal')
  }, [screen, quizAnswers])

  const handleGuidedComplete = useCallback((guidedAnswers) => {
    const merged = { ...quizAnswers, guidedAnswers }
    setQuizAnswers(merged)
    const profile = deriveProfile(merged)
    setTasteProfile(profile)
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('profileReveal')
  }, [screen, quizAnswers])

  const showToast = useCallback((msg) => {
    setToast(msg)
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [])

  const handleWineSelect = useCallback((wine, from) => {
    setSelectedWine(wine)
    setReturnScreen(from)
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('wineDetail')
  }, [screen])

  const handleRate = useCallback((label) => {
    showToast(`${label === 'Love it' ? '❤️' : label === 'Pretty good' ? '👍' : label === 'Not sure' ? '🤷' : '👎'} Saved: ${label}`)
    setTimeout(() => {
      setDirection('back')
      setHistory(h => h.slice(0, -1))
      setScreen(returnScreen)
    }, 1200)
  }, [returnScreen, showToast])

  function renderScreen() {
    const nav = { navigate, goBack }
    switch (screen) {
      case 'home':
        return <HomeScreen {...nav} />
      case 'scanPrompt':
        return (
          <ScanPromptScreen
            {...nav}
            buyingFor={buyingFor}
            onBuyingForChange={setBuyingFor}
            onScan={(file) => { setScanFile(file); setScannedWines(null) }}
          />
        )
      case 'scanning':
        return (
          <ScanningScreen
            {...nav}
            file={scanFile}
            onScanComplete={(wines) => setScannedWines(wines)}
          />
        )
      case 'anonResults':
        return (
          <AnonResultsScreen
            {...nav}
            tasteProfile={tasteProfile}
            scannedWines={scannedWines}
            onWineSelect={w => handleWineSelect(w, 'anonResults')}
          />
        )
      case 'quizIntro':
        return <QuizIntroScreen {...nav} />
      case 'guidedQuiz':
        return (
          <GuidedQuizScreen
            {...nav}
            onComplete={handleGuidedComplete}
          />
        )
      case 'rateBottles':
        return (
          <RateBottlesScreen
            {...nav}
            initialRatings={quizAnswers.wineRatings}
            initialAiPalate={quizAnswers.aiPalate}
            onComplete={handleQuizComplete}
          />
        )
      case 'quiz':
        return (
          <QuizScreen
            {...nav}
            quizAnswers={quizAnswers}
            onAnswerChange={handleAnswerChange}
            onComplete={handleQuizComplete}
          />
        )
      case 'profileReveal':
        return (
          <ProfileRevealScreen
            {...nav}
            tasteProfile={tasteProfile}
            hasScanned={hasScanned}
            onWineSelect={w => handleWineSelect(w, 'profileReveal')}
          />
        )
      case 'personalizedResults':
        return (
          <PersonalizedResultsScreen
            {...nav}
            tasteProfile={tasteProfile}
            buyingFor={buyingFor}
            onWineSelect={w => handleWineSelect(w, 'personalizedResults')}
          />
        )
      case 'wineDetail':
        return (
          <WineDetailScreen
            {...nav}
            wine={selectedWine}
            tasteProfile={tasteProfile}
            onRate={handleRate}
          />
        )
      default:
        return <HomeScreen {...nav} />
    }
  }

  return (
    <DeviceFrame>
      <ScreenTransition screenKey={screen} direction={direction}>
        {renderScreen()}
      </ScreenTransition>
      {toast && <Toast message={toast} />}
    </DeviceFrame>
  )
}
