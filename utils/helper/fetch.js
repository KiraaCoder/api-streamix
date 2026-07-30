const axios = require("axios");

async function fetchData(url, res) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0",
      },
    });

    if (response.status === 200) {
      return response.data;
    } else {
      res.send({
        status: false,
        code: response.status,
        message: `Request failed with status ${response.status}`,
      });
      throw new Error(`Request failed with status ${response.status}`);
    }
  } catch (error) {
    res.send({
      status: false,
      code: error.response ? error.response.status : 500,
      message: error.message || "Bad Request",
    });
    throw error;
  }
}

module.exports = fetchData;
