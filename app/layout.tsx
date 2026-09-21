import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Task Tracker",
  description: "Client Implementation Tracker and Account Portfolio Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hankenGrotesk.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'dark' || saved === 'light') {
                    document.documentElement.setAttribute('data-theme', saved);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <div id="app" className="wrap">
          {children}
          <footer style={{ textAlign: 'center', padding: '40px 20px 20px', fontSize: '12px', color: 'var(--faint)' }}>
            Built by <a href="https://thehubcontent.com" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontWeight: '500' }}>The Hub Content</a>
          </footer>
        </div>
      </body>
    </html>
  );
}
