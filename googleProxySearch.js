const axios = require('axios');

// Replace with YOUR actual API key
const API_KEY = 'da222bf17697df8ba02e44aa5f9b30fc';

const params = {
  engine: "google",
  q: "accorjobs.com",
  api_key: API_KEY,
  output: "json", // Explicitly request JSON
  fetch_mode: "static" // Required parameter
};

axios.get("https://serpapi.abcproxy.com/search", { params })
  .then(response => {
    console.log("✅ Successful response:");
    console.log(response.data);
  })
  .catch(error => {
    console.error("❌ Full Error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  });