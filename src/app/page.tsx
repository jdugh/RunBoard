import { CalendarView } from "@/components/calendar/CalendarView";
import { UserGate } from "@/components/user/UserGate";
import { getCurrentUser } from "@/server/current-user";
import { listUsers } from "@/server/users";
import { todayMonthKey, formatMonthKey, parseMonthKey } from "@/lib/date";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

function normalizeMonthKey(raw: string | undefined): string {
  if (!raw) return todayMonthKey();
  const { year, month } = parseMonthKey(raw);
  return formatMonthKey(year, month);
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const monthKey = normalizeMonthKey(params.month);

  const currentUser = await getCurrentUser();
  const users = await listUsers();

  // No profile selected (first launch or stale cookie): block on the selection
  // modal before showing any data.
  if (!currentUser) {
    return (
      <main className="container py-6">
        <UserGate users={users} />
      </main>
    );
  }

  return (
    <main className="container py-6 max-w-[1400px]">
      <CalendarView monthKey={monthKey} currentUser={currentUser} users={users} />
    </main>
  );
}
