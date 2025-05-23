// googleService.js
const axios = require('axios');
const cheerio = require('cheerio');

const API_KEY = 'da222bf17697df8ba02e44aa5f9b30fc';

const parseHtml = async (htmlUrl) => {
  try {
    const { data: html } = await axios.get(htmlUrl);
    const $ = cheerio.load(html);
    
    const result = $('div.g, div.MjjYud').first();
    const title = result.find('h3').text().trim();
    const snippet = result.find('.VwiC3b').text().trim();
    const link = result.find('a').attr('href') || '-';

    return {
      companyName: title.split(' - ')[0]?.replace('...', '') || '-',
      domain: (snippet.match(/(Website|Domain):?\s*(?:https?:\/\/)?(?:www\.)?([\w-]+\.[a-z]{2,})/i) || [])[2] || '-',
      address: (snippet.match(/(Headquarters|Location):?\s*([\w\s,.-]+)/i) || [])[2]?.trim() || '-',
      revenue: (snippet.match(/\$[\d.,]+\s*(million|billion|thousand|m|b|k)?/i) || [])[0] || '-',
      employees: (snippet.match(/(\d+)\s+employees/i) || [])[1] || '-',
      link: link.startsWith('/url?') ? new URLSearchParams(link.split('?')[1]).get('q') : link
    };
  } catch (error) {
    console.error('HTML parsing error:', error);
    return null;
  }
};

const scrapeSearch = async (query) => {
  try {
    const response = await axios.get('https://serpapi.abcproxy.com/search', {
      params: {
        engine: 'google',
        q: query,
        api_key: API_KEY,
        output: 'json',
        fetch_mode: 'static'
      },
      timeout: 20000
    });

    const htmlUrl = response.data.data?.search_metadata?.raw_html_file;
    return htmlUrl ? await parseHtml(htmlUrl) : null;
  } catch (error) {
    console.error('API request failed:', error.message);
    return null;
  }
};

const scrapeCompany = async (company) => {
  const resultTemplate = {
    given_company_name: company.input_name,
    given_domain: company.input_domain,
    result_company_name: '-',
    result_domain: '-',
    full_address: '-',
    revenue: '-',
    employees: '-',
    hq_link: '-',
    revenue_link: '-',
    employees_link: '-',
    link_consistency: 'Inconsistent',
    error: null
  };

  try {
    const [hq, rev, emp] = await Promise.all([
      scrapeSearch(`site:zoominfo.com/c/ intext:"Headquarters" ${company.input_name} ${company.input_domain}`),
      scrapeSearch(`site:zoominfo.com/c/ intext:"Revenue" ${company.input_name} ${company.input_domain}`),
      scrapeSearch(`site:zoominfo.com/c/ intext:"Employees" ${company.input_name} ${company.input_domain}`)
    
    ]);

    if (!hq || !rev || !emp) {
      throw new Error('Partial data missing from API responses');
    }

    return {
      ...resultTemplate,
      result_company_name: [hq.companyName, rev.companyName, emp.companyName].find(v => v !== '-') || '-',
      result_domain: [hq.domain, rev.domain, emp.domain].find(v => v !== '-') || '-',
      full_address: hq.address,
      revenue: rev.revenue,
      employees: emp.employees,
      hq_link: hq.link,
      revenue_link: rev.link,
      employees_link: emp.link,
      link_consistency: [hq.link, rev.link, emp.link].every(l => l === hq.link) ? 'Consistent' : 'Inconsistent'
    };
  } catch (error) {
    return {
      ...resultTemplate,
      error: error.message
    };
  }
};

module.exports = { scrapeCompany };