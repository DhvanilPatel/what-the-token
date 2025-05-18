import "./globals.css";
import { geistSans } from "./fonts";
import { geistMono } from "./fonts";

export const metadata = {
  title: "what-the-t#ken — chatgpt history analyzer",
  description:
    "analyze your exported chatgpt history privately in your browser.",
  metadataBase: new URL("https://what-the-token.pages.dev"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.png", sizes: "any" },
    ],
    apple: [{ url: "/favicon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "what-the-t#ken — chatgpt history analyzer",
    description:
      "analyze your exported chatgpt history privately in your browser.",
    url: "https://what-the-token.pages.dev",
    siteName: "what-the-t0ken",
    images: [
      {
        url: "https://what-the-token.pages.dev/og-image.png?v=1",
        width: 1200,
        height: 630,
        alt: "ChatGPT history analyzer",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "",
    description:
      "analyze your exported chatgpt history privately in your browser.",
    images: ["https://what-the-token.pages.dev/og-image.png?v=1"],
  },
  other: {
    "theme-color": "#367EFD",
    "msapplication-TileColor": "#367EFD",
    "msapplication-config": "/browserconfig.xml",
  },
};

const initTheme = `(() => {
  try {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.add(theme);
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload background images */}
        <link rel="preload" href="/images/bg-1.png" as="image" />
        <link rel="preload" href="/images/bg-2.png" as="image" />
        <script dangerouslySetInnerHTML={{ __html: initTheme }} />
      </head>
      <body
        className={`${geistMono.className} ${geistSans.className} min-h-screen bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
