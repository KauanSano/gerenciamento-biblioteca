// app/layout.tsx (ou src/app/layout.tsx)
import "./globals.css";
import type {Metadata} from "next";
import {Inter} from "next/font/google";
import ClientSessionProvider from "@/components/providers/ClientSessionProvider"; // Componente cliente para envolver
import {Toaster} from "@/components/ui/sonner"; // Importa o Toaster
import {ThemeProvider} from "@/components/providers/ThemeProvider";
import {ThemeToggle} from "./components/ThemeToggle";
const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
  title: "Gerenciador de Biblioteca",
  description: "Seu gerenciador de sebo online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="fixed top-4 right-4 z-50">
              <ThemeToggle />
            </div>
            {children}
            <Toaster richColors position="top-right" />{" "}
          </ThemeProvider>
        </ClientSessionProvider>
      </body>
    </html>
  );
}
