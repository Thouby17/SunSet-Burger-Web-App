// Statistiques de ventes pour le tableau de bord administrateur.
// Calcule, par période (aujourd'hui / 7 j / 30 j / 12 mois) :
//   - le chiffre d'affaires (CA) = commandes VALIDÉES (acceptées ou prêtes),
//   - le nombre de commandes REÇUES (tous statuts ; les commandes supprimées par
//     l'admin n'existent plus en base, donc jamais comptées),
//   - le détail par statut (reçues / validées / en attente / refusées),
//   - le panier moyen (CA / commandes validées),
//   avec une ventilation par établissement.
//
// ⚠️ Les bornes de journée sont calculées à l'heure d'**Europe/Brussels**
// (et non UTC), pour que "aujourd'hui" corresponde à la vraie journée du resto.
// Serveur uniquement.

import { prisma } from "./db";
import { serializeOrder } from "./order";
import type { OrderDTO } from "./types";

export type PeriodKey = "today" | "week" | "month" | "year";

/** Une commande compte dans le CA si elle a été validée par le staff. */
const REVENUE_STATUSES = new Set(["accepted", "ready"]);

export interface StatusBreakdown {
  received: number; // toutes les commandes reçues (tous statuts)
  validated: number; // acceptées + prêtes
  pending: number; // en attente de validation
  refused: number; // refusées
}

export interface LocationBreakdown extends StatusBreakdown {
  id: string;
  name: string;
  revenue: number; // CA = commandes validées
}

export interface PeriodStats extends StatusBreakdown {
  revenue: number;
  avgBasket: number;
  byLocation: LocationBreakdown[];
}

export type SalesStats = Record<PeriodKey, PeriodStats>;

/** Décalage (ms) entre l'heure murale d'Europe/Brussels et UTC, à l'instant donné. */
function brusselsOffsetMs(at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Brussels",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value;
  const asUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second,
  );
  return asUTC - at.getTime();
}

/** Début de journée (minuit **à Bruxelles**) il y a `daysAgo` jours, en instant UTC. */
function startOfDayBrusselsAgo(daysAgo: number): Date {
  const ref = new Date(Date.now() - daysAgo * 86_400_000);
  // Date murale (année/mois/jour) à Bruxelles pour `ref`.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Brussels",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(ref)) p[part.type] = part.value;
  const midnightAsUTC = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0);
  // Corrige du décalage de Bruxelles à ce minuit (gère heure d'été/hiver).
  const offset = brusselsOffsetMs(new Date(midnightAsUTC));
  return new Date(midnightAsUTC - offset);
}

const PERIOD_START: Record<PeriodKey, () => Date> = {
  today: () => startOfDayBrusselsAgo(0),
  week: () => startOfDayBrusselsAgo(6), // aujourd'hui + 6 jours précédents
  month: () => startOfDayBrusselsAgo(29),
  year: () => startOfDayBrusselsAgo(364),
};

type Row = { total: number; status: string; createdAt: Date; location: string };

/** Compte les commandes par statut. */
function breakdown(rows: Row[]): StatusBreakdown {
  return {
    received: rows.length,
    validated: rows.filter((r) => REVENUE_STATUSES.has(r.status)).length,
    pending: rows.filter((r) => r.status === "pending").length,
    refused: rows.filter((r) => r.status === "refused").length,
  };
}

function computeStats(
  inPeriod: Row[],
  locations: { id: string; name: string }[],
): PeriodStats {
  const counts = breakdown(inPeriod);
  const revenue = inPeriod
    .filter((r) => REVENUE_STATUSES.has(r.status))
    .reduce((s, r) => s + r.total, 0);
  const avgBasket = counts.validated > 0 ? revenue / counts.validated : 0;

  const byLocation: LocationBreakdown[] = locations
    .map((loc) => {
      const locRows = inPeriod.filter((r) => r.location === loc.id);
      const locRevenue = locRows
        .filter((r) => REVENUE_STATUSES.has(r.status))
        .reduce((s, r) => s + r.total, 0);
      return { id: loc.id, name: loc.name, revenue: locRevenue, ...breakdown(locRows) };
    })
    .sort((a, b) => b.revenue - a.revenue || b.received - a.received);

  return { revenue, avgBasket, ...counts, byLocation };
}

function computePeriod(
  rows: Row[],
  start: Date,
  locations: { id: string; name: string }[],
): PeriodStats {
  return computeStats(
    rows.filter((r) => r.createdAt >= start),
    locations,
  );
}

/** Bornes UTC (début/fin) d'une journée "YYYY-MM-DD" à l'heure de Bruxelles. */
function brusselsDayBounds(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const startUTC = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const endUTC = Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  return {
    start: new Date(startUTC - brusselsOffsetMs(new Date(startUTC))),
    end: new Date(endUTC - brusselsOffsetMs(new Date(endUTC))),
  };
}

/** Statistiques complètes pour toutes les périodes. */
export async function getSalesStats(
  locations: { id: string; name: string }[],
): Promise<SalesStats> {
  const since = PERIOD_START.year();
  const rows = (await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { total: true, status: true, createdAt: true, location: true },
  })) as Row[];

  return {
    today: computePeriod(rows, PERIOD_START.today(), locations),
    week: computePeriod(rows, PERIOD_START.week(), locations),
    month: computePeriod(rows, PERIOD_START.month(), locations),
    year: computePeriod(rows, PERIOD_START.year(), locations),
  };
}

/**
 * Données du dashboard pour une plage de dates (incluse), heure de Bruxelles :
 * les statistiques ET les commandes de la période (les plus récentes d'abord).
 */
export async function getRangeData(
  locations: { id: string; name: string }[],
  fromStr: string,
  toStr: string,
): Promise<{ stats: PeriodStats; orders: OrderDTO[] }> {
  // On remet les bornes dans l'ordre (du plus ancien au plus récent).
  const [a, b] = fromStr <= toStr ? [fromStr, toStr] : [toStr, fromStr];
  const { start } = brusselsDayBounds(a);
  const { end } = brusselsDayBounds(b);
  const where = { createdAt: { gte: start, lte: end } };

  // Stats : sur toutes les commandes de la plage (léger).
  const rows = (await prisma.order.findMany({
    where,
    select: { total: true, status: true, createdAt: true, location: true },
  })) as Row[];
  const stats = computeStats(rows, locations);

  // Liste : commandes de la plage, plus récentes d'abord (plafonnée à 300).
  const orderRows = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  return { stats, orders: orderRows.map(serializeOrder) };
}
