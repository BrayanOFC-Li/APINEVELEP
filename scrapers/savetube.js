const axios = require('axios');
const crypto = require('crypto');
const UserAgent = require('user-agents');

const generarIP = () => `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

const savetube = {
  api: {
    base: "https://media.savetube.me/api",
    cdn: "/random-cdn",
    info: "/v2/info",
    download: "/download"
  },
  headers: {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://yt.savetube.me',
    'referer': 'https://yt.savetube.me/',
    'user-agent': new UserAgent().toString(),
    'x-forwarded-for': generarIP()
  },
  formats: ['144', '240', '360', '480', '720', '1080', 'mp3'],

  crypto: {
    hexToBuffer: (hexString) => {
      const matches = hexString.match(/.{1,2}/g);
      return Buffer.from(matches.join(''), 'hex');
    },

    decrypt: async (enc) => {
      try {
        const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
        const data = Buffer.from(enc, 'base64');
        const iv = data.slice(0, 16);
        const content = data.slice(16);
        const key = savetube.crypto.hexToBuffer(secretKey);
        
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = decipher.update(content);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return JSON.parse(decrypted.toString());
      } catch (error) {
        throw new Error(`Error al desencriptar: ${error.message}`);
      }
    }
  },

  isUrl: (str) => { 
    try { 
      new URL(str); 
      return true; 
    } catch (_) { 
      return false; 
    } 
  },

  youtube: (url) => {
    if (!url) return null;
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/
    ];
    for (let pattern of patterns) {
      if (pattern.test(url)) return url.match(pattern)[1];
    }
    return null;
  },

  request: async (endpoint, data = {}, method = 'post') => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith('http') ? '' : savetube.api.base}${endpoint}`,
        data: method === 'post' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: savetube.headers
      });
      return {
        status: true,
        creador: "EliasarYT",
        code: 200,
        response: response
      };
    } catch (error) {
      return {
        status: false,
        creador: "EliasarYT",
        code: error.response?.status || 500,
        error: `Error en la solicitud: ${error.message}`
      };
    }
  },

  getCDN: async () => {
    const response = await savetube.request(savetube.api.cdn, {}, 'get');
    if (!response.status) return response;
    return {
      status: true,
      creador: "EliasarYT",
      code: 200,
      response: response.response.cdn
    };
  },

  download: async (link, format) => {
    if (!link) {
      return {
        status: false,
        creador: "EliasarYT",
        code: 400,
        error: "Por favor, proporciona un enlace para descargar."
      };
    }

    if (!savetube.isUrl(link)) {
      return {
        status: false,
        creador: "EliasarYT",
        code: 400,
        error: "El enlace proporcionado no es válido. Asegúrate de que es un enlace de YouTube."
      };
    }

    if (!format || !savetube.formats.includes(format)) {
      return {
        status: false,
        creador: "EliasarYT",
        code: 400,
        error: "Formato no válido. Usa uno de los formatos disponibles.",
        formatos_disponibles: savetube.formats
      };
    }

    const id = savetube.youtube(link);
    if (!id) {
      return {
        status: false,
        creador: "EliasarYT",
        code: 400,
        error: "No se pudo extraer el ID del video. Verifica el enlace de YouTube."
      };
    }

    try {
      const cdnx = await savetube.getCDN();
      if (!cdnx.status) return cdnx;
      const cdn = cdnx.response;

      const result = await savetube.request(`https://${cdn}${savetube.api.info}`, {
        url: `https://www.youtube.com/watch?v=${id}`
      });
      if (!result.status) return result;

      const decrypted = await savetube.crypto.decrypt(result.response.data);

      const dl = await savetube.request(`https://${cdn}${savetube.api.download}`, {
        id: id,
        downloadType: format === 'mp3' ? 'audio' : 'video',
        quality: format,
        key: decrypted.key
      });

      return {
        status: true,
        creador: "EliasarYT",
        code: 200,
        response: {
          titulo: decrypted.title || "Desconocido",
          tipo: format === 'mp3' ? 'audio' : 'video',
          formato: format,
          miniatura: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
          descarga: dl.response.data.downloadUrl,
          id: id,
          clave: decrypted.key,
          duracion: decrypted.duration,
          calidad: format,
          descargado: dl.response.data.downloaded || false
        }
      };

    } catch (error) {
      return {
        status: false,
        creador: "EliasarYT",
        code: 500,
        error: `Error durante la descarga: ${error.message}`
      };
    }
  }
};

module.exports = savetube;