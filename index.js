<<<<<<< HEAD
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
=======
const { CheerioCrawler, RequestList, log } = require('crawlee');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');

// Get command-line args for product and max number of products
const args = process.argv.slice(2);
const productQuery = args[0] || 'mobile';  // default to 'mobile'
const maxProducts = parseInt(args[1], 10) || 50;  // default max products to 50

const csvFilePath = 'flipkart-products.csv';
const csvWriter = createObjectCsvWriter({
    path: csvFilePath,
    header: [
        { id: 'title', title: 'Title' },
        { id: 'price', title: 'Price' },
       
>>>>>>> f76a2ad9fc51655a9f606f27968d8656b5ead59e
    ],
    append: fs.existsSync(csvFilePath),
});

<<<<<<< HEAD
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
=======
// Helper to find title
function findTitle($) {
    let title = $('h1').first().text().trim();
    if (title) return title;

    title = $('meta[property="og:title"]').attr('content');
    if (title) return title.trim();

    title = $('title').text().trim();
    if (title) return title;

    return null;
}

// Helper to find price
function findPrice($) {
    let price = $('meta[itemprop="price"]').attr('content');
    if (price) return price.trim();

    let priceElem = $('body').find('*').filter((_, el) => {
>>>>>>> f76a2ad9fc51655a9f606f27968d8656b5ead59e
        const text = $(el).text();
        return /\₹[\d,]+/.test(text);
    }).first();

    if (priceElem.length) {
        const matched = priceElem.text().match(/\₹[\d,]+/);
        if (matched) return matched[0].trim();
    }
<<<<<<< HEAD
    return null;
}

// --------------------
// Flipkart Scraper (CheerioCrawler)
// --------------------
async function scrapeFlipkart() {
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(productQuery)}`;
    const requestList = await RequestList.open('flipkart-urls', [searchUrl]);
=======

    price = $('[data-price]').attr('data-price') || $('[price]').attr('price');
    if (price) return price.trim();

    return null;
}

(async () => {
   
    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(productQuery)}`;

    const requestList = await RequestList.open('flipkart-urls', [searchUrl]);

>>>>>>> f76a2ad9fc51655a9f606f27968d8656b5ead59e
    let productsScraped = 0;

    const crawler = new CheerioCrawler({
        requestList,
<<<<<<< HEAD
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
=======
        maxRequestsPerCrawl: 200,
        maxConcurrency: 2,
        requestHandlerTimeoutSecs: 60,

        async requestHandler({ request, $, enqueueLinks }) {
            const url = request.url;
            log.info(`Crawling: ${url}`);

            // If search/listing page, enqueue product links but only if we haven't reached maxProducts
            if (url.includes('/search') && productsScraped < maxProducts) {
                const productLinks = [];

                $('a').each((_, el) => {
                    const href = $(el).attr('href');
                    if (href && /\/p\/|\/itm|\/product\//i.test(href)) {
>>>>>>> f76a2ad9fc51655a9f606f27968d8656b5ead59e
                        const absoluteUrl = new URL(href, 'https://www.flipkart.com').href;
                        productLinks.push(absoluteUrl);
                    }
                });
<<<<<<< HEAD
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
=======

                // Enqueue only as many products as needed to not exceed maxProducts
                const toEnqueue = productLinks.slice(0, maxProducts - productsScraped);

                await enqueueLinks({
                    urls: toEnqueue,
                    label: 'product',
                });

                log.info(`Enqueued ${toEnqueue.length} product links`);
            }

            // If product page, extract data and write to CSV
            if ((request.userData.label === 'product' || /\/p\/|\/itm|\/product\//i.test(url)) && productsScraped < maxProducts) {
                const title = findTitle($);
                const price = findPrice($);
                const rating = $('div._3LWZlK').first().text().trim() || null;
                const description = $('meta[name="description"]').attr('content')?.trim() || null;

                if (!title || !price) {
                    log.warning(`Missing title or price on ${url}, skipping save.`);
                    return;
                }

                const productData = {
                    title,
                    price,
                    rating,
                    description,
                    fetchedAt: new Date().toISOString(),
                };

                await csvWriter.writeRecords([productData]);
                log.info(`✅ Saved: ${title}`);

                productsScraped++;
                if (productsScraped >= maxProducts) {
                    log.info(`Reached max products limit (${maxProducts}). Stopping crawl.`);
                    crawler.abort();  
                }
            }
        },

        async failedRequestHandler({ request }) {
            log.warning(`❌ Failed: ${request.url}`);
        },
    });

    await crawler.run();
    log.info(`✅ Crawl complete. Scraped ${productsScraped} products. Data saved to ${csvFilePath}.`);
})();
>>>>>>> f76a2ad9fc51655a9f606f27968d8656b5ead59e
