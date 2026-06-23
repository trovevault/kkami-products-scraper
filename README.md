# Kkami.nl Product Scraper

Kkami.nl Product Scraper extracts public product catalog data from kkami.nl, a B2B wholesale site for Korean children's fashion. Give it product, category, or brand URLs and it returns structured product rows with title, SKU, price signals, currency, availability, brand, categories, breadcrumbs, images, variants, descriptions, and product URLs.

Use it when you need a repeatable dataset for wholesale catalog review, assortment tracking, product enrichment, competitor research, or pricing and availability monitoring without manually opening product pages and copying fields into spreadsheets.

## Why use this actor

- Scrape individual product pages, brand pages, and category pages from kkami.nl.
- Follow pagination automatically on supported category and brand listing pages.
- Return buyer-facing catalog fields such as `title`, `sku`, `price`, `originalPrice`, `currency`, `availability`, `brand`, `categories`, `images`, and `url`.
- Keep breadcrumbs and variants for merchandising and product taxonomy review.
- Limit runs with `maxProducts` for smoke tests or scheduled monitoring.
- Append output into an existing Apify dataset with `datasetId`.
- Pass `runId` through a larger product-intelligence workflow.

## What data it extracts

| Field | Meaning |
| --- | --- |
| `url` | Product page URL. |
| `productId` | Internal public product ID when available. |
| `title` | Product name. |
| `sku` | SKU or item ID. |
| `brand` | Brand name when visible. |
| `price` / `originalPrice` | Current and original price signals when visible. |
| `currency` | Detected currency. |
| `availability` | Public availability or backorder text. |
| `categories` | Product categories. |
| `breadcrumbs` | Breadcrumb path with names and URLs. |
| `images` | Product image URLs. |
| `variants` | Variant attributes such as size or colour when exposed. |
| `shortDescription` / `description` | Public product descriptions when visible. |

## Use cases

- **Wholesale catalog monitoring:** track newly listed children's fashion products and changing availability.
- **Brand and category research:** export products for specific Kkami brand or category pages.
- **Assortment analysis:** compare SKUs, categories, variants, images, and descriptions across product groups.
- **Pricing review:** monitor visible price and original-price fields for public catalog pages.
- **Product feed enrichment:** collect structured product rows for spreadsheets, BI tools, or downstream catalog workflows.
- **Scheduled checks:** run the same brand or category URL regularly and append rows to a shared dataset.

## Supported URL types

The actor accepts:

- Product pages, for example `https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/`
- Brand pages, for example `https://www.kkami.nl/brand/bonito/`
- Category pages, for example `https://www.kkami.nl/shop/child/`

Category and brand pages are paginated when the public page exposes pagination links.

## How to use it

1. Add one or more kkami.nl URLs to `startUrls`.
2. Set `maxProducts` to a small number, such as 5, for a smoke test.
3. Leave `proxyConfiguration` off unless requests are blocked.
4. Run the actor and review the Overview dataset table.
5. Export results as JSON, CSV, Excel, XML, or HTML from Apify.

## Input example

```json
{
  "startUrls": [
    "https://www.kkami.nl/brand/bonito/"
  ],
  "maxProducts": 25,
  "runId": "bonito-weekly-catalog-check"
}
```

### Input reference

| Field | Required | Description |
| --- | --- | --- |
| `startUrls` | Yes | Product, category, or brand URLs from kkami.nl. |
| `maxProducts` | No | Maximum total products across all input URLs. Use `0` for no explicit cap. |
| `proxyConfiguration` | No | Apify Proxy settings. Enable proxy only if public requests are blocked. |
| `datasetId` | No | Existing dataset to append product rows into. |
| `runId` | No | Workflow identifier copied into run context for integrations. |

## Output example

```json
{
  "url": "https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/",
  "productId": 7819668,
  "title": "Madeleine Set (set of 3)",
  "sku": "461017MBSD",
  "brand": null,
  "price": 11.9,
  "originalPrice": null,
  "currency": "EUR",
  "availability": "Possibly (partially) on backorder",
  "categories": ["Child", "Junior", "Child unisex", "Junior unisex"],
  "breadcrumbs": [
    { "name": "Home", "url": "https://www.kkami.nl" },
    { "name": "Wholesale Shop", "url": "https://www.kkami.nl/shop/" },
    { "name": "Child unisex", "url": "https://www.kkami.nl/product-category/child/child-unisex/" },
    { "name": "Madeleine Set (set of 3)", "url": "https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/" }
  ],
  "images": [
    "https://www.kkami.nl/wp-content/uploads/2026/03/461017MBSD.jpg"
  ],
  "variants": [],
  "shortDescription": null,
  "description": null
}
```

## API usage

```bash
curl -X POST "https://api.apify.com/v2/acts/trovevault~kkami-products-scraper/runs" \
  -H "Authorization: Bearer $APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startUrls": ["https://www.kkami.nl/brand/bonito/"],
    "maxProducts": 25
  }'
```

## Limitations

- The actor is specific to public kkami.nl product, category, and brand pages.
- It does not log in, access private wholesale account data, or bypass access controls.
- Prices, availability, variants, and descriptions are public-page signals and can change after the run.
- Some fields may be `null` when the page does not expose them clearly.
- Pagination depends on the public page structure; if Kkami changes markup, discovery may need an update.
- The actor is not a full WooCommerce scraper for arbitrary stores.

## Troubleshooting

| Problem | What to try |
| --- | --- |
| No products returned | Test with one known product URL first, then try the brand or category URL again. |
| Category run is too large | Set `maxProducts` to a small number while testing. |
| Missing price or availability | Open the product URL and confirm the value is visible publicly. |
| Images are incomplete | Some products expose only a primary image or lazy-load images differently. |
| Requests are blocked | Enable Apify Proxy and rerun with a smaller `maxProducts` value. |
| Scheduled runs are hard to compare | Use a stable `datasetId` and `runId` for repeat monitoring. |

## FAQ

**Can I scrape all products from a brand page?**  
Yes, if the public brand page exposes product links and pagination. Use `maxProducts` to control run size.

**Can I scrape multiple categories or brands in one run?**  
Yes. Add multiple URLs to `startUrls`.

**Does this actor work on other WooCommerce stores?**  
No. It is tuned for kkami.nl. Use a generic WooCommerce or product scraper for other stores.

**Does it require a Kkami account?**  
No. It uses public pages only.

**Why are some values null?**  
The value was not visible or reliable enough to parse from the public page.

**Can I run it on a schedule?**  
Yes. Use Apify schedules and append rows with `datasetId` for recurring catalog monitoring.

**Can I use it through the Apify API or MCP?**  
Yes. The actor can be called through the Apify API, and MCP workflows can trigger Apify actors when configured to do so.

## Related actors

- WooCommerce Products Scraper for broader WooCommerce storefronts.
- Shopify Products Scraper for Shopify catalogs.
- BigCommerce Products Scraper for BigCommerce stores.
- PrestaShop Products Scraper for PrestaShop storefronts.

## Changelog

- 0.1: Initial TroveVault release for kkami.nl product pages, category pages, brand pages, automatic pagination, product fields, `datasetId`, and `runId`.

## Feedback and support

Open an issue on the actor page with the input URL, run ID, expected product field, and a short description of what was missing or incorrect.
