import { createFileRoute } from "@tanstack/react-router";
import UncorkApp from "@/UncorkApp.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Uncork — Find Your Perfect Wine" },
      {
        name: "description",
        content:
          "Scan a wine, take the taste quiz, and get personalized wine recommendations matched to your palate.",
      },
      { property: "og:title", content: "Uncork — Find Your Perfect Wine" },
      {
        property: "og:description",
        content:
          "Scan a wine, take the taste quiz, and get personalized wine recommendations matched to your palate.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <UncorkApp />;
}
