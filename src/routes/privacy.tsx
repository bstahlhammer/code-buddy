import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/ui/components/LegalLayout'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy, Wine Flight' },
      { name: 'description', content: 'How Wine Flight collects, uses, and protects your wine taste data and personal information.' },
    ],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalLayout eyebrow="The Cellar Records" title="Privacy Policy" updated="April 28, 2026">
      <p>
        Wine Flight (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is operated by Wine Flight. This policy explains
        what we collect when you use the Wine Flight web app at apps.forgeproductstrategy.com, why,
        and what choices you have. We aim to collect only what we need to give you better
        wine recommendations.
      </p>

      <h2>Information we collect</h2>
      <h3>Account information</h3>
      <p>
        When you create an account we store your email address, an optional display name, and
        an avatar URL (if you sign in with Google). We never see or store your Google password.
      </p>

      <h3>Taste profile &amp; ratings</h3>
      <p>
        As you take quizzes, rate bottles, or describe your palate, we save your answers,
        ratings, and the inferred palate profile so the app can personalize recommendations
        across sessions and devices.
      </p>

      <h3>Wine list scans</h3>
      <p>
        Photos you upload for wine-list scanning are sent to our AI provider (Lovable AI
        Gateway) for analysis and are not retained after the scan completes. We do not store
        the original images on our servers.
      </p>

      <h3>Technical data</h3>
      <p>
        Like most web apps, our hosting provider logs basic request data (IP address, user
        agent, timestamps) for security and reliability. We do not use third-party advertising
        trackers.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To create and secure your account.</li>
        <li>To compute and improve your personalized wine recommendations.</li>
        <li>To send transactional emails (verification, password reset), not marketing.</li>
        <li>To diagnose bugs and prevent abuse of our AI endpoints.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do <strong>not</strong> sell your data. We share data only with the service providers
        that make Wine Flight run: our backend infrastructure (Lovable Cloud, powered by Supabase) and
        our AI provider (Lovable AI Gateway, which routes requests to Google and OpenAI models).
        Each is bound by their own privacy commitments.
      </p>

      <h2>Your rights</h2>
      <p>
        You can view, update, or delete your account at any time from the{' '}
        <a href="/account">Account</a> page. Deleting your account permanently removes your
        profile, ratings, taste profile, and quiz answers from our database. Some logs may
        persist for up to 30 days for security purposes.
      </p>

      <h2>Children</h2>
      <p>
        Wine Flight is intended for adults of legal drinking age in their jurisdiction. We do not
        knowingly collect data from anyone under 21 (US) or under the local legal drinking
        age elsewhere.
      </p>

      <h2>Changes</h2>
      <p>
        If we update this policy, we&rsquo;ll change the &ldquo;Last updated&rdquo; date above.
        Material changes will be highlighted in-app or via email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions, requests, or complaints:{' '}
        <a href="mailto:brian@forgeproductstrategy.com">brian@forgeproductstrategy.com</a>.
      </p>
    </LegalLayout>
  )
}
