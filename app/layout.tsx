import type { Metadata } from "next";
import "./globals.css";
import "./project-intake.css";

export const metadata: Metadata = {
  title: {
    default: "Memphis Material Handling | Complete Warehouse Systems",
    template: "%s | Memphis Material Handling",
  },
  description:
    "Warehouse planning, storage-system engineering, new and used equipment, permitting coordination, and turnkey installation from Memphis.",
  icons: {
    icon: "/mmh-logo-forest-copper.png",
  },
  metadataBase: new URL(
    "https://memphis-material-handling.dylanrcaldwell.chatgpt.site",
  ),
  openGraph: {
    title: "Memphis Material Handling | Complete Warehouse Systems",
    description:
      "Warehouse planning, storage-system engineering, new and used equipment, permitting coordination, and turnkey installation from Memphis.",
    type: "website",
    images: [
      {
        url: "/og-redesign.png",
        width: 1200,
        height: 630,
        alt: "Memphis Material Handling Inc. — Complete warehouse systems. Handled locally.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Memphis Material Handling | Complete Warehouse Systems",
    description:
      "Warehouse planning, storage-system engineering, new and used equipment, permitting coordination, and turnkey installation from Memphis.",
    images: ["/og-redesign.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
