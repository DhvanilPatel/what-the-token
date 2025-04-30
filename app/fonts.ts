import { Geist_Mono } from "next/font/google";
import { Geist } from "next/font/google";

export const geistMono = Geist_Mono({
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const geistSans = Geist({
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});
