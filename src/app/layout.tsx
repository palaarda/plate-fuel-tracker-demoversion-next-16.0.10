import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});
const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});
export const metadata: Metadata = {
    title: "Filo Yönetim Paneli (Demo)",
    description: "Araç, yakıt ve kullanıcı yönetimi için demo panel",
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="tr" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>);
}
