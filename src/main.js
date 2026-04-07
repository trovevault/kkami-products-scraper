import { Actor, log } from 'apify';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

await Actor.init();

const input = await Actor.getInput();
const {
    startUrls = [],
    maxProducts = 0,
    username,
    password,
    proxyConfiguration: proxyConfig,
    datasetId,
} = input || {};

const additionalDataset = datasetId ? await Actor.openDataset(datasetId) : null;

const proxyConfiguration = proxyConfig
    ? await Actor.createProxyConfiguration(proxyConfig)
    : null;

// ---------------------------------------------------------------------------
// Cookie jar — persists session across all requests
// ---------------------------------------------------------------------------
const cookies = {};

const parseCookieHeaders = (headers) => {
    const vals = headers.getSetCookie ? headers.getSetCookie() : [];
    for (const raw of vals) {
        const [pair] = raw.split(';');
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
            const name = pair.slice(0, eqIdx).trim();
            const value = pair.slice(eqIdx + 1).trim();
            cookies[name] = value;
        }
    }
};

const cookieHeader = () =>
    Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');

// ---------------------------------------------------------------------------
// Fetch helper — injects cookies and proxy, updates cookie jar on response
// ---------------------------------------------------------------------------
const BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
};

const siteFetch = async (url, options = {}) => {
    let dispatcher;
    if (proxyConfiguration) {
        const proxyUrl = await proxyConfiguration.newUrl();
        dispatcher = new ProxyAgent(proxyUrl);
    }

    const jar = cookieHeader();
    const response = await undiciFetch(url, {
        ...options,
        headers: {
            ...BASE_HEADERS,
            ...(jar ? { Cookie: jar } : {}),
            ...options.headers,
        },
        dispatcher,
    });

    parseCookieHeaders(response.headers);
    return response;
};

