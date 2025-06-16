// app/page.tsx
import Link from "next/link";
import {Button} from "@/components/ui/button";
import {BookOpen} from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center items-center mb-6">
          <BookOpen
            className="h-16 w-16 text-gray-800 dark:text-white"
            strokeWidth={1.5}
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl">
          Bem-vindo ao Gestor de Sebo
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          A sua solução completa para gerenciar o inventário da sua livraria ou
          sebo com facilidade e eficiência.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link href="/login" passHref>
            <Button size="lg">Acessar minha conta</Button>
          </Link>
          <Link href="/signup" passHref>
            <Button size="lg" variant="outline">
              Criar nova conta <span aria-hidden="true">→</span>
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
