# Kkami.nl Product Scraper

Scrape product data from kkami.nl — a B2B wholesale platform for Korean children's fashion. Returns title, SKU, images, categories, breadcrumbs, availability, variant options, short description, and full description. Supports both individual product pages and category or brand pages for bulk scraping with automatic pagination.

---

## What data does it extract?

| Field | Description |
|---|---|
| `url` | Product page URL |
| `productId` | Internal WooCommerce product ID |
| `title` | Product name |
| `sku` | Product SKU / item ID |
| `brand` | Brand name |
| `availability` | Stock availability text |
| `categories` | Category hierarchy (e.g. Child, Junior, Child unisex) |
| `breadcrumbs` | Full breadcrumb path with URLs |
| `images` | All product image URLs |
| `variants` | Variant attribute names and options (e.g. size, colour) |
| `shortDescription` | Short product description |
| `description` | Full product description |

---

## How to use

1. Enter one or more kkami.nl URLs in the **Start URLs** field.
2. Optionally set **Max Products** to limit the run (0 = no limit).
3. Run the actor and download results as JSON, CSV, or Excel.

### Supported URL types

- **Product page**: `https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/`
- **Brand page**: `https://www.kkami.nl/brand/bonito/`
- **Category page**: `https://www.kkami.nl/shop/child/`

Category and brand pages are automatically paginated — all products across all pages are scraped.

---

## Output example

```json
{
  "url": "https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/",
  "productId": 7819668,
  "title": "Madeleine Set (set of 3)",
  "sku": "461017MBSD",
  "brand": null,
  "availability": "Possibly (partially) on backorder",
  "categories": ["Child", "Junior", "Child unisex", "Junior unisex"],
  "breadcrumbs": [
    { "name": "Home", "url": "https://www.kkami.nl" },
    { "name": "Wholesale Shop", "url": "https://www.kkami.nl/shop/" },
    { "name": "Child unisex", "url": "https://www.kkami.nl/product-category/child/child-unisex/" },
    { "name": "Madeleine Set (set of 3)", "url": "https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/" }
  ],
  "images": [
    "https://www.kkami.nl/wp-content/uploads/2026/03/461017MBSD.jpg",
    "https://www.kkami.nl/wp-content/uploads/2026/03/Bonito-Korean-Children-Fashion-Brand-kidsshorts-461017MBSD-large.jpg"
  ],
  "variants": [],
  "shortDescription": null,
  "description": null
}
```

---

## Frequently asked questions

**Can I scrape all products from a brand page?**
Yes. Enter the brand page URL (e.g. `https://www.kkami.nl/brand/bonito/`) and the actor will automatically paginate through all pages and return every product.

**Can I scrape multiple categories or brands in one run?**
Yes. Add multiple URLs to the Start URLs field. The actor processes each one sequentially.

**Can I use this actor via the Apify API?**
Yes. Use the [Run Actor](https://docs.apify.com/api/v2#/reference/actors/run-collection/run-actor) endpoint with your actor ID and input JSON. Results are available as JSON, CSV, or Excel via the dataset API.

**Can I use this actor through an MCP Server?**
Yes. Via the [Apify MCP server](https://mcp.apify.com), you can call this actor from any MCP-compatible AI assistant (Claude, ChatGPT, etc.) to scrape kkami.nl products in real time.

**Is scraping kkami.nl legal?**
This actor only accesses publicly available pages — the same data visible to any visitor without an account. Always review kkami.nl's terms of service before scraping.

---

## Changelog

### 2026-04-07 — v0.1
- Initial release
- Supports product pages, category pages, and brand pages
- Automatic pagination for category and brand listings
- Extracts title, SKU, images, categories, breadcrumbs, availability, variants, and descriptions

---

## Your feedback

Found a bug or have a feature request? [Open an issue](https://github.com/apify/apify-community/issues) or contact us through the Apify platform.
