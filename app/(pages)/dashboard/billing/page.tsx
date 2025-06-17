// app/(pages)/dashboard/billing/page.tsx
"use client";

import {CheckIcon} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {cn} from "@/lib/utils";

const plans = [
  {
    name: "Básico",
    price: "R$ 29",
    features: [
      "Até 500 itens no inventário",
      "1 usuário",
      "Suporte via e-mail",
    ],
    cta: "Selecionar Plano",
    isCurrent: false,
  },
  {
    name: "Profissional",
    price: "R$ 79",
    features: [
      "Até 5.000 itens no inventário",
      "Até 5 usuários",
      "Integração com Marketplaces",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    cta: "Selecionar Plano",
    isCurrent: true, // Apenas para exemplo visual
    isPopular: true,
  },
  {
    name: "Empresa",
    price: "Customizado",
    features: [
      "Itens ilimitados",
      "Usuários ilimitados",
      "APIs para desenvolvedores",
      "Gerente de conta dedicado",
    ],
    cta: "Entrar em Contato",
    isCurrent: false,
  },
];

export default function BillingPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Assinatura e Planos
        </h1>
        <p className="text-muted-foreground mt-2">
          Escolha o plano que melhor se adapta ao tamanho e às necessidades do
          seu negócio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card
            key={plan.name}
            className={cn("flex flex-col", plan.isPopular && "border-primary")}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.name !== "Empresa" && (
                  <span className="text-muted-foreground">/mês</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={plan.isCurrent}
                variant={plan.isPopular ? "default" : "outline"}
              >
                {plan.isCurrent ? "Plano Atual" : plan.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
