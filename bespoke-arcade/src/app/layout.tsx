import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Bespoke Social",
  description: "The culture app of Bespoke Labs. Daily word games, photo challenges, trivia, and a leaderboard worth fighting over.",
  keywords: ["bespoke labs", "culture", "arcade", "wordle", "games"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <Nav />
          <main className="page">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
