import { createFileRoute } from "@tanstack/react-router";
// @ts-expect-error - JSX file without types
import UncorkApp from "@/UncorkApp.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MySom — Your Personal Sommelier" },
      {
        name: "description",
        content:
          "Scan a wine, take the taste quiz, and get personalized recommendations matched to your palate.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "MySom",
          description:
            "Your personal sommelier. Scan a wine, take a taste quiz, and get personalized wine recommendations matched to your palate.",
          url: "https://apps.forgeproductstrategy.com",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <UncorkApp />;
}
