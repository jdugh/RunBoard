"use client";

import { formatClock } from "@/lib/duration";
import { secondsToPace } from "@/lib/pace";
import {
  DEFAULT_SPLIT_METERS,
  type SplitRow,
  type SplitsResult,
} from "@/lib/track-analysis";

interface SplitsTableProps {
  splits: SplitsResult;
}

const COLUMNS = [
  "Circuit",
  "Durée",
  "Cumul",
  "Dist.",
  "Allure",
  "FC moy",
  "FC max",
  "D+",
  "Cad.",
] as const;

const UNITS: Record<string, string> = {
  "Dist.": "km",
  Allure: "min/km",
  "FC moy": "bpm",
  "FC max": "bpm",
  "D+": "m",
  "Cad.": "ppm",
};

export function SplitsTable({ splits }: SplitsTableProps) {
  if (splits.rows.length === 0) {
    return (
      <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
        Pas de données de distance sur cette séance : impossible de découper des
        circuits.
      </p>
    );
  }

  const computed = splits.source === "computed";

  return (
    <div className="space-y-2">
      {computed && (
        <p className="text-xs text-muted-foreground">
          Circuits recalculés tous les {DEFAULT_SPLIT_METERS / 1000} km à partir
          de la trace : cet import ne contient pas les circuits de la montre. Le
          D+ est estimé depuis l&apos;altitude brute et reste approximatif.
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-3 py-2 font-medium text-muted-foreground"
                >
                  <span className="block leading-tight">{column}</span>
                  {UNITS[column] && (
                    <span className="block text-[10px] font-normal opacity-70">
                      {UNITS[column]}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {splits.rows.map((row) => (
              <Row key={row.index} row={row} computed={computed} />
            ))}
          </tbody>
          {splits.total && (
            <tfoot>
              <Row
                row={splits.total}
                computed={computed}
                label="Récapitulatif"
              />
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Row({
  row,
  computed,
  label,
}: {
  row: SplitRow;
  computed: boolean;
  label?: string;
}) {
  const isTotal = label !== undefined;
  return (
    <tr
      className={
        isTotal
          ? "border-t bg-muted/40 font-medium"
          : "border-b last:border-b-0"
      }
    >
      <td className="px-3 py-1.5 tabular-nums">{label ?? row.index}</td>
      <td className="px-3 py-1.5 tabular-nums">{formatClock(row.durationS)}</td>
      <td className="px-3 py-1.5 tabular-nums">
        {formatClock(row.cumulativeS)}
      </td>
      <td className="px-3 py-1.5 tabular-nums">{row.distanceKm.toFixed(2)}</td>
      <td className="px-3 py-1.5 tabular-nums">
        {row.paceSecPerKm != null ? secondsToPace(row.paceSecPerKm) : "--"}
      </td>
      <td className="px-3 py-1.5 tabular-nums">{row.avgHr ?? "--"}</td>
      <td className="px-3 py-1.5 tabular-nums">{row.maxHr ?? "--"}</td>
      <td className="px-3 py-1.5 tabular-nums">
        {row.ascentM == null ? "--" : computed ? `~${row.ascentM}` : row.ascentM}
      </td>
      <td className="px-3 py-1.5 tabular-nums">{row.avgCadenceSpm ?? "--"}</td>
    </tr>
  );
}
