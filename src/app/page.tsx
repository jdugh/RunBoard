import { CalendarView } from "@/components/calendar/CalendarView";
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

  return (
    <main className="container py-6 max-w-[1400px]">
      <CalendarView monthKey={monthKey} />
    </main>
  );
}
