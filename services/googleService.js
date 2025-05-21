// googleService.js
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

const scrapeSearch = async (page, keyword, company) => {
  try {
    const query = `site:zoominfo.com/c/ intext:${keyword} ` +
                  `${company.input_name} ${company.input_domain}`;
    
    await page.goto('https://www.google.com ', { 
      waitUntil: 'networkidle0',
      timeout: 60000 
    });
    
    await page.waitForSelector('textarea[name="q"]', { timeout: 10000 });
    await page.type('textarea[name="q"]', query, { delay: 100 });
    await page.keyboard.press('Enter');
    
    try {
      await page.waitForSelector('div#search', { timeout: 60000 });
    } catch (err) {
      await page.screenshot({ path: `debug_${keyword}_${Date.now()}.png` });
      throw new Error(`Timeout on ${keyword} search`);
    }

    return await page.evaluate((keyword) => {
      const result = document.querySelector('div.MjjYud');
      const snippet = result?.querySelector('.VwiC3b')?.innerText || '';
      const title = result?.querySelector('h3')?.innerText || '';
      const link = result?.querySelector('a')?.href || '-';
      
// In googleService.js scrapeSearch function
const addressMatch = snippet.match(
  /headquarters.*?(?:[:.]|located at|in)\s+([\d\w\s,.-]+)/i
) || [];
const cleanAddress = addressMatch[1]
  ?.replace(/^(headquarters|located at|are|in)/gi, '')
  .replace(/^\W+/, '') // Remove leading non-word characters
  .trim();

// In googleService.js scrapeSearch function
const domainMatch = snippet.match(
  /(?:website|domain|site|url)\D+?(https?:\/\/)?([\w.-]+\.[a-z]{2,})/i
) || [];
const domain = domainMatch[2] 
  ? domainMatch[2].replace(/^www\./i, '') // Remove www prefix
  : '-';

      // Company name from title
      const companyName = title.split(' - ')[0]?.trim() || '-';

      return {
        data: snippet,
        link,
        address: cleanAddress || '-',
        domain: domain || '-',
        companyName: companyName || '-'
      };

    }, keyword);

  } catch (error) {
    return {
      data: '-',
      link: '-',
      address: '-',
      domain: '-',
      companyName: '-'
    };
  }
};

const scrapeCompany = async (company) => {
  const browser = await initBrowser();
  
  try {
    const [pageHQ, pageRev, pageEmp] = await Promise.all([
      browser.newPage(),
      browser.newPage(),
      browser.newPage()
    ]);

    const [hq, rev, emp] = await Promise.all([
      scrapeSearch(pageHQ, 'Headquarters', company),
      scrapeSearch(pageRev, 'Revenue', company),
      scrapeSearch(pageEmp, 'Employees', company)
    ]);

    await Promise.all([
      pageHQ.close(),
      pageRev.close(),
      pageEmp.close()
    ]);

    // Get best values from all searches
    return {
      given_company_name: company.input_name,
      given_domain: company.input_domain,
      result_company_name: [hq.companyName, rev.companyName, emp.companyName].find(v => v !== '-'),
      result_domain: [hq.domain, rev.domain, emp.domain].find(v => v !== '-'),
      full_address: hq.address || '-',
      revenue: rev.data.match(/\$[\d.,]+\s*(million|billion|thousand|m|b|k)?/i)?.[0] || '-',
      employees: emp.data.match(/(\d+)\s+employees/i)?.[1] || '-',
      hq_link: hq.link,
      revenue_link: rev.link,
      employees_link: emp.link,
      link_consistency: 
        (hq.link === rev.link && hq.link === emp.link) 
          ? 'Consistent' 
          : 'Inconsistent'
    };

  } catch (error) {
    return {
      given_company_name: company.input_name,
      given_domain: company.input_domain,
      error: error.message
    };
  }
};

module.exports = { scrapeCompany };