import type { Metadata, Viewport } from "next";
import DliteProvider from "../dlite-design-system/DliteProvider";
import AppDialogs from "../components/AppDialogs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Fantasy Survivor",
    template: "%s · Fantasy Survivor",
  },
  description: "Run a Fantasy Survivor league: snake draft, per-episode scoring, live leaderboard.",
  applicationName: "Fantasy Survivor",
  openGraph: {
    title: "Fantasy Survivor",
    description:
      "Run a Fantasy Survivor league: snake draft, per-episode scoring, live leaderboard.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Fantasy Survivor",
    description:
      "Run a Fantasy Survivor league: snake draft, per-episode scoring, live leaderboard.",
  },
  robots: {
    // Admin flows are auth-gated; public /league/[code] URLs rely on the code
    // being private. Discourage indexing across the whole app.
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Visually hidden until focused — lets keyboard users skip the header chrome. */}
        <a href="#main-content" className="cl-dlite-skip-link">
          Skip to main content
        </a>
        <DliteProvider>
          <AppDialogs>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
          </AppDialogs>
        </DliteProvider>
      </body>
    </html>
  );
}
