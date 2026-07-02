// Impression d'un ticket de commande côté staff.
//
// Approche volontairement simple et SANS dépendance matérielle : on ouvre une
// fenêtre contenant un document HTML autonome (mise en page « ticket »), qui
// s'imprime tout seul au chargement puis se referme. Cela passe par la boîte
// d'impression du navigateur → fonctionne avec n'importe quelle imprimante
// installée sur l'appareil, y compris les imprimantes thermiques 80 mm
// (reçues comme imprimante système) comme sur une imprimante A4 classique.
//
// Les libellés sont déjà traduits et les montants déjà formatés par l'appelant
// (ce module ne dépend donc PAS de l'i18n).

export interface TicketItem {
  qty: number;
  name: string;
  options: string; // options jointes, ex. "Andalouse, Salade, Tomate" (peut être vide)
  note?: string;
  price: string; // déjà formaté, ex. "12,50 €"
}

export interface TicketData {
  restaurantName: string;
  locationName: string;
  orderId: number;
  modeLabel: string; // ex. "🛵 Livraison"
  receivedValue: string; // ex. "30/06 18:42"
  customerName: string;
  phone?: string;
  address?: string;
  items: TicketItem[];
  total: string; // déjà formaté
  estimated?: string; // ex. "20 min" (si commande acceptée)
  printedAt: string; // ex. "30/06 18:45"
  labels: {
    order: string;
    received: string;
    customer: string;
    phone: string;
    address: string;
    estimated: string;
    total: string;
    printedAt: string;
  };
}

/** Échappe le HTML pour éviter toute casse de balisage / injection. */
function esc(s: string | number | undefined | null): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTicketHtml(d: TicketData): string {
  const rows = d.items
    .map(
      (it) => `
      <div class="item">
        <div class="item-head">
          <span class="qty">${esc(it.qty)}×</span>
          <span class="name">${esc(it.name)}</span>
          <span class="price">${esc(it.price)}</span>
        </div>
        ${it.options ? `<div class="opts">${esc(it.options)}</div>` : ""}
        ${it.note ? `<div class="note">→ ${esc(it.note)}</div>` : ""}
      </div>`,
    )
    .join("");

  const line = (label: string, value: string) =>
    value ? `<div class="row"><span class="lbl">${esc(label)}</span><span>${esc(value)}</span></div>` : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(d.labels.order)} #${esc(d.orderId)}</title>
<style>
  /* Optimisé imprimante thermique 80 mm (largeur d'impression ~72 mm) :
     page de 80 mm de large, hauteur AUTO (rouleau continu), marges nulles.
     Fonctionne aussi sur A4 (le ticket s'imprime en bande de 80 mm). */
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #000;
    background: #fff;
  }
  .ticket { width: 80mm; margin: 0; padding: 3mm 4mm 7mm; }
  .resto { font-size: 18px; font-weight: 800; text-align: center; line-height: 1.2; }
  .loc { font-size: 12px; text-align: center; margin-bottom: 6px; }
  .ordno { font-size: 26px; font-weight: 800; text-align: center; }
  .mode { font-size: 14px; font-weight: 700; text-align: center; margin: 2px 0 6px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; line-height: 1.5; }
  .row .lbl { color: #333; }
  .item { margin: 5px 0; }
  .item-head { display: flex; align-items: baseline; gap: 6px; font-size: 14px; }
  .item-head .qty { font-weight: 800; }
  .item-head .name { font-weight: 700; flex: 1; }
  .item-head .price { white-space: nowrap; }
  .opts { font-size: 12px; color: #222; padding-left: 16px; }
  .note { font-size: 12px; font-style: italic; padding-left: 16px; }
  .total { display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; margin-top: 4px; }
  .footer { font-size: 10px; color: #555; text-align: center; margin-top: 10px; }
</style>
</head>
<body>
  <div class="ticket">
    <div class="resto">${esc(d.restaurantName)}</div>
    <div class="loc">${esc(d.locationName)}</div>
    <hr />
    <div class="ordno">${esc(d.labels.order)} #${esc(d.orderId)}</div>
    <div class="mode">${esc(d.modeLabel)}</div>
    ${line(d.labels.received, d.receivedValue)}
    ${line(d.labels.customer, d.customerName)}
    ${d.phone ? line(d.labels.phone, d.phone) : ""}
    ${d.address ? line(d.labels.address, d.address) : ""}
    ${d.estimated ? line(d.labels.estimated, d.estimated) : ""}
    <hr />
    ${rows}
    <hr />
    <div class="total"><span>${esc(d.labels.total)}</span><span>${esc(d.total)}</span></div>
    <div class="footer">${esc(d.labels.printedAt)} ${esc(d.printedAt)}</div>
  </div>
  <script>
    window.onload = function () { window.focus(); window.print(); };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`;
}

/** Ouvre une fenêtre d'impression auto-imprimante pour le ticket donné. */
export function printOrderTicket(d: TicketData): void {
  const html = buildTicketHtml(d);
  // Fenêtre étroite façon ticket ; déclenchée par un clic -> non bloquée.
  const w = window.open("", "ticket", "width=400,height=640");
  if (!w) {
    // Bloqueur de pop-up : on bascule sur un repli via iframe cachée.
    printViaIframe(html);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/** Repli si les pop-ups sont bloquées : impression via une iframe cachée. */
function printViaIframe(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  // Nettoyage après impression.
  setTimeout(() => {
    iframe.remove();
  }, 1000);
}
