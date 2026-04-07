# Kkami.nl Product Scraper

Scrape product data from kkami.nl — a B2B wholesale platform for Korean children's fashion. Returns title, SKU, images, categories, breadcrumbs, availability, variant options, and more. Supports both individual product pages and category or brand pages for bulk scraping. Optional login for price data.

---

## What data does it extract?

| Field | Description | Auth required |
|---|---|---|
| `title` | Product name | No |
| `sku` | Product SKU / item ID | No |
| `productId` | Internal WooCommerce product ID | No |
| `brand` | Brand name | No |
| `categories` | Category hierarchy | No |
| `breadcrumbs` | Full breadcrumb path with URLs | No |
| `images` | All product image URLs | No |
| `availability` | Stock availability text | No |
| `variants` | Variant attribute names and options (e.g. size, colour) | No |
| `shortDescription` | Short product description | No |
| `description` | Full product description | No |
| `price` | Current price (sale price if on sale) | Yes |
| `originalPrice` | Original price before discount | Yes |
| `currency` | Currency code (EUR) | Yes |

---

## How to use

1. Enter one or more kkami.nl URLs in the **Start URLs** field.
2. Optionally set **Max Products** to limit the run (0 = no limit).
3. To include prices: enter your kkami.nl **Username** and **Password**.
4. Run the actor and download results as JSON, CSV, or Excel.

### Supported URL types

- **Product page**: `https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/`
- **Brand page**: `https://www.kkami.nl/brand/bonito/`
- **Category page**: `https://www.kkami.nl/shop/child/`

Category and brand pages are automatically paginated — all products across all pages are scraped.

---

## Authentication and pricing

Kkami.nl is a B2B wholesale platform. Product prices are only visible to registered accounts. When you provide valid login credentials, the actor logs in before scraping and includes `price`, `originalPrice`, and `currency` in every product record.

Credentials are stored as a secret and never logged or included in output.

---

## Output example

```json
{
  "url": "https://www.kkami.nl/shop/child/child-unisex/madeleine-set-set-of-3/",
  "productId": 7819668,
  "title": "Madeleine Set (set of 3)",
  "sku": "461017MBSD",
  "brand": null,
  "price": null,
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
    "https://www.kkami.nl/wp-content/uploads/2026/03/461017MBSD.jpg",
    "https://www.kkami.nl/wp-content/uploads/2026/03/Bonito-Korean-Children-Fashion-Brand-kidsshorts-461017MBSD-large.jpg"
  ],
  "variants": [],
  "shortDescription": null,
  "description": null
}
```
