const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let browser = null;

const initBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--window-size=1400,900'],
      defaultViewport: null
    });
  }
  return browser;
};

const scrapeGoogle = async (query, companyName) => {
  const browser = await initBrowser();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.google.com ', { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });

    await page.waitForSelector('textarea[name="q"]', { timeout: 10000 });
    await page.type('textarea[name="q"]', query, { delay: 100 });
    await page.keyboard.press('Enter');

    await page.waitForSelector('div#search', { timeout: 30000 });

    const captchaExists = await page.$('#captcha-form, #recaptcha');
    if (captchaExists) {
      await page.screenshot({ path: 'captcha_error.png' });
      throw new Error('CAPTCHA detected');
    }

    const rawData = await page.evaluate((companyName) => {
      const results = Array.from(document.querySelectorAll('div.MjjYud'));
      return results.map(result => {
        const title = result.querySelector('h3')?.innerText.trim() || '';
        const snippet = result.querySelector('.VwiC3b')?.innerText.trim() || '';
        const link = result.querySelector('a')?.href.trim() || '';
        return { title, snippet, link };
      });
    }, companyName);

    console.log('Raw data from Google:', rawData);

    // Find best matching result
    const validResults = rawData.filter(item => 
      item.link.includes('zoominfo.com/c/') &&
      !item.link.includes('similar-companies') &&
      (item.title.toLowerCase().includes(companyName.toLowerCase()) || 
       item.snippet.toLowerCase().includes(companyName.toLowerCase()))
    );

    if (validResults.length === 0) {
      console.log('No valid ZoomInfo results found');
      return null;
    }

    const bestMatch = validResults[0];

    // Extract domain from snippet
    const domainMatch = bestMatch.snippet.match(
      /(?:website|site|domain)\s*:\s*(https?:\/\/)?([^\/\s]+)/gi
    )?.[0] || bestMatch.snippet.match(
      /www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/gi
    )?.[0] || '-';

    // Clean domain value
    const cleanDomain = domainMatch
      .replace(/^(website|site|domain)\s*:\s*/i, '')
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .trim();

    // Extract revenue
    const revenueMatch = bestMatch.snippet.match(
      /\$[\d.,]+\s*(million|billion|thousand|m|b|k)?/gi
    );

    return {
      name: bestMatch.title,
      domain: cleanDomain || '-',
      revenue: revenueMatch ? revenueMatch[0] : '-',
      url: bestMatch.link
    };

  } catch (error) {
    console.error('Google search failed:', error.message);
    return null;
  } finally {
    await page.close();
  }
};

const closeBrowser = async () => {
  if (browser) {
    await browser.close();
    browser = null;
  }
};

module.exports = { scrapeGoogle, closeBrowser };