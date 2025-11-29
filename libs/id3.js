const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const https = require('https');
const http = require('http');
const execAsync = promisify(exec);

async function downloadImage(imageUrl, filePath) {
    return new Promise((resolve, reject) => {
        const protocol = imageUrl.startsWith('https') ? https : http;
        
        const request = protocol.get(imageUrl, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(filePath, () => {});
                reject(err);
            });
        });

        request.on('error', (err) => {
            reject(err);
        });

        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Download timeout'));
        });
    });
}

function sanitizeMetadata(value) {
    if (!value) return '';
    return String(value).replace(/["$`]/g, '\\$&');
}

async function writeM4ATags(audioPath, tags) {
    let imagePath = null;
    
    try {
        if (!fs.existsSync(audioPath)) {
            throw new Error(`Audio file not found: ${audioPath}`);
        }

        if (tags.albumArt && tags.albumArt.startsWith('http')) {
            imagePath = `./tmp_cover_${Date.now()}.jpg`;
            await downloadImage(tags.albumArt, imagePath);
        } else if (tags.albumArt && fs.existsSync(tags.albumArt)) {
            imagePath = tags.albumArt;
        }

        let ffmpegCommand = `ffmpeg -i "${audioPath}" -c copy`;
        
        if (tags.title) ffmpegCommand += ` -metadata title="${sanitizeMetadata(tags.title)}"`;
        if (tags.artist) ffmpegCommand += ` -metadata artist="${sanitizeMetadata(tags.artist)}"`;
        if (tags.album) ffmpegCommand += ` -metadata album="${sanitizeMetadata(tags.album)}"`;
        if (tags.year) ffmpegCommand += ` -metadata date="${sanitizeMetadata(tags.year)}"`;
        if (tags.trackNumber) ffmpegCommand += ` -metadata track="${sanitizeMetadata(tags.trackNumber)}"`;
        if (tags.genre) ffmpegCommand += ` -metadata genre="${sanitizeMetadata(tags.genre)}"`;
        
        const outputPath = audioPath.replace('.m4a', '_tagged.m4a');
        
        if (imagePath) {
            ffmpegCommand += ` -i "${imagePath}" -map 0 -map 1 -c copy -disposition:v:0 attached_pic "${outputPath}"`;
        } else {
            ffmpegCommand += ` "${outputPath}"`;
        }
        
        await execAsync(ffmpegCommand);
        
        fs.copyFileSync(outputPath, audioPath);
        fs.unlinkSync(outputPath);
        
        if (tags.albumArt && tags.albumArt.startsWith('http') && imagePath) {
            fs.unlinkSync(imagePath);
        }
        
        return true;
        
    } catch (error) {
        if (imagePath && tags.albumArt && tags.albumArt.startsWith('http') && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        throw new Error(`Failed to write M4A tags: ${error.message}`);
    }
}

module.exports = { writeM4ATags };