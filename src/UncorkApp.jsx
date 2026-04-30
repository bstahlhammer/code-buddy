import { useState, useCallback, useEffect } from 'react'
import {
  inferPalateFromRatings,
  nearestTasteProfile,
  groupRatingsByBucket,
  computePalateFromGuidedAnswers,
} from '@/core/api'
import DeviceFrame from './ui/components/DeviceFrame.jsx'
import ScreenTransition from './ui/components/ScreenTransition.jsx'
import Toast from './ui/components/Toast.jsx'
import BottomNav from './ui/components/BottomNav.jsx'
import { useAuth } from './ui/hooks/useAuth.js'
import { useScanHistory } from './ui/hooks/useScanHistory.js'
import { useTasteProfileSync } from './ui/hooks/useTasteProfileSync.js'

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
import AuthScreen from './ui/screens/AuthScreen.jsx'
import HistoryScreen from './ui/screens/HistoryScreen.jsx'
import ProfileScreen from './ui/screens/ProfileScreen.jsx'

const TAB_FOR_SCREEN = {
  home: 'home',
  history: 'history',
  profile: 'profile',
  profileReveal: 'profile',
}
const SCREENS_WITH_NAV = new Set(['home', 'history', 'profile'])

const INITIAL_QUIZ_ANSWERS = {
  flavorPreferences: [],
  goToDrink: null,
  mealAppeal: null,
  boldness: 50,
  sweetness: null,
  wineRatings: {},
  guidedAnswers: {},
  lovedWineIds: [],
  hatedWineIds: [],
}

const SWEETNESS_MAP = {
  'I love sweet':              80,
  'Slightly sweet is perfect': 55,
  'Dry is fine':               30,
  'Bone dry always':           10,
}

function deriveProfile(quizAnswers) {
  const ratings = quizAnswers.wineRatings ?? {}
  const inferredR = inferPalateFromRatings(ratings)

  const guided  = quizAnswers.guidedAnswers ?? {}
  const inferredG = computePalateFromGuidedAnswers(guided)

  const aiPalate = quizAnswers.aiPalate ?? null
  const aiConfidence = aiPalate ? 1.5 : 0

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
  const auth = useAuth()
  const [screen,       setScreen]       = useState('home')
  const [history,      setHistory]      = useState([])
  const [direction,    setDirection]    = useState('forward')
  const [selectedWine, setSelectedWine] = useState(null)
  const [returnScreen, setReturnScreen] = useState('anonResults')
  const [buyingFor,    setBuyingFor]    = useState('me')
  const [quizAnswers,  setQuizAnswers]  = useState(INITIAL_QUIZ_ANSWERS)
  const [tasteProfile, setTasteProfile] = useState(null)
  const [toast,        setToast]        = useState(null)
  const [pendingAfterAuth, setPendingAfterAuth] = useState(null)
  const [authMode, setAuthMode] = useState('full')

  const [hasScanned, setHasScanned] = useState(false)
  const [scanFile, setScanFile] = useState(null)
  const [scannedWines, setScannedWines] = useState(null)

  const { saveScan, loadScan } = useScanHistory()
  const { saveProfile, loadProfile } = useTasteProfileSync()

  // Hydrate taste profile from DB when user signs in
  useEffect(() => {
    if (!auth.user?.id) return
    let cancelled = false
    ;(async () => {
      const { profile } = await loadProfile()
      if (!cancelled && profile && !tasteProfile) setTasteProfile(profile)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id])

  const navigate = useCallback((to) => {
    // Login wall: any feature screen requires auth
    if (!auth.user && to !== 'home' && to !== 'auth') {
      setPendingAfterAuth(to)
      setAuthMode('full')
      setDirection('forward')
      setHistory(h => [...h, screen])
      setScreen('auth')
      return
    }
    setDirection('forward')
    setHistory(h => [...h, screen])
    if (to === 'scanning') setHasScanned(true)
    setScreen(to)
  }, [screen, auth.user])

  const handleEmailSignIn = useCallback(() => {
    setAuthMode('email')
    setDirection('forward')
    setHistory(h => [...h, screen])
    setScreen('auth')
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

  const handleAuthed = useCallback(() => {
    if (pendingAfterAuth) {
      const dest = pendingAfterAuth
      setPendingAfterAuth(null)
      setDirection('forward')
      setScreen(dest)
    } else {
      setDirection('back')
      setHistory(h => h.slice(0, -1))
      setScreen(prev => history[history.length - 1] ?? 'home')
    }
    showToast('Signed in')
  }, [pendingAfterAuth, history, showToast])

  function renderScreen() {
    const nav = { navigate, goBack }
    switch (screen) {
      case 'home':
        return <HomeScreen {...nav} auth={auth} onEmailSignIn={handleEmailSignIn} />
      case 'auth':
        return <AuthScreen {...nav} onAuthed={handleAuthed} authMode={authMode} />
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
            scannedWines={scannedWines}
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
        return <HomeScreen {...nav} auth={auth} onEmailSignIn={handleEmailSignIn} />
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
