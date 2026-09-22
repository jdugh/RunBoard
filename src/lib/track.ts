// Shape of the second-by-second track persisted in SessionTrack.points.
//
// Lives in its own module because `fit.ts` is server-only while the charts and
// the splits table run in the browser: both sides need this type.
//
// The first seven fields are always written (null when the device did not
// record them). The rest are only written when the watch actually measured
// them, so tracks imported before those fields existed stay valid as-is —
// every consumer must treat them as possibly-absent.
export interface TrackPoint {
  t: number; // seconds from start
  lat: number | null;
  lng: number | null;
  alt: number | null; // meters
  hr: number | null; // bpm
  cad: number | null; // steps per minute
  d: number | null; // cumulative distance, meters
  v?: number; // instantaneous speed, m/s
  pw?: number; // power, watts
  gct?: number; // ground contact time, ms
  vo?: number; // vertical oscillation, mm
  sl?: number; // step length, mm
  tmp?: number; // temperature, degrees Celsius
}
