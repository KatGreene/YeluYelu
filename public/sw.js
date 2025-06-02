if (typeof caches === 'undefined') {
    console.error('Cache API is not available in this environment');
    // 在这里处理不支持的情况
}

const CACHE_NAME = 'bird-guide-cache-v3';
const API_CACHE_NAME = 'bird-guide-api-cache-v3';

// 只预缓存关键本地资源
const PRE_CACHE_ASSETS = [
    '/',
    '/index.html'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // 使用addAll但捕获单个错误
                return Promise.all(
                    PRE_CACHE_ASSETS.map(asset => {
                        return cache.add(asset).catch(err => {
                            console.warn(`Failed to cache ${asset}:`, err);
                        });
                    })
                );
            })
            .then(() => {
                console.log('All assets cached');
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('Cache installation failed:', err);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME && cache !== API_CACHE_NAME) {
                        console.log('Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('Activation completed');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    const {request} = event;
    const url = new URL(request.url);

    // 不缓存非GET请求
    if (request.method !== 'GET') return;

    // API请求处理
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetchWithCache(event, API_CACHE_NAME)
        );
        return;
    }

    // 静态资源处理
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                // 如果找到缓存且不是HTML文档，返回缓存
                if (cachedResponse && !request.headers.get('accept').includes('text/html')) {
                    return cachedResponse;
                }

                // 否则尝试网络请求
                return fetch(request)
                    .then(networkResponse => {
                        // 只缓存同源且非chrome-extension的请求
                        if (request.url.startsWith('http') && networkResponse.ok) {
                            // 克隆响应以存入缓存
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(request, responseToCache));
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // 网络失败时，对于HTML返回index.html
                        if (request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                        return cachedResponse;
                    });
            })
    );
});

async function fetchWithCache(event, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(event.request);

    // 立即返回缓存（如果有），然后更新缓存
    if (cachedResponse) {
        // 在后台更新缓存
        event.waitUntil(
            fetch(event.request)
                .then(networkResponse => {
                    return cache.put(event.request, networkResponse.clone());
                })
                .catch(() => { /* 忽略更新错误 */
                })
        );
        return cachedResponse;
    }

    // 没有缓存，尝试网络请求
    try {
        const networkResponse = await fetch(event.request);

        if (networkResponse.ok) {
            // 克隆响应以存入缓存
            const responseToCache = networkResponse.clone();
            event.waitUntil(
                cache.put(event.request, responseToCache)
            );
        }

        return networkResponse;
    } catch (error) {
        // 网络请求失败且没有缓存
        throw error;
    }
}