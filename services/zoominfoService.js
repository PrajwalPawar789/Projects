const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { initBrowser } = require('./googleService');

const scrapeZoomInfo = async (url) => {
  const browser = await initBrowser();
  const page = await browser.newPage();

  try {
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 120000
    });

    // Wait for critical elements
    await page.waitForSelector('h1.LC20lb', { timeout: 30000 });
    
    return await page.evaluate(() => {
      const getText = (selector) => 
        document.querySelector(selector)?.textContent?.trim() || '-';

      return {
        name: getText('h1.LC20lb'),
        domain: getText('a[data-testid="company-website"]') || 
               getText('a:contains("Website")'),
        revenue: getText('*:contains("Revenue") + div, dt:contains("Revenue") + dd')
      };
    });

  } catch (error) {
    console.error('ZoomInfo error:', error.message);
    return { name: '-', domain: '-', revenue: '-' };
  } finally {
    await page.close();
  }
};

module.exports = { scrapeZoomInfo };