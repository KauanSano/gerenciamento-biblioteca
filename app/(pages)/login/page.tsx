// app/login/page.tsx  (ou src/app/login/page.tsx)
import React from "react";
import LoginForm from "../../components/LoginForm"; // Ajuste o caminho para seu componente
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Acessar sua Conta
        </h1>
        <LoginForm /> {/* Renderiza o componente de formulário */}
        <p className="text-sm text-center text-gray-600">
          Não tem uma conta?{" "}
          <Link
            href="/signup"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Registre-se aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
