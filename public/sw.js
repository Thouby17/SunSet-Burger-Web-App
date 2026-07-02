// Service worker : reception des notifications Web Push et gestion du clic.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Brooklyn Food";
  const options = {
    body: data.body || "",
    icon: "/icon-app.png",
    badge: "/icon-app.png",
    // Vibration forte et repetee pour alerter meme en poche.
    vibrate: [400, 200, 400, 200, 600, 200, 400, 200, 600],
    tag: data.tag || undefined,
    renotify: !!data.tag,
    requireInteraction: true,
    data: { url: data.url || "/staff" },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      // Envoie un message aux onglets staff ouverts pour jouer le son sans
      // attendre le prochain cycle de polling (jusqu'a 4 s).
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((list) => {
          for (const client of list) {
            client.postMessage({ type: "NEW_ORDER_PUSH" });
          }
        }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/staff";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
