// @ts-ignore
import nextWorker from "./.open-next/worker.js";
const RAILWAY_API_URL =
  "https://touchwood-oo1l.onrender.com/api";

const PRODUCTS_PATH = "/api/products";
const CACHE_TTL = 300;

type CloudflareCacheStorage = CacheStorage & {
  default: Cache;
};

function isProductsGetRequest(request: Request): boolean {
  const url = new URL(request.url);

  return (
    request.method === "GET" &&
    url.pathname === PRODUCTS_PATH
  );
}

function createProductsCacheKey(
  request: Request
): Request {
  const url = new URL(request.url);

  const sortedParams = [
    ...url.searchParams.entries(),
  ].sort(([keyA, valueA], [keyB, valueB]) => {
    if (keyA === keyB) {
      return valueA.localeCompare(valueB);
    }

    return keyA.localeCompare(keyB);
  });

  url.search = "";

  for (const [key, value] of sortedParams) {
    url.searchParams.append(key, value);
  }

  return new Request(url.toString(), {
    method: "GET",
  });
}

async function handleProductsCache(
  request: Request,
  ctx: ExecutionContext
): Promise<Response> {
  const cache =
    (caches as CloudflareCacheStorage).default;

  const cacheKey =
    createProductsCacheKey(request);

  const cachedResponse =
    await cache.match(cacheKey);

  if (cachedResponse) {
    const headers = new Headers(
      cachedResponse.headers
    );

    headers.set(
      "X-Touchwood-Cache",
      "HIT"
    );

    return new Response(
      cachedResponse.body,
      {
        status: cachedResponse.status,
        statusText:
          cachedResponse.statusText,
        headers,
      }
    );
  }

  const incomingUrl =
    new URL(request.url);

  const railwayUrl = new URL(
    `${RAILWAY_API_URL}/products`
  );

  railwayUrl.search =
    incomingUrl.search;

  const railwayResponse =
    await fetch(
      new Request(
        railwayUrl.toString(),
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        }
      )
    );

  if (!railwayResponse.ok) {
    const headers =
      new Headers(
        railwayResponse.headers
      );

    headers.set(
      "X-Touchwood-Cache",
      "MISS"
    );

    return new Response(
      railwayResponse.body,
      {
        status:
          railwayResponse.status,
        statusText:
          railwayResponse.statusText,
        headers,
      }
    );
  }

  const responseHeaders =
    new Headers(
      railwayResponse.headers
    );

  responseHeaders.set(
    "Cache-Control",
    `public, max-age=${CACHE_TTL}`
  );

  responseHeaders.set(
    "X-Touchwood-Cache",
    "MISS"
  );

  const responseToCache =
    new Response(
      railwayResponse.body,
      {
        status:
          railwayResponse.status,
        statusText:
          railwayResponse.statusText,
        headers:
          responseHeaders,
      }
    );

  ctx.waitUntil(
    cache.put(
      cacheKey,
      responseToCache.clone()
    )
  );

  return responseToCache;
}

const worker = {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (
      isProductsGetRequest(request)
    ) {
      return handleProductsCache(
        request,
        ctx
      );
    }

    return nextWorker.fetch(
      request,
      env,
      ctx
    );
  },
};

export default worker;