"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { UserDTO } from "@/server/users";
import { UserPicker } from "./UserPicker";

// Blocking, non-dismissible modal shown when no profile is selected. The close
// button is hidden and escape / outside-click are prevented, so the only way
// out is to pick or create a profile.
export function UserGate({ users }: { users: UserDTO[] }) {
  return (
    <Dialog open>
      <DialogContent
        className="[&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Qui es-tu ?</DialogTitle>
          <DialogDescription>
            Choisis ton profil pour accéder à ton calendrier.
          </DialogDescription>
        </DialogHeader>
        <UserPicker users={users} />
      </DialogContent>
    </Dialog>
  );
}
