const axios = require('axios');

// Replace with YOUR API key and proxy endpoint
const API_KEY = 'da222bf17697df8ba02e44aa5f9b30fc';
const API_ENDPOINT = 'https://web-unblocker.abcproxy.com/v1'; // ✨ Use Web Unblocker endpoint

const params = {
  url: 'https://www.zoominfo.com/c/908-devices-inc/355354369', // ✨ Target URL
  api_key: API_KEY,
  output: "json",
  render_js: "true", // ✨ Required for JavaScript-heavy sites
  autoparse: "true", // ✨ Automatically structure unstructured data
  proxy_type: "residential", // ✨ Use residential IPs to avoid blocks
  wait_for: "selector:.company-summary", // ✨ Wait for specific content to load
  timeout: 30000 // ✨ Increase timeout for slow pages
};

axios.get(API_ENDPOINT, { params })
  .then(response => {
    console.log("✅ Successful response:");
    console.log(JSON.stringify(response.data, null, 2)); // Pretty-print JSON
  })
  .catch(error => {
    console.error("❌ Full Error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  });