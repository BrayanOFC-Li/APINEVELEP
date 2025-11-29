const axios = require('axios');
const cheerio = require('cheerio');

class TMdl {
    constructor() {
        this.cookieJar = []; 
    }

    async dl(vu) {
        try {
            const { tn, tv } = await this.gs();
            const vd = await this.gv(vu, tn, tv);
            
            return {
                status: true,
                creador: "Neveloopp",
                result: vd
            };

        } catch (err) {
            return {
                status: false,
                creador: "Neveloopp",
                error: err.message
            };
        }
    }

    async gs() {
        const rs = await axios.get('https://threadsmate.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            }
        });
        if (rs.headers['set-cookie']) {
            this.cookieJar = rs.headers['set-cookie'].map(cookie => cookie.split(';')[0]);
        }

        const $ = cheerio.load(rs.data);
        
        const ti = $('input[type="hidden"]').not('[name="lang"]').first();
        const tn = ti.attr('name');
        const tv = ti.attr('value');

        if (!tn || !tv) {
            throw new Error('No token found');
        }

        return { tn, tv };
    }

    async gv(vu, tn, tv) {
        const fd = new URLSearchParams();
        fd.append('url', vu);
        fd.append(tn, tv);
        fd.append('lang', 'en');

        const rs = await axios.post('https://threadsmate.com/action', fd, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://threadsmate.com/',
                'Origin': 'https://threadsmate.com',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'X-Requested-With': 'XMLHttpRequest',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Cookie': this.cookieJar.join('; ')
            }
        });

        if (rs.data.error) {
            throw new Error(rs.data.message);
        }

        return this.pv(rs.data);
    }

    pv(dt) {
        const $ = cheerio.load(dt.html);
        
        const res = {
            tit: $('.hover-underline').text().trim(),
            aut: $('.threadsmate-downloader-middle p span').text().trim(),
            thumb: $('.threadsmate-downloader-left img').attr('src'),
            dUrl: $('.download-items__btn a').attr('href'),
            pImg: $('.download-items__thumb img').attr('src')
        };

        return res;
    }
}

module.exports = TMdl;