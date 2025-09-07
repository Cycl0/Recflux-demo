import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import { Link } from "@heroui/link";
import clsx from "clsx";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="relative flex flex-col h-screen">
            <NavBar />
            <main className="pt-16">
              {children}
            </main>
            <footer className="w-full bg-content1 border-t border-default-100 py-12">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                  {/* Brand Section */}
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <span className="text-2xl">🚀</span>
                      </div>
                      <span className="text-xl font-bold">Beautiful World</span>
                    </div>
                    <p className="text-default-600 mb-4 max-w-md">
                      Building the future of web development with stunning UI components, 
                      smooth animations, and cutting-edge design.
                    </p>
                    <div className="flex gap-4">
                      <Link isExternal href="#" className="text-default-500 hover:text-primary transition-colors">
                        <span className="text-xl">🐦</span>
                      </Link>
                      <Link isExternal href="#" className="text-default-500 hover:text-primary transition-colors">
                        <span className="text-xl">📘</span>
                      </Link>
                      <Link isExternal href="#" className="text-default-500 hover:text-primary transition-colors">
                        <span className="text-xl">💼</span>
                      </Link>
                      <Link isExternal href="#" className="text-default-500 hover:text-primary transition-colors">
                        <span className="text-xl">📧</span>
                      </Link>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div>
                    <h4 className="font-semibold mb-4">Quick Links</h4>
                    <div className="flex flex-col gap-2">
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        Home
                      </Link>
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        Features
                      </Link>
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        Roadmap
                      </Link>
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        Contact
                      </Link>
                    </div>
                  </div>

                  {/* Resources */}
                  <div>
                    <h4 className="font-semibold mb-4">Resources</h4>
                    <div className="flex flex-col gap-2">
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        Documentation
                      </Link>
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        API Reference
                      </Link>
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        Support
                      </Link>
                      <Link href="#" className="text-default-600 hover:text-primary transition-colors">
                        Community
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-default-100">
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <p className="text-small text-default-500">
                      © 2024 Beautiful World. All rights reserved.
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-small text-default-600">Powered by</span>
                    <Link
                      isExternal
                      className="text-primary hover:text-primary/80 transition-colors"
                      href="https://heroui.com?utm_source=next-app-template"
                      title="heroui.com homepage"
                    >
                      HeroUI
                    </Link>
                    <span className="text-small text-default-600">& built with ❤️</span>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
