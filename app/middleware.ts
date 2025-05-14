// middleware.ts (na raiz ou em src/)

// Exporta a configuração do matcher para aplicar o middleware apenas às rotas desejadas
export {default} from "next-auth/middleware";

// Aplica o middleware NextAuth a rotas específicas
export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas exceto as que começam com:
     * - api (Rotas de API)
     * - _next/static (Arquivos estáticos)
     * - _next/image (Otimização de imagens)
     * - favicon.ico (Ícone Favicon)
     * - /login (Página de Login)
     * - /register (Página de Registro)
     * - / (Página Inicial - se for pública)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|login|register|^/$).*)",
    // Adicione aqui qualquer outra rota PÚBLICA que não precise de login
    // Se a raiz '/' precisar de login, remova '^/$' acima e adicione-a abaixo
    // Ex: '/dashboard/:path*' // Aplica a tudo dentro de /dashboard
  ],
};
