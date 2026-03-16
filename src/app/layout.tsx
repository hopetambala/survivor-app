import type { Metadata } from "next";
import DliteProvider from "../dlite-design-system/DliteProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fantasy Survivor",
  description: "Fantasy Survivor League Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DliteProvider>{children}</DliteProvider>
      </body>
    </html>
  );
}
