import { useNavigate } from "react-router-dom";
import { Settings, LogOut } from "lucide-react";
import { getNome, logout } from "@/lib/api";

const LOGO_URL = "https://i.postimg.cc/vT1GGCpn/decatron-2.png";

export default function AppHeader() {
  const navigate = useNavigate();
  const nome = getNome();
  const inicial = nome.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-secondary px-4 md:px-8">
      <img
        src={LOGO_URL}
        alt="DECATRON"
        className="h-8 cursor-pointer"
        onClick={() => navigate("/hub")}
      />
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {inicial}
        </div>
        <span className="hidden text-sm font-medium text-secondary-foreground md:inline">
          {nome}
        </span>
        <button
          onClick={() => navigate("/configuracoes")}
          className="rounded-md p-2 text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
          title="Configurações"
        >
          <Settings className="h-4 w-4" />
        </button>
        <button
          onClick={logout}
          className="rounded-md p-2 text-secondary-foreground/70 transition-colors hover:bg-secondary-foreground/10 hover:text-secondary-foreground"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
