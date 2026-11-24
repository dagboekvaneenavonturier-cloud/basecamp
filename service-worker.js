
const CACHE = 'basecamp-shell-v5';

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('basecamp-shell-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {}

  const title = data.title || 'BASECAMP';

  const options = {
    body: data.body || 'Je hebt een nieuwe melding.',
    icon: './icon-192.png',
  
    data: {
      url: new URL(
        data.url || './index.html',
        self.registration.scope
      ).href
    },
    tag: data.tag || 'basecamp-notification'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url || './index.html',
    self.registration.scope
  ).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }

      return clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE).then(cache =>
            cache.put('./index.html', copy)
          );

          return response;
        })
        .catch(async () => {
          return (
            (await caches.match('./index.html')) ||
            (await caches.match('./'))
          );
        })
    );

    return;
  }

  const isAppFile = APP_FILES.some(path =>
    new URL(path, self.location.href).pathname === url.pathname
  );

  if (isAppFile) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE).then(cache =>
              cache.put(request, copy)
            );
          }

          return response;
        });
      })
    );
  }
});