// ---------------------------------------------------------------------------
// Login — POST WooCommerce login form, populate cookie jar with session
// ---------------------------------------------------------------------------
const login = async () => {
    log.info('Logging in to kkami.nl...');

    const loginPage = await siteFetch('https://www.kkami.nl/my-account/');
    const html = await loginPage.text();

    const nonceMatch = html.match(/id="woocommerce-login-nonce"[^>]*value="([^"]+)"/);
    if (!nonceMatch) throw new Error('Could not find login nonce on /my-account/ page.');
    const nonce = nonceMatch[1];

    const refererMatch = html.match(/name="_wp_http_referer"[^>]*value="([^"]+)"/);
    const wpReferer = refererMatch ? refererMatch[1] : '/my-account/';

    const body = new URLSearchParams({
        username,
        password,
        'woocommerce-login-nonce': nonce,
        '_wp_http_referer': wpReferer,
        redirect: '',
        login: 'Log in',
    });

    const response = await siteFetch('https://www.kkami.nl/my-account/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: 'https://www.kkami.nl/my-account/',
            Origin: 'https://www.kkami.nl',
        },
        body: body.toString(),
        redirect: 'follow',
    });

    const responseHtml = await response.text();

    if (responseHtml.includes('woocommerce-error') || responseHtml.includes('woocommerce-login-nonce')) {
        const errMatch = responseHtml.match(/<li>(.*?)<\/li>/s);
        const msg = errMatch ? errMatch[1].replace(/<[^>]+>/g, '').trim() : 'Invalid credentials.';
        throw new Error(`Login failed: ${msg}`);
    }

    log.info('Login successful — price data will be included in output.');
};

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------
const extractProductLinks = (html) => {
    const seen = new Set();
    const results = [];
    for (const [, url] of html.matchAll(/href="(https:\/\/www\.kkami\.nl\/shop\/[^"?#]+\/)"/g)) {
        if (!seen.has(url)) { seen.add(url); results.push(url); }
    }
    return results;
};

const hasNextPage = (html) =>
    html.includes('class="next page-numbers"') || html.includes('"next page-numbers"');

const stripTags = (str) => str
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')   // remove inline CSS blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // remove inline JS blocks
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---------------------------------------------------------------------------
// Product scraper
// ---------------------------------------------------------------------------
const scrapeProduct = async (url, prefetchedHtml = null) => {
    let html = prefetchedHtml;
    if (!html) {
        const response = await siteFetch(url);
        if (!response.ok) {
            log.warning(`${url} returned HTTP ${response.status}. Skipping.`);
            return null;
        }
        html = await response.text();
    }

    if (!html.includes('product_title')) return null;

    // Title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>(.*?)<\/h1>/s);
    const title = titleMatch ? stripTags(titleMatch[1]) : null;

    // SKU + categories + currency — from the GA view_item event only (scoped to avoid
    // picking up data from related products or navigation events on the same page).
    const viewItemMatch = html.match(/gtag\s*\(\s*'event'\s*,\s*'view_item'[\s\S]*?JSON\.parse\(`([\s\S]*?)`\)/);
    let sku = null;
    let currency = 'EUR';
    let categories = [];
    if (viewItemMatch) {
        const raw = viewItemMatch[1];
        const skuM = raw.match(/\\"item_id\\":\\"([^\\]+)\\"/);
        if (skuM) sku = skuM[1];
        const currM = raw.match(/\\"currency\\":\\"([^\\]+)\\"/);
        if (currM) currency = currM[1];
        const catMatches = [...raw.matchAll(/\\"item_category\d*\\":\\"([^\\]+)\\"/g)];
        categories = [...new Set(catMatches.map((m) => m[1]))];
    }

    // Brand — last segment of URL before product slug, or from breadcrumbs
    // We derive it from the breadcrumb JSON-LD below

    // Breadcrumbs — from JSON-LD BreadcrumbList
    let breadcrumbs = [];
    let brand = null;
    for (const [, block] of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
        try {
            const data = JSON.parse(block.trim());
            if (data['@type'] === 'BreadcrumbList') {
                breadcrumbs = (data.itemListElement || []).map((item) => ({
                    name: item.item?.name ?? item.name ?? null,
                    url: item.item?.['@id'] ?? item['@id'] ?? null,
                }));
            }
        } catch {}
    }

    // Images — <img> tags with data-src pointing to wp-content/uploads.
    // We require a non-empty alt attribute to exclude generic size-guide placeholders
    // and unrelated thumbnails that appear elsewhere on the page.
    const imgSet = new Set();
    for (const [imgTag] of html.matchAll(/<img[^>]*\bdata-src="https:\/\/www\.kkami\.nl\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*"[^>]*>/gi)) {
        const altMatch = imgTag.match(/\balt="([^"]*)"/i);
        if (!altMatch || altMatch[1].trim() === '') continue;
        const srcMatch = imgTag.match(/\bdata-src="([^"]+)"/i);
        if (srcMatch) imgSet.add(srcMatch[1]);
    }
    const images = [...imgSet];

    // Availability
    const availMatch = html.match(/Stock estimate[^<]*<[^>]+title="([^"]+)"/s);
    const stockStatusMatch = html.match(/class="[^"]*stock[^"]*in-stock[^"]*"/);
    const outOfStockMatch = html.match(/class="[^"]*stock[^"]*out-of-stock[^"]*"/);
    let availability = 'unknown';
    if (availMatch) availability = availMatch[1];
    else if (stockStatusMatch) availability = 'In stock';
    else if (outOfStockMatch) availability = 'Out of stock';

    // Short description
    let shortDescription = null;
    const shortDescMatch = html.match(/class="[^"]*woocommerce-product-details__short-description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (shortDescMatch) {
        const cleaned = stripTags(shortDescMatch[1]);
        if (cleaned && !cleaned.startsWith('.')) shortDescription = cleaned;
    }

    // Full description (tab)
    let description = null;
    const tabDescMatch = html.match(/id="tab-description"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/);
    if (tabDescMatch) {
        const cleaned = stripTags(tabDescMatch[1]);
        if (cleaned) description = cleaned;
    }

    // Product ID
    const productIdMatch = html.match(/data-product_id="(\d+)"/);
    const productId = productIdMatch ? parseInt(productIdMatch[1], 10) : null;

    // Price — only visible when authenticated
    let price = null;
    let originalPrice = null;
    const priceParaMatch = html.match(/<p[^>]*class="[^"]*price[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    if (priceParaMatch) {
        const priceHtml = priceParaMatch[1];
        const bdiMatches = [...priceHtml.matchAll(/<bdi>([\s\S]*?)<\/bdi>/g)];
        const parsedPrices = bdiMatches
            .map((m) => parseFloat(m[1].replace(/[^\d,\.]/g, '').replace(',', '.')))
            .filter((p) => !isNaN(p));

        if (parsedPrices.length >= 2) {
            // <del> is original, <ins> is sale price
            originalPrice = parsedPrices[0];
            price = parsedPrices[1];
        } else if (parsedPrices.length === 1) {
            price = parsedPrices[0];
        }
    }

    // Variant options — extract attribute names and values from the form
    const variants = [];
    const variantOptionMatches = [...html.matchAll(/class="[^"]*variations[^"]*"[\s\S]*?<select[^>]*name="attribute_([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)];
    for (const [, attrName, optionsHtml] of variantOptionMatches) {
        const optionValues = [...optionsHtml.matchAll(/<option[^>]*value="([^"]+)"/g)].map((m) => m[1]);
        if (optionValues.length) {
            variants.push({
                attribute: attrName.replace(/^pa_/, ''),
                options: optionValues,
            });
        }
    }

    return {
        url,
        productId,
        title,
        sku,
        brand,
        price,
        originalPrice,
        currency,
        availability,
        categories,
        breadcrumbs,
        images,
        variants,
        shortDescription,
        description,
    };
};

// ---------------------------------------------------------------------------
// Category crawler — paginates /page/N/ and returns all product URLs
// ---------------------------------------------------------------------------
const crawlCategory = async (baseUrl, firstPageHtml) => {
    const allLinks = new Set(extractProductLinks(firstPageHtml));
    if (!hasNextPage(firstPageHtml)) return [...allLinks];

    const base = baseUrl.replace(/\/$/, '');
    let page = 2;

    while (true) {
        if (maxProducts > 0 && allLinks.size >= maxProducts) break;

        const pageUrl = `${base}/page/${page}/`;
        log.info(`  Paginating: ${pageUrl}`);

        const resp = await siteFetch(pageUrl);
        if (!resp.ok) break;
        const html = await resp.text();

        const links = extractProductLinks(html);
        if (links.length === 0) break;
        for (const l of links) allLinks.add(l);

        if (!hasNextPage(html)) break;
        page++;
        await new Promise((r) => setTimeout(r, 400));
    }

    return [...allLinks];
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
if (username && password) {
    await login();
} else {
    log.info('No credentials provided — scraping public data only. Prices will not be available.');
}

const productUrls = new Map(); // url -> prefetched html (or null for category-discovered URLs)

for (const entry of startUrls) {
    const url = typeof entry === 'string' ? entry : entry.url;
    log.info(`Processing start URL: ${url}`);

    const resp = await siteFetch(url);
    if (!resp.ok) {
        log.warning(`Could not fetch ${url} (HTTP ${resp.status}). Skipping.`);
        continue;
    }
    const html = await resp.text();

    if (html.includes('product_title') && html.includes('data-product_id')) {
        // Product page — reuse the already-fetched HTML to avoid a second request
        productUrls.set(url, html);
    } else {
        // Category / brand page — collect all product links across pages
        const links = await crawlCategory(url, html);
        log.info(`  Found ${links.length} products on ${url}`);
        for (const l of links) productUrls.set(l, null);
    }

    if (maxProducts > 0 && productUrls.size >= maxProducts) break;
}

const urlList = maxProducts > 0
    ? [...productUrls.entries()].slice(0, maxProducts)
    : [...productUrls.entries()];

log.info(`Scraping ${urlList.length} products...`);

let count = 0;
for (const [url, prefetchedHtml] of urlList) {
    try {
        log.info(`[${count + 1}/${urlList.length}] ${url}`);
        const product = await scrapeProduct(url, prefetchedHtml);
        if (product) {
            await Actor.pushData(product);
            if (additionalDataset) await additionalDataset.pushData(product);
            count++;
        }
    } catch (err) {
        log.error(`Failed to scrape ${url}: ${err.message}`);
        await Actor.pushData({ url, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 300));
}

log.info(`Done. Scraped ${count} products.`);
await Actor.exit();
