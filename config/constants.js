module.exports = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  GOOGLE_URL: 'https://www.google.com',
  ZOOMINFO_URL: 'https://www.zoominfo.com',
  SELECTORS: {
    GOOGLE_FIRST_RESULT: 'div#search a[href*="zoominfo.com/c/"]',
    ZOOMINFO_NAME: 'h1[data-testid="companyName"]',
    ZOOMINFO_DOMAIN: 'a[data-testid="company-website"]',
    ZOOMINFO_REVENUE: 'div:contains("Revenue") + div, dt:contains("Revenue") + dd',
    CAPTCHA: '#captcha, #recaptcha'
  },
  DEBUG: true
};