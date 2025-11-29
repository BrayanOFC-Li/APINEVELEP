/*
pornhub download 
by dev Neveloopp (Eliasaryt)
Chanel1: https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31

Chanel2: https://whatsapp.com/channel/0029VbB2QCHCMY0Qz0j23y3a
code by AI
*/

const axios = require("axios");
const { CookieJar } = require("tough-cookie");

async function phfans(url) {
  const { wrapper } = await import("axios-cookiejar-support");
  
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  await client.get("https://pornhubfans.com/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Android 13; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0",
      "Referer": "https://pornhubfans.com/"
    }
  });

  const res = await client.post(
    "https://pornhubfans.com/resolve",
    { url, source: "phfans" },
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Android 13; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0",
        "Referer": "https://pornhubfans.com/"
      }
    }
  );

  const data = res.data;

  const build = (type, token) =>
    `${data.endpoint}/${type}?token=${token}`;

  return {
    title: data.title,
    thumbnail: build("image", data.thumbnail),
    video: data.video.map(v => ({
      quality: v.quality,
      size_mb: (v.file_size / 1048576).toFixed(1),
      download: build("video", v.token)
    }))
  };
}

module.exports = { phfans };