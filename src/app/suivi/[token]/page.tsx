// Page /suivi/[token] : suivi client via le jeton non devinable.

import { notFound } from "next/navigation";
import OrderTracker from "@/components/OrderTracker";
import { getOrderLabelMap } from "@/lib/menu";
import { getLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function SuiviPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const labelMap = await getOrderLabelMap(await getLocale());
  return <OrderTracker token={token} labelMap={labelMap} />;
}
