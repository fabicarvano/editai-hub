import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";

export default function RadarPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Breadcrumb items={[{ label: "Hub", to: "/hub" }, { label: "Radar de Compras" }]} />
        <div className="mt-8 flex items-center justify-center rounded-xl border bg-card p-16">
          <p className="text-lg text-muted-foreground">
            Dashboard em construção — Fase 3.2
          </p>
        </div>
      </main>
    </div>
  );
}
