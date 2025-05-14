import React from "react";
import RegisterForm from "../../components/RegisterForm"; // Ajuste o caminho para seu componente
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          Criar Nova Conta
        </h1>
        <RegisterForm /> {/* Renderiza o componente de formulário */}
        <p className="text-sm text-center text-gray-600">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Faça login aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
