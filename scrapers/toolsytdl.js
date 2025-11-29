const { default: puppeteer } = await import('puppeteer');

async function toolsytdl(url, format = 'video', quality = '720p') {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        await page.goto('https://s.neoxr.eu/tools/youtube/', { waitUntil: 'networkidle2' });

        await page.waitForSelector('#youtubeLink');
        await page.type('#youtubeLink', url);

        if (format === 'audio') {
            await page.click('#typeAudio');
        } else {
            await page.click('#typeVideo');
            await page.select('#videoQuality', quality);
        }

        await page.click('.btn-custom-accent');
        await page.waitForSelector('.alert-success, .alert-danger', { timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const result = await page.evaluate(() => {
            const downloadData = [];
            
            const downloadButtons = document.querySelectorAll('.btn.btn-custom-accent.w-100');
            downloadButtons.forEach(btn => {
                const text = btn.textContent.trim();
                if (text.includes('Download File')) {
                    const sizeMatch = text.match(/\(([^)]+)\)/);
                    downloadData.push({
                        quality: text,
                        url: btn.href,
                        format: text.includes('MP3') ? 'audio' : 'video',
                        size: sizeMatch ? sizeMatch[1] : 'Unknown'
                    });
                }
            });

            const alertElements = document.querySelectorAll('.alert');
            let errorMessage = '';
            let successMessage = '';
            
            alertElements.forEach(alert => {
                const text = alert.textContent.trim();
                if (alert.classList.contains('alert-danger')) {
                    errorMessage = text;
                } else if (alert.classList.contains('alert-success')) {
                    successMessage = text;
                }
            });

            const thumbnail = document.querySelector('.thumbnail-container img');
            const thumbnailUrl = thumbnail ? thumbnail.src : '';

            const titleMatch = successMessage.match(/Conversion of "([^"]+)"/);
            const title = titleMatch ? titleMatch[1] : 'Unknown Title';

            return {
                success: downloadData.length > 0 || successMessage.length > 0,
                title: title,
                error: errorMessage,
                successMessage: successMessage,
                thumbnail: thumbnailUrl,
                downloads: downloadData
            };
        });

        await browser.close();
        return result;

    } catch (error) {
        await browser?.close();
        return {
            success: false,
            error: error.message,
            downloads: []
        };
    }
}

module.exports = toolsytdl;