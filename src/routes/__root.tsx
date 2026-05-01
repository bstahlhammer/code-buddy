import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../ui/styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#3D1B4E" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Wine Flight" },
      { title: "Wine Flight — Your Personal Sommelier" },
      {
        name: "description",
        content:
          "Discover wines you'll love. Scan a bottle, take a quick taste quiz, and get personalized recommendations matched to your palate.",
      },
      { name: "author", content: "Wine Flight" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Wine Flight" },
      { property: "og:title", content: "Wine Flight — Your Personal Sommelier" },
      {
        property: "og:description",
        content:
          "Discover wines you'll love. Scan a bottle, take a quick taste quiz, and get personalized recommendations matched to your palate.",
      },
      { property: "og:image", content: "https://apps.forgeproductstrategy.com/og-image.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:url", content: "https://apps.forgeproductstrategy.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Wine Flight — Your Personal Sommelier" },
      {
        name: "twitter:description",
        content:
          "Discover wines you'll love. Scan a bottle, take a quick taste quiz, and get personalized recommendations matched to your palate.",
      },
      { name: "twitter:image", content: "https://apps.forgeproductstrategy.com/og-image.jpg" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "canonical", href: "https://apps.forgeproductstrategy.com" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Open+Sauce+One:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
