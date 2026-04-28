import { createFileRoute } from '@tanstack/react-router'
import { LegalLayout } from '@/ui/components/LegalLayout'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Service — MySom' },
      { name: 'description', content: 'The terms that govern your use of the MySom wine recommendation app.' },
    ],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalLayout eyebrow="House Rules" title="Terms of Service" updated="April 28, 2026">
      <p>
        Welcome to MySom. By using our web app at apps.forgeproductstrategy.com you agree to
        these Terms. If you don&rsquo;t agree, please don&rsquo;t use the app.
      </p>

      <h2>Who can use MySom</h2>
      <p>
        MySom is intended for adults of legal drinking age in their jurisdiction
        (<strong>21+ in the United States</strong>; the equivalent age elsewhere). By creating
        an account you confirm you meet that requirement. We reserve the right to terminate
        accounts that don&rsquo;t.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You&rsquo;re responsible for keeping your sign-in credentials secure.</li>
        <li>One person, one account. Don&rsquo;t share or sell access.</li>
        <li>Provide accurate information when you sign up.</li>
      </ul>

      <h2>Recommendations are guidance, not advice</h2>
      <p>
        MySom uses AI and statistical models to suggest wines based on your inputs. Suggestions
        are <strong>opinion-based recommendations</strong>, not professional, medical, or legal
        advice. Wine quality scores, food pairings, and tasting notes are estimates and may be
        wrong. Always drink responsibly.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&rsquo;t scrape, reverse-engineer, or attempt to bypass authentication or rate limits.</li>
        <li>Don&rsquo;t upload images that aren&rsquo;t wine lists, shelves, or bottles.</li>
        <li>Don&rsquo;t use the AI endpoints for any purpose other than your own wine discovery.</li>
        <li>Don&rsquo;t upload images you don&rsquo;t have rights to share.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of the ratings, descriptions, and photos you submit. You grant
        MySom a non-exclusive license to process them solely to provide the service to you
        (e.g., compute your taste profile, run AI analysis on your scan).
      </p>

      <h2>Service availability</h2>
      <p>
        MySom is provided &ldquo;as is&rdquo;. We don&rsquo;t guarantee uninterrupted access,
        and we may change or discontinue features at any time. We aren&rsquo;t liable for
        indirect or consequential damages arising from your use of the app, to the maximum
        extent permitted by law.
      </p>

      <h2>Termination</h2>
      <p>
        You can delete your account at any time from the <a href="/account">Account</a> page.
        We can suspend or terminate accounts that violate these Terms.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms from time to time. We&rsquo;ll change the &ldquo;Last
        updated&rdquo; date above. Continued use after changes means you accept the new
        Terms.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:brian@forgeproductstrategy.com">brian@forgeproductstrategy.com</a>
      </p>
    </LegalLayout>
  )
}
