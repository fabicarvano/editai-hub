import AppHeader from "@/components/AppHeader";

export default function QuestionamentosPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
          Questionamentos Técnicos
        </h1>
        <p className="mt-1 text-muted-foreground">Em construção — Fase 1</p>
      </main>
    </div>
  );
}
