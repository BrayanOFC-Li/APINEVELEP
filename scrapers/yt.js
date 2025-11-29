const axios = require('axios');

class YTD {
    constructor() {
        this.ax = axios.create({
            baseURL: 'https://ytdown.to',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Android 13; Mobile; rv:145.0) Gecko/145.0 Firefox/145.0',
                'Referer': 'https://ytdown.to/es2/'
            }
        });
    }

    async chk(act = 'check') {
        const res = await this.ax.post('/cooldown.php', `action=${act}`);
        return res.data;
    }

    async get(url) {
        const enc = encodeURIComponent(url);
        const res = await this.ax.post('/proxy.php', `url=${enc}`);
        return res.data;
    }

    async dl(url) {
        const enc = encodeURIComponent(url);
        const res = await this.ax.post('/proxy.php', `url=${enc}`);
        return res.data;
    }

    findBest(meds, typ) {
        const ord = {
            'video': ['FHD', 'HD', 'SD'],
            'audio': ['128K', '48K']
        };
        
        const filtered = meds.filter(m => m.type.toLowerCase() === typ.toLowerCase());
        
        return filtered.sort((a, b) => {
            const aIndex = ord[typ].indexOf(a.mediaQuality);
            const bIndex = ord[typ].indexOf(b.mediaQuality);
            return bIndex - aIndex;
        })[0];
    }

    async down(ytUrl, fmt = 'video') {
        const cd = await this.chk('check');
        if (!cd.can_download) throw new Error('CoolDown');

        const inf = await this.get(ytUrl);
        
        const meds = inf.api?.mediaItems;
        if (!meds || !meds.length) throw new Error('NoMedia');

        const sel = this.findBest(meds, fmt);
        if (!sel) throw new Error('NoMediaType');

        await this.chk('record');
        const res = await this.dl(sel.mediaUrl);
        
        return {
            success: true,
            title: inf.api?.title,
            duration: sel.mediaDuration,
            quality: sel.mediaQuality,
            size: sel.mediaFileSize,
            downloadUrl: res.api?.fileUrl,
            fileName: res.api?.fileName,
            videoInfo: {
                id: inf.api?.id,
                channel: inf.api?.userInfo?.name,
                thumbnail: inf.api?.imagePreviewUrl
            }
        };
    }
}

async function downYT(ytUrl, fmt = 'video') {
    const ytd = new YTD();
    return await ytd.down(ytUrl, fmt);
}

module.exports = { YTD, downYT };