import "server-only";
import { unzipSync } from "fflate";

export interface ExtractedFit {
  bytes: ArrayBuffer;
  fitFileName: string;
}

// Accepts either a raw .fit file or a .zip (as exported by Garmin Connect)
// and returns the FIT bytes plus the .fit file name (used for the external id).
export async function extractFit(file: File): Promise<ExtractedFit> {
  const lower = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (lower.endsWith(".fit")) {
    return { bytes: buffer, fitFileName: file.name };
  }

  if (lower.endsWith(".zip")) {
    const entries = unzipSync(new Uint8Array(buffer));
    const fitName = Object.keys(entries).find((name) =>
      name.toLowerCase().endsWith(".fit"),
    );
    if (!fitName) {
      throw new Error("Aucun fichier .fit trouvé dans l'archive ZIP.");
    }
    const data = entries[fitName];
    const bytes = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    const base = fitName.split(/[\\/]/).pop() ?? fitName;
    return { bytes, fitFileName: base };
  }

  throw new Error("Format non supporté. Importez un fichier .fit ou un .zip.");
}

// Garmin names original exports "<activityId>_ACTIVITY.fit"; the leading numeric
// id is unique per activity and used as our idempotency key. Falls back to the
// base file name when there is no leading id.
export function externalIdFromFileName(fitFileName: string): string {
  const base = (fitFileName.split(/[\\/]/).pop() ?? fitFileName).replace(
    /\.fit$/i,
    "",
  );
  const match = base.match(/^(\d{5,})/);
  return match ? match[1] : base;
}
