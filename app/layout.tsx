// app/layout.tsx (ou src/app/layout.tsx)
import "./globals.css";
import type {Metadata} from "next";
import {Inter} from "next/font/google";
import ClientSessionProvider from "@/components/providers/ClientSessionProvider"; // Componente cliente para envolver
import {Toaster} from "@/components/ui/sonner"; // Importa o Toaster

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
    <html lang="pt-BR">
      <body className={inter.className}>
        {/* Envolve a aplicação com o Provedor de Sessão */}
        <ClientSessionProvider>
          {children}
          <Toaster richColors position="top-right" />{" "}
          {/* Posiciona o Toaster */}
        </ClientSessionProvider>
      </body>
    </html>
  );
}
