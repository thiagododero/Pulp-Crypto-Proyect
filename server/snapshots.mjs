/** Local observed portfolio values. No invented backfill, prices or PnL. */
export const SNAPSHOT_INTERVAL_MS = 15 * 60 * 1000;
export const SNAPSHOT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const SNAPSHOT_LIMIT = 2880;
export function appendSnapshot(previous, portfolio, now = Date.now()) {
  const points = (Array.isArray(previous) ? previous : [])
    .filter(p => p && Number.isFinite(p.at) && p.at >= now - SNAPSHOT_RETENTION_MS && p.at <= now
      && Number.isFinite(p.totalUsd) && p.totalUsd >= 0)
    .sort((a,b) => a.at-b.at).slice(-SNAPSHOT_LIMIT);
  if (!portfolio || portfolio.network !== 'mainnet' || !Number.isFinite(portfolio.totalUsd) || portfolio.totalUsd < 0) return points;
  if (points.length && now - points.at(-1).at < SNAPSHOT_INTERVAL_MS) return points;
  points.push({at:now,totalUsd:portfolio.totalUsd,unpriced:Number(portfolio.unpriced)||0,
    partial:!!portfolio.unpriced || !!portfolio.warnings?.length,assets:portfolio.assets?.length||0});
  return points.slice(-SNAPSHOT_LIMIT);
}
