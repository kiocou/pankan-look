import { useState } from "react";
import { Plus, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/stores";
import { cn } from "@/lib/utils";

export function ProviderSelector() {
  const { providers, activeProviderId, setActiveProvider } = useAppStore();
  const [open, setOpen] = useState(false);
  const active = providers.find((p) => p.id === activeProviderId);

  if (providers.length === 0) {
    return (
      <Button variant="outline" size="sm">
        <Plus className="mr-1 h-4 w-4" />
        添加云盘
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent"
      >
        <span>{active?.name ?? "选择云盘"}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border bg-popover p-1 shadow-md">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setActiveProvider(p.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                activeProviderId === p.id && "bg-primary/10"
              )}
            >
              <span>{p.name}</span>
              {activeProviderId === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
