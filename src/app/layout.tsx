import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Plus_Jakarta_Sans,
  Outfit,
  Sora,
  Manrope,
  DM_Sans,
  Montserrat,
  Work_Sans,
  Figtree,
  Lexend,
  Nunito,
  Poppins,
  Space_Grotesk,
  Bricolage_Grotesque,
  Playfair_Display,
  Instrument_Serif,
  Lora,
  Merriweather,
  Source_Serif_4,
  Fraunces,
  JetBrains_Mono,
  Fira_Code,
  IBM_Plex_Mono,
  Roboto_Mono,
} from "next/font/google";
import "./globals.css";

import type { Viewport } from "next";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { MotionProvider } from "@/components/motion/motion-provider";
import { STORAGE_KEY } from "@/lib/theme-presets";

// Sans
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"] });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
// Grotesk / display
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });
// Serif
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });
const merriweather = Merriweather({ variable: "--font-merriweather", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
// Mono
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });
const firaCode = Fira_Code({ variable: "--font-fira-code", subsets: ["latin"] });
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const robotoMono = Roboto_Mono({ variable: "--font-roboto-mono", subsets: ["latin"] });

const fontVariables = [
  geistSans,
  inter,
  jakarta,
  outfit,
  sora,
  manrope,
  dmSans,
  montserrat,
  workSans,
  figtree,
  lexend,
  nunito,
  poppins,
  spaceGrotesk,
  bricolage,
  playfair,
  instrumentSerif,
  lora,
  merriweather,
  sourceSerif,
  fraunces,
  geistMono,
  jetbrainsMono,
  firaCode,
  ibmPlexMono,
  robotoMono,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "ABD Restaurant — Smart Restaurant Management",
  description:
    "QR ordering, live kitchen display, tables, billing & analytics for restaurants.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ABD Restaurant", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

// Runs before hydration so the light/dark class matches the saved theme
// (prevents a flash), the provider then applies the full palette on mount.
const themeInitScript = `(function(){try{var c=JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'{}');var dark=c.mode?c.mode==='dark':true;document.documentElement.classList.toggle('dark',dark);}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <MotionProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </MotionProvider>
          <Toaster position="bottom-right" />
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
