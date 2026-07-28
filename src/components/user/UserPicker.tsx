"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { toast } from "sonner";

import { selectUser, createAndSelectUser } from "@/app/user-actions";
import type { UserDTO } from "@/server/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#4b5563",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

interface UserPickerProps {
  users: UserDTO[];
  currentUserId?: string;
  // Called after a successful select/create (e.g. to close the dialog).
  onDone?: () => void;
}

export function UserPicker({ users, currentUserId, onDone }: UserPickerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(users.length === 0);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (id: string) => {
    if (id === currentUserId) {
      onDone?.();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await selectUser(id);
      if (!result.ok) {
        setError(result.error ?? "Sélection impossible");
        return;
      }
      onDone?.();
      router.refresh();
    });
  };

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createAndSelectUser({ name, color });
      if (!result.ok) {
        setError(result.error ?? "Création impossible");
        return;
      }
      toast.success(`Profil « ${result.user?.name} » créé`);
      onDone?.();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {users.length > 0 && (
        <ul className="space-y-2">
          {users.map((user) => {
            const active = user.id === currentUserId;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSelect(user.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors hover:bg-accent disabled:opacity-60",
                    active && "border-primary bg-accent",
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: user.color ?? "#4b5563" }}
                  >
                    {initials(user.name)}
                  </span>
                  <span className="flex-1 font-medium">{user.name}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Nom du profil</Label>
            <Input
              id="new-user-name"
              value={name}
              autoFocus
              placeholder="Ex. Jonathan"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleCreate();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Couleur ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                    color === c && "ring-2 ring-ring",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {users.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setCreating(false)}
              >
                Annuler
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              disabled={isPending || !name.trim()}
              onClick={handleCreate}
            >
              {isPending ? "Création…" : "Créer et continuer"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isPending}
          onClick={() => setCreating(true)}
        >
          <Plus className="h-4 w-4" />
          Ajouter un utilisateur
        </Button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
