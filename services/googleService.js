const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const scrapeGoogle = async (query, companyName) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--window-size=1400,900']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Direct navigation to search URL
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2',
      timeout: 120000
    });

    // CAPTCHA handling
    if (await page.$('#captcha-form, #recaptcha')) {
      console.log(`\n🔴 SOLVE CAPTCHA FOR: ${companyName}`);
      await page.waitForFunction(() => !document.querySelector('#captcha-form'), {
        timeout: 300000
      });
    }

    // Wait for results
    await page.waitForSelector('div.g', { timeout: 30000 });

    // Get first valid ZoomInfo link
    const result = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('div.g a[href*="zoominfo.com/c/"]'))
        .filter(a => !a.href.includes('/similar-companies'));
      return links[0]?.href;
    });

    console.log('Google Result:', result);
    return result || null;

  } catch (error) {
    console.error('Google search failed:', error.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
};

module.exports = { scrapeGoogle };