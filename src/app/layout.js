import { Inter } from "next/font/google";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import "material-symbols/outlined.css";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import "@/lib/network/initOutboundProxy"; // Auto-initialize outbound proxy env
import "@/shared/services/bootstrap"; // Auto-run initializeApp (watchdog, auto-resume tunnel)
import { initConsoleLogCapture } from "@/lib/consoleLogBuffer";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";
import { APP_NAME, THEME_CONFIG } from "@/shared/constants/config";

// Hook console immediately at module load time (server-side only, runs once)
initConsoleLogCapture();

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Apply persisted theme before first paint to avoid a light/dark flash on refresh.
// Reads the zustand-persisted theme ({state:{theme}}) and mirrors applyTheme() in themeStore.
// Loaded via next/script "beforeInteractive" so React never renders a raw <script> element
// (avoids the "Encountered a script tag" warning) while still running before hydration.
const THEME_INIT_SCRIPT = `(function(){try{var t="${THEME_CONFIG.defaultTheme}";try{var r=localStorage.getItem("${THEME_CONFIG.storageKey}");if(r){var p=JSON.parse(r);if(p&&p.state&&typeof p.state.theme==="string")t=p.state.theme}}catch(e){}if(t==="system"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})();`;

// Reveal Material Symbols once the icon font is ready (avoids ligature text flash).
const FONTS_LOADED_SCRIPT = `if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){document.documentElement.classList.add('fonts-loaded')})}else{document.documentElement.classList.add('fonts-loaded')}`;

export const metadata = {
  title: `${APP_NAME} - AI Infrastructure Management`,
  description: "One endpoint for all your AI providers. Manage keys, monitor usage, and scale effortlessly.",
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <Script
          id="fonts-loaded"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: FONTS_LOADED_SCRIPT }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <RuntimeI18nProvider>
            {children}
          </RuntimeI18nProvider>
        </ThemeProvider>
        <GoogleAnalytics gaId={"G-LC959F603F"} />
      </body>
    </html>
  );
}
