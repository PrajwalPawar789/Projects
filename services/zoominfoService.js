const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const cheerio = require('cheerio');

const scrapeZoomInfo = async (url) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 120000
    });

    // Wait for critical elements
    await page.waitForSelector('h1', { timeout: 30000 });
    
    const html = await page.content();
    const $ = cheerio.load(html);

    // Verified selectors (Jan 2024)
    const name = $('h1').first().text().trim();
    const domain = $('a[data-testid="company-website"]').attr('href') 
                 || $('a:contains("Website")').attr('href');
    const revenue = $('div:contains("Revenue") + div, dt:contains("Revenue") + dd')
      .text().trim().replace(/\s+/g, ' ');

    return {
      name: name || '-',
      domain: domain || '-',
      revenue: revenue || '-'
    };

  } catch (error) {
    console.error('ZoomInfo scraping failed:', error.message);
    return { name: '-', domain: '-', revenue: '-' };
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { scrapeZoomInfo };