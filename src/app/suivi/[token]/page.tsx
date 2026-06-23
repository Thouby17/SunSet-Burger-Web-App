// Page /suivi/[token] : suivi client via le jeton non devinable.

import { notFound } from "next/navigation";
import OrderTracker from "@/components/OrderTracker";

export const dynamic = "force-dynamic";

export default async function SuiviPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  return <OrderTracker token={token} />;
}
