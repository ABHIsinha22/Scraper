const { CheerioCrawler, RequestList, log, PlaywrightCrawler } = require('crawlee');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

const args = process.argv.slice(2);
const productQuery = args[0] || 'mobile';
const maxProducts = parseInt(args[1], 10) || 20;

const csvFilePath = 'products.csv';
const csvWriter = createObjectCsvWriter({
    path: csvFilePath,
    header: [
        { id: 'site', title: 'Site' },
        { id: 'title', title: 'Title' },
        { id: 'price', title: 'Price' },
        { id: 'url', title: 'URL' },
    ],
    append: fs.existsSync(csvFilePath),
});

// --------------------
// Helper functions
// --------------------
function findTitle($) {
    return (
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content')?.trim() ||
        $('title').text().trim() ||
        null
    );
}

function findPrice($) {
    let price = $('meta[itemprop="price"]').attr('content');
    if (price) return `₹${price.trim()}`;

    const priceElem = $('body').find('*').filter((_, el) => {
        const text = $(el).text();
        return /\₹[\d,]+/.test(text);
    }).first();

    if (priceElem.length) {
        const matched = priceElem.text().match(/\₹[\d,]+/);
        if (matched) return matched[0].trim();
    }
    return null;
}

// --------------------
// Flipkart Scraper (CheerioCrawler)
// --------------------
async function scrapeFlipkart() {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(productQuery)}`;
    const requestList = await RequestList.open('flipkart-urls', [searchUrl]);
    let productsScraped = 0;

    const crawler = new CheerioCrawler({
        requestList,
        maxRequestsPerCrawl: 100,
        maxConcurrency: 2,
        async requestHandler({ request, $, enqueueLinks }) {
            const url = request.url;

            // Listing page → enqueue product links
            if (url.includes('/search') && productsScraped < maxProducts) {
                const productLinks = [];
                $('a').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href && /\/p\/|\/itm/i.test(href)) {
                        const absoluteUrl = new URL(href, 'https://www.flipkart.com').href;
                        productLinks.push(absoluteUrl);
                    }
                });
                const toEnqueue = productLinks.slice(0, maxProducts - productsScraped);
                await enqueueLinks({ urls: toEnqueue, label: 'product' });
            }

            // Product page → extract details
            if ((request.userData.label === 'product' || /\/p\/|\/itm/i.test(url)) && productsScraped < maxProducts) {
                const title = findTitle($);
                const price = findPrice($);
                if (!title || !price) return;

                const productData = { site: 'Flipkart', title, price, url };
                await csvWriter.writeRecords([productData]);
                log.info(`Flipkart ✅ Saved: ${title}`);
                productsScraped++;
                if (productsScraped >= maxProducts) crawler.abort();
            }
        },
    });

    await crawler.run();
    log.info(`Flipkart crawl complete. Scraped ${productsScraped} products.`);
}

// --------------------
// Amazon Scraper (PlaywrightCrawler)
// --------------------
async function scrapeAmazon() {
    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(productQuery)}`;
    const crawler = new PlaywrightCrawler({
        async requestHandler({ page, request }) {
            log.info(`Amazon Scraping: ${request.url}`);

            const products = await page.$$eval(
                'div.s-main-slot div[data-component-type="s-search-result"]',
                (boxes, limit) =>
                    boxes.slice(0, limit).map((box) => {
                        const title = box.querySelector('h2 span')?.innerText;
                        const price = box.querySelector('span.a-price-whole')?.innerText;
                        const link = box.querySelector('a.a-link-normal')?.href;
                        return title && price ? { title, price: `₹${price}`, url: link } : null;
                    }).filter(Boolean),
                maxProducts   // 👈 pass limit from args
            );

            for (const product of products) {
                await csvWriter.writeRecords([{ site: 'Amazon', ...product }]);
                log.info(`Amazon ✅ Saved: ${product.title}`);
            }
        },
    });

    await crawler.run([searchUrl]);
}

// --------------------
// Run both scrapers
// --------------------
(async () => {
    log.info(`🔎 Starting scrapers for: ${productQuery}`);
    await scrapeFlipkart();
    await scrapeAmazon();
    log.info(`✅ Done. Results saved in ${csvFilePath}`);
})();