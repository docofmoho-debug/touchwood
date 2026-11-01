// @ts-ignore
import nextWorker from "./.open-next/worker.js";

const RAILWAY_API_URL =
  "https://touchwood-oo1l.onrender.com/api";

const PRODUCTS_PATH = "/api/products";
const REVIEWS_PATH = "/api/reviews/product/";
const DEMO_REVIEWS_PATH = "/api/demo-reviews/product/";

const PRODUCTS_CACHE_TTL = 600;
const REVIEWS_CACHE_TTL =20000 ;

function isCacheableGetRequest(request: Request): boolean {
  if (request.method !== "GET") {
    return false;
  }

  if (request.headers.has("Authorization")) {
    return false;
  }

  const url = new URL(request.url);

  return (
    url.pathname === PRODUCTS_PATH ||
    url.pathname.startsWith(`${PRODUCTS_PATH}/`) ||
    url.pathname.startsWith(REVIEWS_PATH) ||
    url.pathname.startsWith(DEMO_REVIEWS_PATH)
  );
}

function getCacheTtl(request: Request): number {
  const url = new URL(request.url);

  if (
    url.pathname.startsWith(REVIEWS_PATH) ||
    url.pathname.startsWith(DEMO_REVIEWS_PATH)
  ) {
    return REVIEWS_CACHE_TTL;
  }

  return PRODUCTS_CACHE_TTL;
}

function createRailwayUrl(request: Request): URL {
  const incomingUrl = new URL(request.url);
  const railwayPath = incomingUrl.pathname.replace(/^\/api/, "");
  const railwayUrl = new URL(`${RAILWAY_API_URL}${railwayPath}`);

  railwayUrl.search = incomingUrl.search;
  railwayUrl.searchParams.sort();

  return railwayUrl;
}

async function handleCachedRequest(request: Request): Promise<Response> {
  const railwayUrl = createRailwayUrl(request);
  const cacheTtl = getCacheTtl(request);

  const railwayResponse = await fetch(railwayUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: cacheTtl,
      cacheTtlByStatus: {
        "200-299": cacheTtl,
        "404": 30,
        "500-599": 0,
      },
    },
  });

  const headers = new Headers(railwayResponse.headers);
  const cacheStatus = railwayResponse.headers.get("CF-Cache-Status");

  headers.set("X-Touchwood-Cache", cacheStatus || "MISS");
  headers.set(
    "Cache-Control",
    `public, max-age=60, s-maxage=${cacheTtl}, stale-while-revalidate=60`
  );

  return new Response(railwayResponse.body, {
    status: railwayResponse.status,
    statusText: railwayResponse.statusText,
    headers,
  });
}

const worker = {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (isCacheableGetRequest(request)) {
      return handleCachedRequest(request);
    }

    return nextWorker.fetch(request, env, ctx);
  },
};

export default worker;