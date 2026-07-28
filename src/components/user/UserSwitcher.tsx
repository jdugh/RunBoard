"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { UserDTO } from "@/server/users";
import { UserPicker } from "./UserPicker";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

interface UserSwitcherProps {
  currentUser: UserDTO;
  users: UserDTO[];
}

export function UserSwitcher({ currentUser, users }: UserSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title={`Profil : ${currentUser.name} — changer`}
          className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-colors hover:bg-accent"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: currentUser.color ?? "#4b5563" }}
          >
            {initials(currentUser.name)}
          </span>
          <span className="max-w-[8rem] truncate text-sm font-medium">
            {currentUser.name}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer de profil</DialogTitle>
          <DialogDescription>
            Sélectionne un autre profil ou crées-en un nouveau.
          </DialogDescription>
        </DialogHeader>
        <UserPicker
          users={users}
          currentUserId={currentUser.id}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
