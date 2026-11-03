import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata = {
 title: "Amar Bartaula | Full-stack Web Developer",
 description: "Portfolio of Amar Bartaula — web development, educational technology and digital systems.",
 metadataBase: new URL("https://amarbartaula.com.np"),
 openGraph: { title: "Amar Bartaula", description: "Building useful digital systems.", url: "https://amarbartaula.com.np", siteName: "Amar Bartaula", type: "website" }
};
export default function RootLayout({ children }) {
 return <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}><body className="min-h-full">{children}</body></html>;
}