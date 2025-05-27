const axios = require('axios');

// Replace with YOUR actual API key
const API_KEY = '76a7762908b32e64a9f4fb108849c205';

const params = {
  engine: "google",
  q: "hes infra pvt ltd + india + address",
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