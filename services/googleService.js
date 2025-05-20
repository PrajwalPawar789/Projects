const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

let browser = null;

const initBrowser = async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--window-size=1400,900']
    });
  }
  return browser;
};

const scrapeGoogle = async (query, companyName) => {
  const browser = await initBrowser();
  const page = await browser.newPage();
  
  try {
    // Natural navigation flow
    await page.goto('https://www.google.com', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });
    
    // Type query like human
    await page.type('textarea[name="q"]', query, { delay: 100 });
    await page.keyboard.press('Enter');

    // CAPTCHA handling
    const captchaSolved = await page.waitForFunction(() => {
      const captcha = document.querySelector('#captcha-form, #recaptcha');
      const results = document.querySelector('div.MjjYud');
      return !captcha && results;
    }, { timeout: 300000 });

    // Extract first valid result
    const result = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('div.MjjYud a'))
        .filter(a => {
          const href = a.href;
          return href.includes('zoominfo.com/c/') && 
                 !href.includes('similar-companies') &&
                 a.querySelector('h3.LC20lb');
        });
      return results[0]?.href;
    });

    console.log('Google Result:', result);
    return result || null;

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