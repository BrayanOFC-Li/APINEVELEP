const fetch = require('node-fetch')
const fs = require('fs')
const axios = require('axios')
const path = require('path')
const baileys = require('./baileys')
const { downloadContentFromMessage, proto, generateWAMessageFromContent, prepareWAMessageMedia, WA_DEFAULT_EPHEMERAL, areJidsSameUser, jidNormalizedUser, generateWAMessage } = require('@whiskeysockets/baileys')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./libs/exif')

const nvkey = 'TU KEY PUTA'
const nvurl = 'https://api-nv.ultraplus.click'
const numBot = '123456789@s.whatsapp.net'


function getPrefix(cfg) {
if (cfg && Array.isArray(cfg.prefixes) && cfg.prefixes.length) return cfg.prefixes.map(String)
if (typeof global !== 'undefined' && Array.isArray(global.prefixes) && global.prefixes.length) return global.prefixes.map(String)
if (typeof global !== 'undefined' && typeof global.prefix === 'string' && global.prefix) return [String(global.prefix)]
return ['.', '!', '/', '#']
}

function normCmd(s) {
return String(s || '')
.toLowerCase()
.normalize('NFD')
.replace(/[\u0300-\u036f]/g, '')
}

function parseCmd(text, cfg) {
const t = String(text || '').trim()
const prefixes = getPrefix(cfg)
const usedPrefix = prefixes.find(p => t.startsWith(p))
if (usedPrefix) {
const body = t.slice(usedPrefix.length).trim()
const firstRaw = body.split(/\s+/)[0]
const cmd = normCmd(firstRaw)
return { cmd, args: body.slice(firstRaw.length).trim(), prefix: usedPrefix, usedNoPrefix: false, raw: firstRaw }
}
if (cfg?.noprefix) {
const firstRaw = t.split(/\s+/)[0]
const cmd = normCmd(firstRaw)
return { cmd, args: t.slice(firstRaw.length).trim(), prefix: '', usedNoPrefix: true, raw: firstRaw }
}
return { cmd: '', args: '', prefix: '', usedNoPrefix: false, raw: '' }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
function extractText(m) {
const msg = m.message || {}
if (msg.conversation) return msg.conversation
if (msg.extendedTextMessage) return msg.extendedTextMessage.text
if (msg.imageMessage) return msg.imageMessage.caption
if (msg.videoMessage) return msg.videoMessage.caption
if (msg.documentMessage) return msg.documentMessage.caption
return ''
}
function hasLinks(text) {
if (!text) return false
const linkRegex = /\b((https?:\/\/|ftp:\/\/|www\.)[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?)/i
return linkRegex.test(text)
}
async function getBufferFromMsg(msg) {
const type = Object.keys(msg.message)[0]
const stream = await downloadContentFromMessage(msg.message[type], type.replace('Message', ''))
let buffer = Buffer.from([])
for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
return buffer
}
function toUserJid(input) {
if (!input) return '';

if (input.includes('@s.whatsapp.net')) {
return jidNormalizedUser(input);
}

if (input.includes('@lid')) {
const digits = String(input).replace(/[^0-9]/g, '');
return digits ? `${digits}@s.whatsapp.net` : '';
}

const digits = String(input).replace(/[^0-9]/g, '');
return digits ? `${digits}@s.whatsapp.net` : '';
}

const DATA_FILE = path.join(__dirname, 'config', 'data.json')
const BOT_CONFIG_FILE = path.join(__dirname, 'config', 'bot_config.json')
function ensureBotConfigFile() {
const dir = path.dirname(BOT_CONFIG_FILE)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
if (!fs.existsSync(BOT_CONFIG_FILE)) fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify({}), 'utf8')
}
function readBotConfig() {
ensureBotConfigFile()
try { return JSON.parse(fs.readFileSync(BOT_CONFIG_FILE, 'utf8') || '{}') } catch { return {} }
}
function writeBotConfig(obj) { ensureBotConfigFile(); fs.writeFileSync(BOT_CONFIG_FILE, JSON.stringify(obj, null, 2)) }
const DEFAULT_BOT_CONFIG = { name: 'Neveloopp-MD v2', emoji: '☄️', menuPhoto: 'https://cdn.russellxz.click/a0f28cdf.jpg' }
const DEFAULT_MENU_TEXT = 
`$welcomeText

⑆ Bot multifunción para WhatsApp - Tu asistente personal en la palma de tu mano (●‿●✿)

◦  *Prefix:* $prefix
◦  *Comandos:* $totalCommands
◦  *Sesiones activas:* $activeBots
◦  *antiprivado:* $antiprivado
◦  *prigrupo:* $prigrupo
◦  *modobot:* $modobot


⑆ \`Juego RPG\`

◦  *$prefixreg* « nombre.edad »
◦  *$prefixperfil*
◦  *$prefixavatar* « descripción »
◦  *$prefixtienda*
◦  *$prefixcomprar* « item »
◦  *$prefixreto* « @usuario »
◦  *$prefixtrabajo*
◦  *$prefixbuscar*
◦  *$prefixdaily*
◦  *$prefixtop*
◦  *$prefixlid*


⑆ \`Descargas Multimedia\`

◦  *$prefixplay* « canción »
◦  *$prefixytmp3* « url »
◦  *$prefixytmp4* « url »
◦  *$prefixytmp3doc* « url »
◦  *$prefixytmp4doc* « url »
◦  *$prefixmp3* « url »
◦  *$prefixmp3doc* « url »
◦  *$prefixmp4* « url »
◦  *$prefixmp4doc* « url »
◦  *$prefixtiktok* « link »
◦  *$prefixtiktoksearch* « texto »
◦  *$prefixfacebook* « link »
◦  *$prefixinstagram* « link »
◦  *$prefixtwitter* « link »
◦  *$prefixspotify* « link »
◦  *$prefixpinterestvideo* « url »
◦  *$prefixpinterest* « texto »
◦  *$prefixcapcut* « link »
◦  *$prefixanime* « nombre »
◦  *$prefixmediafire* « url »
◦  *$prefixgdrive* « url »
◦  *$prefixwaifu*
◦  *$prefixthreads* « url »
◦  *$prefixtw* « url »


⑆ \`Edición de Imágenes / Stickers\`

◦  *$prefixsticker* « imagen/video »
◦  *$prefixtomanga* « imagen »
◦  *$prefixfps* « video »
◦  *$prefixres* « video »
◦  *$prefixtoghibli* « imagen »
◦  *$prefixtopixar* « imagen »
◦  *$prefixhd* « imagen »
◦  *$prefixbrat* « texto »


⑆ \`Utilidades\`

◦  *$prefixssweb* « url »
◦  *$prefixrvo* « viewOnce »
◦  *$prefixinfomsg*
◦  *$prefixping*
◦  *$prefixcheck*
◦  *$prefixtourl* « archivo »
◦  *$prefixava* « @usuario »
◦  *$prefixreactall*
◦  *$prefixget* « url »
◦  *$prefixquemusica* « audio »
◦  *$prefixyts* « búsqueda »


⑆ \`Gestión de Grupos\`

◦  *$prefixkick* « @usuario »
◦  *$prefixkickuser* « @usuario »
◦  *$prefixlink*
◦  *$prefixtag* « texto »
◦  *$prefixantilink* « on/off »
◦  *$prefixaddgrupo*
◦  *$prefixdelgrupo*


⑆ \`Modo +18 (NSFW)\`

◦  *$prefixmodohot* « on/off »
◦  *$prefixcosplay*
◦  *$prefixr34*
◦  *$prefixphdl* « url »
◦  *$prefixxnxx* « url »


⑆ \`Inteligencia Artificial\`

◦  *$prefixia* « pregunta »
◦  *$prefixdalle* « prompt »


⑆ \`Configuración\`

◦  *$prefixantiprivado* « on/off »
◦  *$prefixmodobot* « on/off »
◦  *$prefixprigrupo* « on/off »
◦  *$prefixsetmenu*
◦  *$prefixsetmenutext*
◦  *$prefixsetname*
◦  *$prefixsetemoji*
◦  *$prefixsetphoto*
◦  *$prefixbotconfig*
◦  *$prefixresetconfig*
◦  *$prefixaddowner* « número »
◦  *$prefixdelowner* « número »


⑆ \`Desarrollador\`

◦  *$prefixfixlids*
◦  *$prefixfetch* « url »
◦  *$prefix$* « expr »
◦  *$prefixr* « js »
◦  *$prefixe* « código »


⑆ \`Entretenimiento\`

◦  *$prefixreact*
◦  *$prefixcode*
◦  *$prefixbots*


⑆ \`Enlaces Oficiales\`

📢 Canal: https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31  
🌐 Sitio: https://neveloopp-bot-code.eliasaryt.pro/

> Desarrollado por $botName - En constante evolución`;
function getBotConfig(botId) {
const botConfigs = readBotConfig()
return Object.assign({}, DEFAULT_BOT_CONFIG, botConfigs[botId] || {})
}
function updateBotConfig(botId, newConfig) {
const botConfigs = readBotConfig()
botConfigs[botId] = Object.assign({}, botConfigs[botId] || {}, newConfig)
writeBotConfig(botConfigs)
return botConfigs[botId]
}
function getBotName(botId = '') {
if (botId) {
const config = getBotConfig(botId)
return config.name
}
const mePn = normalizeAnyJid(conn?.user?.id || '')
const config = getBotConfig(mePn)
return config.name
}
function getBotEmoji(botId = '') {
if (botId) {
const config = getBotConfig(botId)
return config.emoji
}
const mePn = normalizeAnyJid(conn?.user?.id || '')
const config = getBotConfig(mePn)
return config.emoji
}
function getBotMenuPhoto(botId = '', participant = '') {
if (botId) {
const config = getBotConfig(botId)
return FotosMenu[participant] || config.menuPhoto
}
const mePn = normalizeAnyJid(conn?.user?.id || '')
const config = getBotConfig(mePn)
return FotosMenu[participant] || config.menuPhoto
}
function isModoHotActive(botId = '', groupId = '') {
if (!groupId) return false;

const bot = normalizeAnyJid(botId || conn?.user?.id || '');
const data = readData();
const cfg = data[bot] || {};

if (!cfg.modohot) cfg.modohot = {};

return cfg.modohot[groupId] === true;
}
function getBotMenuConfig(botId = '') {
if (botId) {
const config = getBotConfig(botId)
return config.menuConfig || {}
}
const mePn = normalizeAnyJid(conn?.user?.id || '')
const config = getBotConfig(mePn)
return config.menuConfig || {}
}

function updateBotMenuConfig(botId, newMenuConfig) {
const botConfigs = readBotConfig()
if (!botConfigs[botId]) botConfigs[botId] = {}
botConfigs[botId].menuConfig = Object.assign({}, botConfigs[botId].menuConfig || {}, newMenuConfig)
writeBotConfig(botConfigs)
return botConfigs[botId].menuConfig
}

const DEFAULT_MENU_CONFIG = {
welcomeText: "👋🏻 Hola *@user*, soy *$bot*. \nUn asistente versátil para hacer tu experiencia más fácil.",
mediaUrls: ["https://cdn.russellxz.click/fed0f9aa.jpg"],
menuText: DEFAULT_MENU_TEXT
}
const FotosMenu = { default: 'https://cdn.russellxz.click/fed0f9aa.jpg' }
function ensureDataFile() {
const dir = path.dirname(DATA_FILE)
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8')
}
function readData() { ensureDataFile(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}') } catch { return {} } }
function writeData(obj) { ensureDataFile(); fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2)) }
function normalizeAnyJid(jid) { if (!jid) return ''; return jid.endsWith('@s.whatsapp.net') ? jidNormalizedUser(jid) : jid }
async function resolveBotIdentifiers(conn, cfg, data, meKey) {
let needsUpdate = false;

if (!cfg.botnum && conn.user?.id) {
const digits = String(conn.user.id).replace(/\D/g, '');
if (digits) {
cfg.botnum = jidNormalizedUser(`${digits}@s.whatsapp.net`);
needsUpdate = true;
}
}

if (!cfg.botlid && conn.onWhatsApp && cfg.botnum) {
try {
const res = await conn.onWhatsApp(cfg.botnum);
if (Array.isArray(res) && res[0]?.lid) {
cfg.botlid = res[0].lid;
needsUpdate = true;
}
} catch (error) {}
}

if (!cfg.botlid && conn.user?.lid) {
cfg.botlid = conn.user.lid;
needsUpdate = true;
}

if (!cfg.botlid && cfg.botnum) {
try {
const phoneNumber = cfg.botnum.replace('@s.whatsapp.net', '');
cfg.botlid = `${phoneNumber}@lid`;
needsUpdate = true;
} catch (error) {}
}

if (needsUpdate) {
data[meKey] = cfg;
writeData(data);
}
}
const TMP_DIR = path.join(__dirname, 'tmp');
function cleanTmpFolder() {
    try {
        if (!fs.existsSync(TMP_DIR)) return;
        const files = fs.readdirSync(TMP_DIR);
        for (const file of files) {
            const filePath = path.join(TMP_DIR, file);
            fs.rmSync(filePath, { recursive: true, force: true });
        }
    } catch {}
}

setInterval(cleanTmpFolder, 10 * 60 * 1000);
module.exports = async (conn, m, text, utils = {}) => {
const { getActiveBots } = utils
global._pendingJobs = global._pendingJobs || {}
if (!m || !m.key) return
const chat = m.key.remoteJid
const isGroup = chat?.endsWith('@g.us')
m.chat = chat
m.isGroup = !!isGroup
m.quoted = null;
if (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.quotedMessage) {
const context = m.message.extendedTextMessage.contextInfo;
m.quoted = {
key: {
remoteJid: context.remoteJid || m.key.remoteJid,
fromMe: context.participant ? areJidsSameUser(context.participant, m.key.participant || m.key.remoteJid) : false,
id: context.stanzaId,
participant: context.participant
},
message: context.quotedMessage,
type: Object.keys(context.quotedMessage)[0],
text: (() => {
const msg = context.quotedMessage;
if (msg.conversation) return msg.conversation;
if (msg.extendedTextMessage) return msg.extendedTextMessage.text;
if (msg.imageMessage) return msg.imageMessage.caption;
if (msg.videoMessage) return msg.videoMessage.caption;
if (msg.documentMessage) return msg.documentMessage.caption;
return '';
})(),
sender: context.participant || context.remoteJid,
fakeObj: {
key: {
remoteJid: context.remoteJid || m.key.remoteJid,
fromMe: context.participant ? areJidsSameUser(context.participant, m.key.participant || m.key.remoteJid) : false,
id: context.stanzaId,
participant: context.participant
},
message: context.quotedMessage
}
};
}
m.quotedText = m.quoted ? m.quoted.text : '';
/*const groupMetadata = isGroup ? await conn.groupMetadata(chat).catch(() => ({})) : {}
const participants = groupMetadata.participants || []*/

let mePn = normalizeAnyJid(conn.user?.id || '')
const meLid = conn.user?.lid || null
if (!/@s\.whatsapp\.net$/.test(mePn)) {
const digits = String(conn.user?.id || '').replace(/\D/g, '')
if (digits) mePn = jidNormalizedUser(`${digits}@s.whatsapp.net`)
}

const data = readData()
const meKey = mePn || (meLid || 'bot')
const defaultCfg = {
antiprivado: false,
modobot: false,
prigrupo: false,
modohot: {},
gruposPermitidos: [],
ownerPn: ['50585117242@s.whatsapp.net'],
ownerLid: null,
botnum: null,
botlid: null,
prefixes: [],
noprefix: false
}
const cfg = data[meKey] = Object.assign(defaultCfg, data[meKey] || {})
await resolveBotIdentifiers(conn, cfg, data, meKey)

const botIdentifiers = new Set()
if (cfg.botnum) botIdentifiers.add(cfg.botnum)
if (cfg.botlid) botIdentifiers.add(cfg.botlid)
if (mePn) botIdentifiers.add(mePn)
if (meLid) botIdentifiers.add(meLid)

const authorGuess = m.key.participant || chat
const candidates = [m.key.participant, authorGuess].filter(Boolean).map(String)

const toPnJid = (j) => {
if (!j) return null
if (/@s\.whatsapp\.net$/.test(j)) return jidNormalizedUser(j)
if (/@lid$/.test(j)) {
const digits = j.replace(/\D/g, '')
if (digits) return jidNormalizedUser(`${digits}@s.whatsapp.net`)
}
return null
}
const candidatePNs = candidates.map(toPnJid).filter(Boolean)

const isSelf = Boolean(
m.key.fromMe ||
candidatePNs.some(j => areJidsSameUser(j, mePn)) ||
candidates.some(j => botIdentifiers.has(j)) ||
(m.key.participant && botIdentifiers.has(m.key.participant))
)

const ownerPns = Array.isArray(cfg.ownerPn)
? cfg.ownerPn.map(normalizeAnyJid).filter(Boolean)
: [normalizeAnyJid(cfg.ownerPn)].filter(Boolean)

const isOwnerByPn = candidatePNs.some(j => ownerPns.some(op => areJidsSameUser(j, op)))
const isOwnerByLid = cfg.ownerLid ? 
candidates.some(candidate => {
if (candidate === cfg.ownerLid) return true;
const ownerLidDigits = cfg.ownerLid.replace('@lid', '').replace(/[^0-9]/g, '');
const candidateDigits = candidate.replace('@lid', '').replace(/[^0-9]/g, '');
return ownerLidDigits === candidateDigits;
}) : false

const isCreator = isSelf || isOwnerByPn || isOwnerByLid
const isOwner = isCreator


const fromJidPN = candidatePNs[0] || ''
let participants = []
let isGroupAdmins = false
let isBotAdmins = false

if (m.isGroup) {
try {
const groupMetadata = await conn.groupMetadata(m.chat)
participants = groupMetadata.participants || []
isGroupAdmins = participants.some(p => p.jid === (m.key.participant || m.sender) && p.admin)
isBotAdmins = participants.some(p => p.jid === mePn && p.admin)
} catch {}
}
if (cfg.antiprivado && !isGroup && !isCreator) return
if (cfg.modobot && !isCreator) return
if (cfg.prigrupo) {
if (isGroup) {
if (!cfg.gruposPermitidos.includes(chat) && !isCreator) return
} else {
if (!isCreator) return
}
}
if (m.isGroup && cfg.antilink && cfg.antilink[m.chat]) {

if (isSelf) return

const version = cfg.antilink[m.chat]
const text = extractText(m)

if (hasLinks(text)) {

const participant = m.key.participant || m.sender

const groupMetadata = await conn.groupMetadata(m.chat).catch(() => ({ participants: [] }))
const participants = groupMetadata.participants || []
const isGroupAdmins = participants.some(p => p.jid === participant && p.admin)
const isBotAdmins = participants.some(p => p.jid === mePn && p.admin)

if (!isGroupAdmins && isBotAdmins) {

if (version === 'v1') {
await conn.sendMessage(m.chat, { delete: m.key })
await conn.groupParticipantsUpdate(m.chat, [participant], 'remove')
await conn.sendMessage(m.chat, { 
text: `${getBotEmoji(mePn)} Usuario eliminado por enviar enlaces.`,
mentions: [participant]
})
}

else if (version === 'v2') {
await conn.sendMessage(m.chat, { delete: m.key })
}

else if (version === 'v3') {
await conn.sendMessage(m.chat, { delete: m.key })
await conn.sendMessage(m.chat, { 
text: `${getBotEmoji(mePn)} @${participant.split('@')[0]} está prohibido enviar enlaces en este grupo.`,
mentions: [participant]
})
}
}
}
}
const parsed = parseCmd(text, cfg)
const cmd = parsed.cmd
const args = parsed.args
if (!cmd && !(m.message?.extendedTextMessage?.contextInfo?.stanzaId && global._pendingJobs[m.message.extendedTextMessage.contextInfo.stanzaId])) return

const getThumbnailBuffer = async (mePn, participant) => {
const imageUrl = getBotMenuPhoto(mePn, participant);
if (!imageUrl) return null;

try {
const response = await fetch(imageUrl);
return await response.buffer();
} catch (error) {
return null;
}
};

m.reply = async (text) => {
const thumbnailBuffer = await getThumbnailBuffer(mePn, m.key.participant);

return conn.sendMessage(m.chat, {
text: text + `\n\n> by *${getBotName(mePn)}*`,
contextInfo: {
forwardedNewsletterMessageInfo: {
newsletterJid: '120363418194182743@newsletter',
serverMessageId: '',
newsletterName: `${getBotName(mePn)}`
},
forwardingScore: 9999999,
isForwarded: true,
mentionedJid: [numBot],
externalAdReply: {
showAdAttribution: false,
renderLargerThumbnail: false,
title: `${getBotName(mePn)}`,
body: `© 2024 by ${getBotName(mePn)}`,
containsAutoReply: true,
mediaType: 1,
thumbnail: thumbnailBuffer,
sourceUrl: 'https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31'
}
}
}, { quoted: m });
};

m.react = async (emoji) => conn.sendMessage(chat, {
react: { text: emoji, key: m.key }
})
conn.sendButton = async (jid, text = '', footer = '', buffer, buttons, copy, urls, quoted, options) => {
let img, video;

try {
if (/^https?:\/\//i.test(buffer)) {
const response = await fetch(buffer);
const contentType = response.headers.get('content-type');

if (/^image\//i.test(contentType)) {
img = await prepareWAMessageMedia({ image: { url: buffer } }, { upload: conn.waUploadToServer });
} else if (/^video\//i.test(contentType)) {
video = await prepareWAMessageMedia({ video: { url: buffer } }, { upload: conn.waUploadToServer });
} else {
console.error("Tipo MIME no compatible:", contentType);
}
} else {
const type = await conn.getFile(buffer);
if (/^image\//i.test(type.mime)) {
img = await prepareWAMessageMedia({ image: { url: buffer } }, { upload: conn.waUploadToServer });
} else if (/^video\//i.test(type.mime)) {
video = await prepareWAMessageMedia({ video: { url: buffer } }, { upload: conn.waUploadToServer });
}
}

const dynamicButtons = buttons.map(btn => ({
name: 'quick_reply',
buttonParamsJson: JSON.stringify({
display_text: btn[0],
id: btn[1]
}),
}));

if (copy && (typeof copy === 'string' || typeof copy === 'number')) {
dynamicButtons.push({
name: 'cta_copy',
buttonParamsJson: JSON.stringify({
display_text: 'Copy', copy_code: copy
})
});
}

if (urls && Array.isArray(urls)) {
urls.forEach(url => {
dynamicButtons.push({
name: 'cta_url',
buttonParamsJson: JSON.stringify({
display_text: url[0],
url: url[1],
merchant_url: url[1]
})
});
});
}

const interactiveMessage = {
body: { text: text },
footer: { text: footer },
header: {
hasMediaAttachment: false,
imageMessage: img ? img.imageMessage : null,
videoMessage: video ? video.videoMessage : null
},
nativeFlowMessage: {
buttons: dynamicButtons,
messageParamsJson: ''
}
};

if (!quoted) {
quoted = {};
}
if (typeof quoted.fromMe === 'undefined') {
quoted.fromMe = false; // o el valor por defecto adecuado
}

let msgL = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { interactiveMessage } } }, { userJid: conn.user.jid, quoted });
await conn.relayMessage(jid, msgL.message, { messageId: msgL.key.id, ...options });
} catch (error) {
console.error("Error al enviar el botón:", error);
}
};
conn.sendAlbumMessage = async function (jid, medias, options = {}) {
let img, video;
const caption = options.text || options.caption || "";

const album = generateWAMessageFromContent(jid, {
albumMessage: {
expectedImageCount: medias.filter(media => media.type === "image").length,
expectedVideoCount: medias.filter(media => media.type === "video").length,
...(options.quoted ? {
contextInfo: {
remoteJid: options.quoted.key.remoteJid,
fromMe: options.quoted.key.fromMe,
stanzaId: options.quoted.key.id,
participant: options.quoted.key.participant || options.quoted.key.remoteJid,
quotedMessage: options.quoted.message
}
} : {})
}
}, { quoted: options.quoted });

await conn.relayMessage(album.key.remoteJid, album.message, {
messageId: album.key.id
});

for (const media of medias) {
const { type, data } = media;

if (/^https?:\/\//i.test(data.url)) {
try {
const response = await fetch(data.url);
const contentType = response.headers.get('content-type');

if (/^image\//i.test(contentType)) {
img = await prepareWAMessageMedia({ image: { url: data.url } }, { upload: conn.waUploadToServer });
} else if (/^video\//i.test(contentType)) {
video = await prepareWAMessageMedia({ video: { url: data.url } }, { upload: conn.waUploadToServer });
}
} catch (error) {
throw new Error(`Error al obtener el tipo MIME: ${error.message}`)
}
}

if (!generateWAMessage) throw new Error('generateWAMessage no está definido')

const mediaMessage = await generateWAMessage(album.key.remoteJid, {
[type]: data,
...(media === medias[0] ? { caption } : {})
}, {
upload: conn.waUploadToServer
});

mediaMessage.message.messageContextInfo = {
messageAssociation: {
associationType: 1,
parentMessageKey: album.key
}
};

await conn.relayMessage(mediaMessage.key.remoteJid, mediaMessage.message, {
messageId: mediaMessage.key.id
});
}

return album;
};
conn.sendFile = async (jid, pathIn, filename = '', caption = '', quoted, ptt = false, options = {}, contextInfo = {}) => {
let dataBuf
if (Buffer.isBuffer(pathIn)) dataBuf = pathIn
else if (/^data:.*?\/.*?;base64,/i.test(pathIn)) dataBuf = Buffer.from(pathIn.split`,`[1], 'base64')
else if (/^https?:\/\//.test(pathIn)) dataBuf = await (await fetch(pathIn)).buffer()
else if (fs.existsSync(pathIn)) dataBuf = fs.readFileSync(pathIn)
else dataBuf = Buffer.alloc(0)
const ext = path.extname(filename || pathIn).slice(1).toLowerCase()
const mime = options.mimetype || ({ jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',mp4:'video/mp4',mp3:'audio/mpeg',webp:'image/webp',pdf:'application/pdf' }[ext] || 'application/octet-stream')
let type = 'document'
if (/webp/.test(mime) && !options.asDocument) type = 'sticker'
else if (/image/.test(mime) && !options.asDocument) type = 'image'
else if (/video/.test(mime) && !options.asDocument) type = 'video'
else if (/audio/.test(mime) && !options.asDocument) type = 'audio'
const msg = { [type]: { url: pathIn }, caption, mimetype: mime, ptt, fileName: filename || `file.${ext || 'bin'}`, ...options, contextInfo }
let sent
try { sent = await conn.sendMessage(jid, msg, { quoted }) } catch { sent = await conn.sendMessage(jid, { ...msg, [type]: dataBuf }, { quoted }) }
return sent
}

conn.sendImageAsSticker = async (jid, pathIn, quoted, options = {}) => {
let buff
if (Buffer.isBuffer(pathIn)) buff = pathIn
else if (/^data:.*?\/.*?;base64,/i.test(pathIn)) buff = Buffer.from(pathIn.split`,`[1], 'base64')
else if (/^https?:\/\//.test(pathIn)) buff = await (await fetch(pathIn)).buffer()
else if (fs.existsSync(pathIn)) buff = fs.readFileSync(pathIn)
else buff = Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) buffer = await writeExifImg(buff, options)
else buffer = await imageToWebp(buff)
await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted: quoted || m })
return buffer
}

conn.sendVideoAsSticker = async (jid, pathIn, quoted, options = {}) => {
let buff
if (Buffer.isBuffer(pathIn)) buff = pathIn
else if (/^data:.*?\/.*?;base64,/i.test(pathIn)) buff = Buffer.from(pathIn.split`,`[1], 'base64')
else if (/^https?:\/\//.test(pathIn)) buff = await (await fetch(pathIn)).buffer()
else if (fs.existsSync(pathIn)) buff = fs.readFileSync(pathIn)
else buff = Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) buffer = await writeExifVid(buff, options)
else buffer = await videoToWebp(buff)
await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted: quoted || m })
return buffer
}

const isInteractiveResponse = (() => {
const ctx = m.message?.extendedTextMessage?.contextInfo
const cited = ctx?.stanzaId
return cited && global._pendingJobs[cited]
})()

if (isInteractiveResponse) {
const txt = (m.message?.conversation?.toLowerCase() || m.message?.extendedTextMessage?.text?.toLowerCase() || '').trim()
const ctx = m.message.extendedTextMessage.contextInfo
const job = global._pendingJobs[ctx.stanzaId]
try { if (job?.handler)  job.handler(conn, m, txt, job.data) } catch { m.reply('❌ Ocurrió un error procesando tu respuesta.') }
delete global._pendingJobs[ctx.stanzaId]
return
}
function unwrapMessage(msg) {
let m = msg?.message || {}
while (m?.ephemeralMessage || m?.viewOnceMessage || m?.viewOnceMessageV2 || m?.viewOnceMessageV2Extension || m?.documentWithCaptionMessage) {
if (m.ephemeralMessage) m = m.ephemeralMessage.message
else if (m.viewOnceMessage) m = m.viewOnceMessage.message
else if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message
else if (m.viewOnceMessageV2Extension) m = m.viewOnceMessageV2Extension.message
else if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message
}
return m
}
function argsText(args) {
if (typeof args === 'string') return args.trim()
if (Array.isArray(args)) return args.join(' ').trim()
return String(args || '').trim()
}
function chunkText(s, n = 3500) {
const out = []
for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n))
return out
}
const RPG_FILE = path.join(__dirname, 'config', 'rpg_data.json');

function ensureRpgFile() {
const dir = path.dirname(RPG_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(RPG_FILE)) fs.writeFileSync(RPG_FILE, JSON.stringify({users: {}, tops: [], last: ""}), 'utf8');
}

function readRpg() {
ensureRpgFile();
try { 
const data = JSON.parse(fs.readFileSync(RPG_FILE, 'utf8') || '{}');
if (data.users && data.users['undefined']) {
delete data.users['undefined'];
writeRpg(data);
}
return data;
} catch { 
return {users: {}, tops: [], last: ""} 
};
}

function writeRpg(obj) { 
ensureRpgFile(); 
if (obj.users && obj.users['undefined']) {
delete obj.users['undefined'];
}
fs.writeFileSync(RPG_FILE, JSON.stringify(obj, null, 2)); 
}

function getUser(userId) {
if (!userId || userId === 'undefined') {
return {
reg: false, name: "", age: 0, lvl: 1, exp: 0, coins: 100, 
magia: "ninguna", intel: "baja", avatar: "", av_desc: "",
wins: 0, loss: 0, str: 10, hp: 100, max_hp: 100, last_fight: 0,
last_work: 0, work_count: 0, daily: 0, reg_at: Date.now(),
jid: "", lid: ""
};
}

const rpg = readRpg();
const def = {
reg: false, name: "", age: 0, lvl: 1, exp: 0, coins: 100, 
magia: "ninguna", intel: "baja", avatar: "", av_desc: "",
wins: 0, loss: 0, str: 10, hp: 100, max_hp: 100, last_fight: 0,
last_work: 0, work_count: 0, daily: 0, reg_at: Date.now(),
jid: "", lid: ""
};

return Object.assign(def, rpg.users[userId] || {});
}

function updateUser(userId, data) {
if (!userId || userId === 'undefined') {
return null;
}

const rpg = readRpg();

if (rpg.users['undefined']) {
delete rpg.users['undefined'];
}

rpg.users[userId] = Object.assign(getUser(userId), data);
writeRpg(rpg);
updateTop();
return rpg.users[userId];
}

function updateTop() {
const rpg = readRpg();

if (rpg.users['undefined']) {
delete rpg.users['undefined'];
}

const users = Object.entries(rpg.users)
.filter(([id, u]) => id && id !== 'undefined' && u.reg)
.map(([id, u]) => ({
id, name: u.name, lvl: u.lvl, exp: u.exp, power: calcPower(u)
}))
.sort((a, b) => b.power - a.power)
.slice(0, 10);

rpg.tops = users;
rpg.last = new Date().toISOString();
writeRpg(rpg);
}

function calcPower(u) {
const magMul = {"ninguna":1, "media":1.5, "clasica":2, "alta":3, "dios":5};
const intMul = {"baja":1, "media":1.3, "intermedia":1.7, "alta":2.2};
return Math.floor((u.lvl * 10) + (u.exp * 0.1) + (u.str * 2) + (u.coins * 0.01) + (magMul[u.magia] * 50) + (intMul[u.intel] * 30));
}

function calcLvl(exp) { return Math.floor(Math.sqrt(exp / 100)) + 1; }
function expForLvl(lvl) { return Math.pow(lvl - 1, 2) * 100; }

async function simBat(p1, p2) {
const p1p = calcPower(p1);
const p2p = calcPower(p2);

const magVal = {"ninguna":0, "media":1, "clasica":2, "alta":3, "dios":4};
const intVal = {"baja":0, "media":1, "intermedia":2, "alta":3};

const p1Score = (p1p * 0.6) + (magVal[p1.magia] * 25) + (intVal[p1.intel] * 20) + (p1.lvl * 5);
const p2Score = (p2p * 0.6) + (magVal[p2.magia] * 25) + (intVal[p2.intel] * 20) + (p2.lvl * 5);

const p1Luck = 0.8 + (Math.random() * 0.4);
const p2Luck = 0.8 + (Math.random() * 0.4);

const p1Final = Math.floor(p1Score * p1Luck);
const p2Final = Math.floor(p2Score * p2Luck);

let win, lose;
if (p1Final > p2Final) { win = p1; lose = p2; } 
else { win = p2; lose = p1; }

const baseExp = 50;
const baseCoins = 25;
const lvlDiff = Math.abs(win.lvl - lose.lvl);
const expGain = Math.max(10, baseExp - (lvlDiff * 5));
const coinGain = Math.max(5, baseCoins - (lvlDiff * 2));
const coinLoss = Math.max(5, Math.floor(coinGain * 0.7));

return { win, lose, p1Final, p2Final, rew: { exp: expGain, coins: coinGain, loss_coins: coinLoss } };
}

const SHOP = {
"magia_media": { name: "Magia Media", price: 500, type: "magia", val: "media", desc: "Aumenta poder magico" },
"magia_clasica": { name: "Magia Clasica", price: 1000, type: "magia", val: "clasica", desc: "Magia ancestral" },
"magia_alta": { name: "Magia Alta", price: 2500, type: "magia", val: "alta", desc: "Poder excepcional" },
"magia_dios": { name: "Magia Dios", price: 5000, type: "magia", val: "dios", desc: "Poder divino" },
"int_media": { name: "Int Media", price: 300, type: "intel", val: "media", desc: "Mejora estrategica" },
"int_inter": { name: "Int Intermedia", price: 700, type: "intel", val: "intermedia", desc: "Gran analisis" },
"int_alta": { name: "Int Alta", price: 1500, type: "intel", val: "alta", desc: "Genio estrategico" },
"poc_vida": { name: "Pocion Vida", price: 100, type: "item", val: "hp", desc: "+50 HP" },
"poc_fuerza": { name: "Pocion Fuerza", price: 200, type: "item", val: "str", desc: "+5 Fuerza" }
};

async function getUserIdentifiers(conn, targetJid) {
let normalizedJid = jidNormalizedUser(targetJid);
let lid = '';

try {
const waInfo = await conn.onWhatsApp(normalizedJid);
if (Array.isArray(waInfo) && waInfo[0]) {
const userInfo = waInfo[0];
if (userInfo.exists) {
if (userInfo.lid) {
lid = userInfo.lid;
} else {
const phoneNumber = normalizedJid.replace('@s.whatsapp.net', '');
lid = `${phoneNumber}@lid`;
}
}
}
} catch (error) {
const phoneNumber = normalizedJid.replace('@s.whatsapp.net', '');
lid = `${phoneNumber}@lid`;
}

return { jid: normalizedJid, lid };
}

async function uploadToCDN(fileBuffer, fileName) {
try {
const form = new FormData();
form.append('files[]', fileBuffer, { filename: fileName, contentType: 'image/jpeg' });

const response = await axios.post('https://cdn.russellxz.click/upload.php', form, {
headers: form.getHeaders()
});

if (response.data && response.data.url) {
return { status: true, result: { url: response.data.url } };
} else {
return { status: false, message: 'Error al subir archivo' };
}
} catch (error) {
return { status: false, message: error.message };
}
}

async function deleteFromCDN(fileUrl) {
try {
const filename = path.basename(new URL(fileUrl).pathname);
const response = await axios.get(`https://cdn.russellxz.click/api/delete/archive?key=russellxz&file=${filename}`);
return response.data.success || false;
} catch (error) {
return false;
}
}
function ensureOwnerArray(cfg) {
if (!Array.isArray(cfg.ownerPn)) {
cfg.ownerPn = [cfg.ownerPn].filter(v => v);
}
return cfg.ownerPn;
}

async function resolveUserJid(input, m) {
if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
return m.message.extendedTextMessage.contextInfo.mentionedJid[0];
}

if (m.quoted && m.quoted.sender) {
return m.quoted.sender;
}

if (!input) return null;

const digits = String(input).replace(/[^0-9]/g, '');
if (digits.length >= 5) {
return `${digits}@s.whatsapp.net`;
}

return null;
}

function saveOwners(meKey, cfg) {
const data = readData();
data[meKey] = cfg;
writeData(data);
}
async function ytDownloadAudio(conn, m, url, asDocument = false) {
if (!url) return m.reply('¿Dónde está la URL?')
m.reply('Procesando...')
try {
const fs = require('fs').promises
const path = require('path')
const encodedUrl = encodeURIComponent(url)
let videoInfo = null
let processedThumbnail = null

if (asDocument) {
try {
const infoApiUrl = `https://api-nv.ultraplus.click/api/youtube/info?url=${encodedUrl}&key=${nvkey}`
const infoResponse = await fetch(infoApiUrl)
if (infoResponse.ok) {
const infoData = await infoResponse.json()
if (infoData.status && infoData.Result) {
videoInfo = infoData.Result
}
}
} catch (error) {
console.error('Error obteniendo información:', error)
}

if (videoInfo && videoInfo.miniatura) {
try {
const thumbResponse = await fetch(videoInfo.miniatura)
const buffer = await thumbResponse.arrayBuffer()
const image = await require('jimp').read(Buffer.from(buffer))
image.resize(250, 250)
processedThumbnail = await image.getBufferAsync(require('jimp').MIME_JPEG)
} catch (error) {
console.error('Error procesando thumbnail:', error)
processedThumbnail = null
}
}
}

const apiUrl = `https://api-nv.ultraplus.click/api/dl/yt-direct?url=${encodedUrl}&type=audio&key=${nvkey}`

let response
let attempts = 0
let success = false

while (attempts < 3 && !success) {
try {
response = await fetch(apiUrl)
if (response.ok) {
success = true
} else {
attempts++
if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000))
}
} catch (error) {
attempts++
if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000))
}
}

if (!success) throw new Error('Error API después de 3 intentos')

const audioBuffer = await response.buffer()
let fileName = `audio_${Date.now()}.m4a`

if (videoInfo && videoInfo.titulo) {
fileName = `${videoInfo.titulo}.m4a`.replace(/[<>:"/\\|?*]/g, '_')
}

const filePath = path.join('./tmp', fileName)

try {
await fs.access('./tmp')
} catch {
await fs.mkdir('./tmp', { recursive: true })
}

await fs.writeFile(filePath, audioBuffer)

if (asDocument) {
await conn.sendMessage(m.chat, {
document: audioBuffer,
mimetype: 'audio/mpeg',
fileName,
caption: fileName,
jpegThumbnail: processedThumbnail
}, { quoted: m })
} else {
await conn.sendMessage(m.chat, {
audio: audioBuffer,
mimetype: 'audio/mpeg',
fileName
}, { quoted: m })
}

try {
await fs.unlink(filePath)
} catch (deleteError) {
if (deleteError.code !== 'ENOENT') {
console.error('Error eliminando archivo:', deleteError)
}
}
} catch (error) {
console.error(error)
await m.reply(`❌ Error al descargar audio:\n\`\`\`${error.message}\`\`\``)
}
}

async function ytDownloadVideo(conn, m, url, asDocument = false) {
if (!url) return m.reply('¿Dónde está la URL?')
m.reply('Procesando...')
try {
const fs = require('fs').promises
const path = require('path')
const encodedUrl = encodeURIComponent(url)

let videoInfo = null
let processedThumbnail = null

try {
const infoApiUrl = `https://api-nv.ultraplus.click/api/youtube/info?url=${encodedUrl}&key=${nvkey}`
const infoResponse = await fetch(infoApiUrl)
if (infoResponse.ok) {
const infoData = await infoResponse.json()
if (infoData.status && infoData.Result) {
videoInfo = infoData.Result
}
}
} catch (error) {
console.error('Error obteniendo información:', error)
}

if (videoInfo && videoInfo.miniatura) {
try {
const thumbResponse = await fetch(videoInfo.miniatura)
const buffer = await thumbResponse.arrayBuffer()
const image = await require('jimp').read(Buffer.from(buffer))
image.resize(250, 250)
processedThumbnail = await image.getBufferAsync(require('jimp').MIME_JPEG)
} catch (error) {
console.error('Error procesando thumbnail:', error)
processedThumbnail = null
}
}

let videoBuffer
let success = false
let attempts = 0

while (attempts < 3 && !success) {
try {
const apiUrl1 = `https://api-nv.ultraplus.click/api/dl/yt-direct?url=${encodedUrl}&type=video&key=${nvkey}`
let response = await fetch(apiUrl1)
if (response.ok) {
videoBuffer = await response.buffer()
success = true
} else {
attempts++
if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000))
}
} catch (error) {
attempts++
if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000))
}
}

if (!success) {
attempts = 0
while (attempts < 3 && !success) {
try {
const apiUrl2 = `https://api-nv.ultraplus.click/api/youtube/v2?url=${encodedUrl}&format=mp4&key=${nvkey}`
let response = await fetch(apiUrl2)
if (response.ok) {
videoBuffer = await response.buffer()
success = true
} else {
attempts++
if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000))
}
} catch (error) {
attempts++
if (attempts < 3) await new Promise(resolve => setTimeout(resolve, 1000))
}
}
}

if (!success) throw new Error('Error API después de 3 intentos en ambas APIs')

let fileName = `video_${Date.now()}.mp4`
if (videoInfo && videoInfo.titulo) {
fileName = `${videoInfo.titulo}.mp4`.replace(/[<>:"/\\|?*]/g, '_')
}

const filePath = path.join('./tmp', fileName)

try {
await fs.access('./tmp')
} catch {
await fs.mkdir('./tmp', { recursive: true })
}

await fs.writeFile(filePath, videoBuffer)

if (asDocument) {
await conn.sendMessage(m.chat, {
document: videoBuffer,
mimetype: 'video/mp4',
fileName,
caption: fileName,
jpegThumbnail: processedThumbnail
}, { quoted: m })
} else {
await conn.sendMessage(m.chat, {
video: videoBuffer,
mimetype: 'video/mp4',
fileName,
jpegThumbnail: processedThumbnail
}, { quoted: m })
}

try {
await fs.unlink(filePath)
} catch (deleteError) {
if (deleteError.code !== 'ENOENT') {
console.error('Error eliminando archivo:', deleteError)
}
}
} catch (error) {
console.error(error)
await m.reply(`❌ Error al descargar video:\n\`\`\`${error.message}\`\`\``)
}
}
switch (cmd) {
case 'addowner':
case 'addowener': {

if (!isCreator) return m.reply(`${getBotEmoji(mePn)} Solo el owner principal puede añadir nuevos owners.`);

const target = await resolveUserJid(args, m);
if (!target) return m.reply(`Debes mencionar, responder o escribir el número.\nEjemplo:\n${getPrefix()[0]}addowner 50560000000`);

ensureOwnerArray(cfg);

if (cfg.ownerPn.includes(target)) {
return m.reply(`${getBotEmoji(mePn)} Ese usuario ya es owner.`);
}

cfg.ownerPn.push(target);
saveOwners(meKey, cfg);

await m.react('✅');
return m.reply(`${getBotEmoji(mePn)} Nuevo owner añadido.\n\n👑 @${target.split('@')[0]}`, { mentions: [target] });
}
break;
case 'delowner':
case 'removeowner': {

if (!isCreator) return m.reply(`${getBotEmoji(mePn)} Solo el owner principal puede eliminar owners.`);

ensureOwnerArray(cfg);

const target = await resolveUserJid(args, m);
if (!target) return m.reply(`Debes mencionar, responder o escribir el número.\nEjemplo:\n${getPrefix()[0]}delowner 50560000000`);

if (!cfg.ownerPn.includes(target)) {
return m.reply(`${getBotEmoji(mePn)} Ese usuario no es owner.`);
}

if (target === cfg.ownerPn[0]) {
return m.reply(`${getBotEmoji(mePn)} No puedes eliminar al owner principal.`);
}

cfg.ownerPn = cfg.ownerPn.filter(o => o !== target);
saveOwners(meKey, cfg);

await m.react('🗑️');
return m.reply(`Owner eliminado:\n\n❌ @${target.split('@')[0]}`, { mentions: [target] });
}
break;
case 'setmenutext': {
if (!isCreator) return m.reply('Solo el propietario puede editar el menú.');

const textNew = args.trim();
if (!textNew) return m.reply('Debes enviar el texto completo del menú.');

updateBotMenuConfig(mePn, { menuText: textNew });

await m.react('✅');
return m.reply('✔ Menú personalizado establecido correctamente.');
}
case 'modohot': {
if (!isCreator && !isGroupAdmins) 
return m.reply('Solo el owner o administradores pueden usar este comando.');

if (!isGroup) 
return m.reply('Este comando solo funciona en grupos.');

if (!cfg.modohot || typeof cfg.modohot !== 'object') cfg.modohot = {};

const v = args.trim().toLowerCase();
const groupId = m.chat;

if (!v) {
const current = cfg.modohot[groupId] === true ? 'ACTIVADO' : 'DESACTIVADO';

return m.reply(`╭─〔 🔥 MODO HOT 〕─╮
│ Estado en este grupo: *${current}*
│
│ Opciones:
│ on  - Activar
│ off - Desactivar
│
│ Uso: ${getPrefix()[0]}modohot on/off
╰────────────────────╯`);
}

const on = /^(on|encender|activar|1|si|sí)$/i.test(v);
const off = /^(off|apagar|desactivar|0|no)$/i.test(v);

if (!on && !off) {
return m.reply(`Usa: ${getPrefix()[0]}modohot on/off`);
}

if (off) {
delete cfg.modohot[groupId];
data[meKey] = cfg;
writeData(data);
return m.reply('🔥 Modo Hot desactivado en este grupo.');
}

cfg.modohot[groupId] = true;
data[meKey] = cfg;
writeData(data);

return m.reply('🔥 Modo Hot ACTIVADO en este grupo.');
}
break
case 'cosplay': {
const q = (args || '').toString().trim()
if (!q) return m.reply('Ingresa el nombre del personaje o cosplayer.')
if (!isModoHotActive(mePn, m.chat)) return m.reply('🔥 El Modo Hot debe estar activado.')

await m.react('⏳')

const fetch = (await import('node-fetch')).default

try {
const url = `https://api.nekolabs.web.id/discovery/cosplaytele/search?q=${encodeURIComponent(q)}`
const res = await fetch(url)
const data = await res.json()

if (!data || !data.success || !Array.isArray(data.result) || !data.result.length) {
await m.react('❌')
return m.reply(`No se encontraron resultados para: ${q}`)
}

const pick = data.result[Math.floor(Math.random() * data.result.length)]

const caption = [
'⧉  *C O S P L A Y  -  F I N D E R*',
'',
`  ◦  *Título* : ${pick.title}`,
pick.excerpt ? `  ◦  *Descripción* : ${pick.excerpt}` : '',
`  ◦  *Fuente* : ${pick.url}`,
'',
'*Estado* : Resultado listo'
].join('\n')

const head = `𓊈 ${getBotName(mePn)} 𝐂𝐎𝐒𝐏𝐋𝐀𝐘 𓊉`
const fullCaption = `${head}\n\n${caption}`

let buttons = [
{
buttonId: `.cosplay ${q}`,
buttonText: { displayText: 'Otra 🔃' }
}
]

await conn.sendMessage(
m.chat,
{
image: { url: pick.cover },
caption: fullCaption,
footer: `Desarrollado por ${getBotName(mePn)} - En constante evolución`,
buttons: buttons,
headerType: 1
},
{ quoted: m }
)

await m.react('✅')

} catch (e) {
await m.react('❌')
m.reply('Error al buscar o procesar el cosplay.')
}

break
}
case 'r34':
case 'nsfw': {
try {
await m.react('🥵')

const nsfwApi = "https://api.waifu.pics/nsfw/waifu"
const res = await fetch(nsfwApi)
const data = await res.json()
if (!data || !data.url) return m.reply('Error obteniendo imagen.')

const imgRes = await fetch(data.url)
const arrayBuffer = await imgRes.arrayBuffer()
const imgBuffer = Buffer.from(arrayBuffer)

let processedThumbnail = null
try {
const jimp = require('jimp')
const image = await jimp.read(imgBuffer)
image.resize(250, 250)
processedThumbnail = await image.getBufferAsync(jimp.MIME_JPEG)
} catch {
processedThumbnail = null
}

await conn.sendMessage(m.chat, {
image: imgBuffer,
caption: 'Rico 🥵',
jpegThumbnail: processedThumbnail
}, { quoted: m })

} catch {
await m.react('❌')
await m.reply('Ocurrió un error.')
}
break;
}
case 'phdl':
case 'pornhubdl':
case 'pornhub': {
const { phfans } = require('./scrapers/phfans');

if (!isModoHotActive(mePn, m.chat)) 
return m.reply('🔥 El *Modo Hot* debe estar activado para usar este comando.');

const url = args.trim();
if (!url) return m.reply('Ingresa un enlace válido de Pornhub.');

await m.react('⏳');

try {
const info = await phfans(url);

if (!info || !info.video || !info.video.length) {
await m.react('❌');
return m.reply('No pude obtener información del video.');
}

const videos = info.video;

let menu = `🔥 *PORN HUB – DOWNLOAD*\n\n`;
menu += `🎞️ *${info.title}*\n\n`;
menu += `📥 Selecciona la calidad:\n\n`;

videos.forEach((v, i) => {
menu += `${i + 1}. ${v.quality}p – ${v.size_mb} MB\n`;
});

menu += `\nResponde un número del 1 al ${videos.length}`;

const sentMsg = await conn.sendMessage(
m.chat,
{
image: { url: info.thumbnail },
caption: menu
},
{ quoted: m }
);

global._pendingJobs[sentMsg.key.id] = {
handler: async (connH, mH, txtH, dataH) => {
const num = parseInt(txtH.trim());
const list = dataH.info.video;

if (isNaN(num) || num < 1 || num > list.length)
return mH.reply('Opción inválida.');

const selected = list[num - 1];

await mH.react('⏳');

try {
await connH.sendMessage(
mH.chat,
{
video: { url: selected.download },
caption: `🎥 *${dataH.info.title}*\nCalidad: *${selected.quality}p*`
},
{ quoted: mH }
);

await mH.react('✅');
} catch (err) {
await mH.react('❌');
mH.reply('Error al enviar el video.');
}
},
data: { info }
};

await m.react('📥');

} catch (e) {
await m.react('❌');
m.reply('Error al procesar la solicitud.');
}

break;
}
case 'xnxx':
case 'xnxxdl':
case 'xnx': {
if (!isModoHotActive(mePn, m.chat)) 
return m.reply('🔥 El *Modo Hot* debe estar activado para usar este comando.');

const url = args.trim();
if (!url) return m.reply('Ingresa un enlace válido de XNXX.');

await m.react('⏳');

try {
const api = `https://eliasar-yt-api.vercel.app/api/download/xnxx?URL=${encodeURIComponent(url)}`;
const res = await fetch(api);
const json = await res.json();

if (!json?.status || !json?.datos?.datos) {
await m.react('❌');
return m.reply('No pude obtener información del video.');
}

const info = json.datos.datos;

let menu = `🔥 *XNXX – DOWNLOAD*\n\n`;
menu += `🎞️ *${info.titulo}*\n`;
menu += `🕒 Duración: ${info.duracion}\n`;
menu += `👁️ ${info.vistas} vistas\n\n`;
menu += `📥 Responde:\n*1* para descargar el video en calidad original.\n\n`;

const sentMsg = await conn.sendMessage(
m.chat,
{
image: { url: info.imagen },
caption: menu
},
{ quoted: m }
);

global._pendingJobs[sentMsg.key.id] = {
handler: async (connH, mH, txtH, dataH) => {
const num = parseInt(txtH.trim());
if (isNaN(num) || num !== 1)
return mH.reply('Opción inválida.');

await mH.react('⏳');

try {
await connH.sendMessage(
mH.chat,
{
video: { url: dataH.info.urlVideo },
caption: `🎥 *${dataH.info.titulo}*\nCalidad: *Original*`
},
{ quoted: mH }
);

await mH.react('✅');
} catch (err) {
await mH.react('❌');
mH.reply('Error al enviar el video.');
}
},
data: { info }
};

await m.react('📥');

} catch (e) {
await m.react('❌');
m.reply('Error al procesar la solicitud.');
}

break;
}
case 'promete': {
    if (!isGroup) return m.reply(`${getBotEmoji(mePn)} Solo en grupos.`)
    if (!isGroupAdmins) return m.reply(`${getBotEmoji(mePn)} Solo administradores pueden usar este comando.`)
    if (!isBotAdmins) return m.reply(`${getBotEmoji(mePn)} El bot necesita ser administrador.`)

    let target = null
    if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
        target = m.message.extendedTextMessage.contextInfo.participant
    } else if (m.quoted?.sender) {
        target = m.quoted.sender
    }

    if (!target) return m.reply(`${getBotEmoji(mePn)} Menciona o responde al usuario que quieres ascender.`)

    const participants = (await conn.groupMetadata(m.chat)).participants
    const targetInfo = participants.find(p => p.jid === target)
    const isTargetAdmin = targetInfo && targetInfo.admin

    if (isTargetAdmin) return m.reply(`${getBotEmoji(mePn)} Ese usuario ya es administrador.`)

    await m.react('⏳')
    await conn.groupParticipantsUpdate(m.chat, [target], 'promote')
    await m.react('✅')
    return conn.sendMessage(m.chat, { 
        text: `${getBotEmoji(mePn)} Usuario @${target.split('@')[0]} ahora es administrador.`,
        mentions: [target]
    }, { quoted: m })
}
break;
case 'degrada':
case 'degradar':
case 'rebaja': {
    if (!isGroup) return m.reply(`${getBotEmoji(mePn)} Solo en grupos.`)
    if (!isGroupAdmins) return m.reply(`${getBotEmoji(mePn)} Solo administradores pueden usar este comando.`)
    if (!isBotAdmins) return m.reply(`${getBotEmoji(mePn)} El bot necesita ser administrador.`)

    let target = null
    if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        target = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    } else if (m.message?.extendedTextMessage?.contextInfo?.participant) {
        target = m.message.extendedTextMessage.contextInfo.participant
    } else if (m.quoted?.sender) {
        target = m.quoted.sender
    }

    if (!target) return m.reply(`${getBotEmoji(mePn)} Menciona o responde al usuario que deseas degradar.`)

    const participants = (await conn.groupMetadata(m.chat)).participants
    const targetInfo = participants.find(p => p.jid === target)
    const isTargetAdmin = targetInfo && targetInfo.admin

    if (!isTargetAdmin) return m.reply(`${getBotEmoji(mePn)} Ese usuario no es administrador.`)

    await m.react('⏳')
    await conn.groupParticipantsUpdate(m.chat, [target], 'demote')
    await m.react('✅')
    return conn.sendMessage(m.chat, { 
        text: `${getBotEmoji(mePn)} Usuario @${target.split('@')[0]} ya no es administrador.`,
        mentions: [target]
    }, { quoted: m })
}
break;
case 'antilink': {
    if (!isCreator && !isGroupAdmins) return m.react('❌')
    if (!isGroup) return m.react('❌')

    const argsText = String(args || '').trim().toLowerCase()
    const argsArray = argsText.split(' ')

    if (!argsText) {
        const currentStatus = cfg.antilink && cfg.antilink[m.chat] ? cfg.antilink[m.chat] : 'desactivado'
        const statusText = currentStatus === 'desactivado' ? 'DESACTIVADO' : `ACTIVADO (${currentStatus})`

        m.react('ℹ️')
        return m.reply(`╭─〔 ANTILINK 〕─╮
│ Estado: ${statusText}
│
│ Versiones:
│ v1 - Eliminar + expulsar
│ v2 - Solo eliminar mensaje  
│ v3 - Eliminar + advertencia
│ off - Desactivar
│
│ Uso: ${getPrefix()[0]}antilink v1/v2/v3/off
╰────────────────────╯`)
    }

    let version = argsArray[0]
    let action = argsArray[1]

    if (version === 'off' || version === 'desactivar' || version === 'disable' || action === 'off') {
        if (cfg.antilink && cfg.antilink[m.chat]) {
            delete cfg.antilink[m.chat]
            data[meKey] = cfg
            writeData(data)
            global.db.data = data
            m.react('✅')
            return m.reply('Antilink desactivado en este grupo.')
        } else {
            m.react('⚠️')
            return m.reply('El antilink ya estaba desactivado en este grupo.')
        }
    }

    if (['v1', 'v2', 'v3'].includes(version)) {
        if (!cfg.antilink) cfg.antilink = {}
        cfg.antilink[m.chat] = version
        data[meKey] = cfg
        writeData(data)
        global.db.data = data
        m.react('✅')
        return m.reply(`Antilink ${version} activado en este grupo.`)
    }

    m.react('❌')
    return m.reply(`Usa: ${getPrefix()[0]}antilink v1/v2/v3/off`)
    break
}
case 'reg': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (u.reg) return m.reply(`${getBotEmoji(mePn)} Ya estas registrado. Usa .perfil`);

const input = args.trim();
if (!input.includes('.')) return m.reply(`${getBotEmoji(mePn)} Formato: .reg nombre.edad\nEj: .reg Neveloopp.16`);

const [name, ageStr] = input.split('.');
const age = parseInt(ageStr);
if (!name || !age || age < 10 || age > 100) return m.reply(`${getBotEmoji(mePn)} Edad 10-100.`);

const identifiers = await getUserIdentifiers(conn, senderId);

const newU = { 
reg: true, 
name: name.trim(), 
age: age, 
coins: 100, 
lvl: 1, 
exp: 0, 
str: 10, 
hp: 100, 
max_hp: 100, 
avatar: "https://cdn.russellxz.click/a2a32939.jpg",
av_desc: "Avatar por defecto",
reg_at: Date.now(),
jid: identifiers.jid,
lid: identifiers.lid
};
updateUser(senderId, newU);

const msg = `🎉 *REGISTRO EXITOSO!*

📝 DATOS:
• Nombre: ${name}
• Edad: ${age}
• Nivel: 1
• NvCoins: 100 💰
• Salud: 100/100
• Fuerza: 10

📋 Comandos:
.perfil .avatar .tienda .reto @user .top
.trabajo .buscar .mision .daily`;

await conn.sendMessage(m.chat, {
image: { url: "https://cdn.russellxz.click/226cdc2b.jpg" },
caption: msg
}, { quoted: m });

break;
}

case 'perfil': {
try {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} Usa .reg nombre.edad`);

const expNext = expForLvl(u.lvl + 1);
const expNow = expForLvl(u.lvl);
const expNeed = expNext - expNow;
const expHas = u.exp - expNow;
const perc = Math.floor((expHas / expNeed) * 100);

const bar = (p) => {
const bars = 10;
const filled = Math.floor((p / 100) * bars);
const empty = bars - filled;
return '🟩'.repeat(filled) + '⬜'.repeat(empty);
};

const power = calcPower(u);
const msg = `📊 *PERFIL - ${u.name}*

🏆 ESTADO:
• Nivel: ${u.lvl} | Poder: ${power}
• EXP: ${u.exp} | Siguiente: ${expNeed - expHas} XP
${bar(perc)} ${perc}%

📈 STATS:
• NvCoins: ${u.coins} 💰
• Magia: ${u.magia} | Intel: ${u.intel}
• Fuerza: ${u.str} | Salud: ${u.hp}/${u.max_hp}
• Victorias: ${u.wins} | Derrotas: ${u.loss}`;

if (u.avatar) {
try {
await conn.sendMessage(m.chat, { image: { url: u.avatar }, caption: msg }, { quoted: m });
} catch {
const defaultAvatar = 'https://cdn.russellxz.click/a2a32939.jpg';
await conn.sendMessage(m.chat, { image: { url: defaultAvatar }, caption: msg }, { quoted: m });
}
} else {
const defaultAvatar = 'https://cdn.russellxz.click/a2a32939.jpg';
await conn.sendMessage(m.chat, { image: { url: defaultAvatar }, caption: msg }, { quoted: m });
}
} catch (error) {
await m.reply(`❌ *Error en comando perfil:*\n\`\`\`${error.stack}\`\`\``);
}
break;
}

case 'avatar': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} Usa .reg nombre.edad`);

const desc = args.trim();
if (!desc) {
if (u.avatar) {
return m.reply(`🖼️ *TU AVATAR ACTUAL*\n\nDescripcion: ${u.av_desc}\n\nPara cambiar: .avatar nueva_descripcion\nEj: .avatar guerrero con armadura`);
}
return m.reply(`${getBotEmoji(mePn)} Usa: .avatar descripcion\nEj: .avatar guerrero con armadura`);
}

await m.react('👾');
try {
const prompt = `Crea un avatar de un personaje estilo anime descripcion: ${desc}`;
const apiUrl = `https://api-nv.ultraplus.click/api/ai/image2?prompt=${encodeURIComponent(prompt)}&key=${nvkey}`;
const res = await fetch(apiUrl);
const data = await res.json();

if (!data.status || !data.result?.url) {
await m.react('❌');
return m.reply(`${getBotEmoji(mePn)} Error al generar avatar.`);
}

const imageUrl = data.result.url;

if (u.avatar && u.avatar.includes('cdn.russellxz.click') && !u.avatar.includes('default')) {
await deleteFromCDN(u.avatar);
}

updateUser(senderId, { avatar: imageUrl, av_desc: desc });

let caption = `🖼️ *AVATAR CREADO*`;
if (u.avatar) caption = `🖼️ *AVATAR ACTUALIZADO*`;
caption += `\n\nDescripcion: ${desc}\nJugador: ${u.name}\nNivel: ${u.lvl}`;

await conn.sendMessage(m.chat, {
image: { url: imageUrl },
caption: caption
}, { quoted: m });

await m.react('✅');
} catch (error) {
await m.react('❌');
await m.reply(`${getBotEmoji(mePn)} Error: ${error.message}`);
}
break;
}

case 'tienda': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} Usa .reg nombre.edad`);

let msg = `🏪 *TIENDA RPG* 💰\n\n• Tus NvCoins: ${u.coins}\n\n`;

msg += `🔮 MAGIA:\n`;
msg += `• magia_media - 500 💰\n`;
msg += `• magia_clasica - 1000 💰\n`;
msg += `• magia_alta - 2500 💰\n`;
msg += `• magia_dios - 5000 💰\n\n`;

msg += `🧠 INTELIGENCIA:\n`;
msg += `• int_media - 300 💰\n`;
msg += `• int_inter - 700 💰\n`;
msg += `• int_alta - 1500 💰\n\n`;

msg += `🧪 POCIONES:\n`;
msg += `• poc_vida - 100 💰\n`;
msg += `• poc_fuerza - 200 💰\n\n`;

msg += `📝 Uso: .comprar item\nEj: .comprar magia_media`;

await m.reply(msg);
break;
}

case 'comprar': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} No registrado`);

const itemKey = args.trim().toLowerCase();
const item = SHOP[itemKey];
if (!item) return m.reply(`${getBotEmoji(mePn)} Item no existe. Usa .tienda`);

if (u.coins < item.price) return m.reply(`${getBotEmoji(mePn)} No tienes coins. Necesitas: ${item.price} | Tienes: ${u.coins}`);

const updates = { coins: u.coins - item.price };

if (item.type === "magia") updates.magia = item.val;
else if (item.type === "intel") updates.intel = item.val;
else if (item.type === "item") {
if (item.val === "hp") updates.hp = Math.min(u.max_hp, u.hp + 50);
else if (item.val === "str") updates.str = u.str + 5;
}

updateUser(senderId, updates);

await m.reply(`🛒 *COMPRA EXITOSA*\n\nItem: ${item.name}\nPrecio: ${item.price} 💰\nCoins restantes: ${updates.coins} 💰`);
break;
}

case 'reto': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} Usa .reg nombre.edad`);

const now = Date.now();
if (now - u.last_fight < 300000) {
const wait = Math.ceil((300000 - (now - u.last_fight)) / 60000);
return m.reply(`${getBotEmoji(mePn)} Espera ${wait} min para otra batalla.`);
}

let targetLid = null;
if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
targetLid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
} else if (m.quoted?.key?.participant) {
targetLid = m.quoted.key.participant;
}

if (!targetLid) return m.reply(`${getBotEmoji(mePn)} Menciona o responde al usuario. Ej: .reto @usuario`);

const allUsers = readRpg().users;
let targetUser = null;
let targetUserId = null;

for (const [userId, userData] of Object.entries(allUsers)) {
if (userData.reg && userData.lid === targetLid) {
targetUser = userData;
targetUserId = userId;
break;
}
}

if (!targetUser) return m.reply(`${getBotEmoji(mePn)} Usuario no registrado.`);
if (targetUserId === senderId) return m.reply(`${getBotEmoji(mePn)} No puedes retarte a ti mismo.`);

const battleReq = {
from: senderId,
to: targetUserId,
time: now,
accepted: false
};

global._battleRequests = global._battleRequests || {};
global._battleRequests[targetUserId] = battleReq;

const msg = `⚔️ *DESAFIO DE BATALLA*\n\n${u.name} reto a ${targetUser.name}!\nNivel ${u.lvl} vs Nivel ${targetUser.lvl}\nPoder: ${calcPower(u)} vs ${calcPower(targetUser)}\n\nPara aceptar responde: aceptar\n⏰ Expira en 2 min`;

const sent = await conn.sendMessage(m.chat, { 
text: msg,
mentions: [targetLid]
}, { quoted: m });

global._pendingJobs[sent.key.id] = {
data: { chatId: m.chat, from: senderId, to: targetUserId, reqTime: now },
handler: async (connH, mH, txtH, dataH) => {
if (txtH.trim().toLowerCase() === 'aceptar') {
const responderId = mH.key.participant || mH.key.remoteJid;

const responderUser = getUser(responderId);
if (!responderUser.reg || responderUser.lid !== targetUser.lid) return;

const u1 = getUser(dataH.from);
const u2 = getUser(dataH.to);

if (!u1.reg || !u2.reg) {
await mH.reply(`${getBotEmoji(mePn)} Uno de los jugadores ya no esta registrado.`);
return;
}

await mH.react('⚔️');
const bat = await simBat(u1, u2);

const winUp = {
wins: bat.win.wins + 1,
exp: bat.win.exp + bat.rew.exp,
coins: bat.win.coins + bat.rew.coins,
last_fight: Date.now()
};

const loseUp = {
loss: bat.lose.loss + 1,
exp: Math.max(0, bat.lose.exp - Math.floor(bat.rew.exp * 0.3)),
coins: Math.max(0, bat.lose.coins - bat.rew.loss_coins),
last_fight: Date.now()
};

const winNewLvl = calcLvl(winUp.exp);
if (winNewLvl > bat.win.lvl) {
winUp.lvl = winNewLvl;
winUp.max_hp = 100 + (winNewLvl * 10);
winUp.hp = winUp.max_hp;
}

const winId = bat.win === u1 ? dataH.from : dataH.to;
const loseId = bat.lose === u1 ? dataH.from : dataH.to;

updateUser(winId, winUp);
updateUser(loseId, loseUp);

const winU = getUser(winId);
const loseU = getUser(loseId);

const resMsg = `⚔️ *BATALLA FINALIZADA*\n\n🏆 GANADOR: ${winU.name}\n💔 PERDEDOR: ${loseU.name}\n\nPoder: ${bat.p1Final} vs ${bat.p2Final}\n\n🎁 RECOMPENSAS:\n• ${winU.name}: +${bat.rew.exp} XP, +${bat.rew.coins} 💰\n• ${loseU.name}: -${Math.floor(bat.rew.exp * 0.3)} XP, -${bat.rew.loss_coins} 💰\n\n${winU.lvl > bat.win.lvl ? `🎉 ${winU.name} subio a nivel ${winU.lvl}!` : ''}`;

await connH.sendMessage(dataH.chatId, { 
text: resMsg,
mentions: [winU.lid || winId, loseU.lid || loseId]
}, { quoted: mH });

delete global._battleRequests[dataH.to];
}
}
};

setTimeout(() => {
if (global._battleRequests[targetUserId]?.from === senderId) {
delete global._battleRequests[targetUserId];
}
delete global._pendingJobs[sent.key.id];
}, 120000);

break;
}

case 'trabajo': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} Usa .reg nombre.edad`);

const now = Date.now();
const today = new Date().toDateString();

if (u.last_work && new Date(u.last_work).toDateString() === today && u.work_count >= 3) {
return m.reply(`${getBotEmoji(mePn)} Ya trabajaste 3 veces hoy. Vuelve mañana.`);
}

const works = [
{ name: "Minero", coins: 15, exp: 5 },
{ name: "Cazador", coins: 20, exp: 8 },
{ name: "Herrero", coins: 25, exp: 10 },
{ name: "Mercader", coins: 30, exp: 12 },
{ name: "Guardia", coins: 35, exp: 15 }
];

const work = works[Math.floor(Math.random() * works.length)];
const bonus = Math.floor(Math.random() * 10) + 1;
const totalCoins = work.coins + bonus;
const totalExp = work.exp + Math.floor(bonus / 2);

const newCount = new Date(u.last_work).toDateString() === today ? u.work_count + 1 : 1;

updateUser(senderId, {
coins: u.coins + totalCoins,
exp: u.exp + totalExp,
work_count: newCount,
last_work: now
});

const newLvl = calcLvl(u.exp + totalExp);
let lvlMsg = '';
if (newLvl > u.lvl) {
updateUser(senderId, { lvl: newLvl, max_hp: 100 + (newLvl * 10), hp: 100 + (newLvl * 10) });
lvlMsg = `\n🎉 Subiste a nivel ${newLvl}!`;
}

await m.reply(`💼 *TRABAJO COMPLETADO*\n\nTrabajo: ${work.name}\nGanaste: ${totalCoins} 💰\nEXP: +${totalExp}\nTrabajos hoy: ${newCount}/3${lvlMsg}`);
break;
}

case 'buscar': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} Usa .reg nombre.edad`);

const now = Date.now();
if (u.last_work && now - u.last_work < 60000) {
const wait = Math.ceil((60000 - (now - u.last_work)) / 1000);
return m.reply(`${getBotEmoji(mePn)} Espera ${wait} segundos.`);
}

const finds = [
{ item: "monedas viejas", coins: 5, exp: 2 },
{ item: "joya perdida", coins: 10, exp: 5 },
{ item: "bolsa de oro", coins: 15, exp: 8 },
{ item: "artefacto antiguo", coins: 20, exp: 12 },
{ item: "tesoro escondido", coins: 25, exp: 15 }
];

const find = finds[Math.floor(Math.random() * finds.length)];
const bonus = Math.floor(Math.random() * 8) + 1;
const totalCoins = find.coins + bonus;
const totalExp = find.exp + Math.floor(bonus / 2);

updateUser(senderId, {
coins: u.coins + totalCoins,
exp: u.exp + totalExp,
last_work: now
});

await m.reply(`🔍 *BÚSQUEDA EXITOSA*\n\nEncontraste: ${find.item}\nGanaste: ${totalCoins} 💰\nEXP: +${totalExp}`);
break;
}

case 'daily': {
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);
if (!u.reg) return m.reply(`${getBotEmoji(mePn)} Usa .reg nombre.edad`);

const now = Date.now();
const today = new Date().toDateString();

if (u.daily && new Date(u.daily).toDateString() === today) {
return m.reply(`${getBotEmoji(mePn)} Ya reclamaste tu daily hoy. Vuelve mañana.`);
}

const dailyCoins = 50 + Math.floor(Math.random() * 25);
const dailyExp = 20 + Math.floor(Math.random() * 10);

updateUser(senderId, {
coins: u.coins + dailyCoins,
exp: u.exp + dailyExp,
daily: now
});

await m.reply(`📅 *RECOMPENSA DIARIA*\n\nGanaste: ${dailyCoins} 💰\nEXP: +${dailyExp}\n¡Vuelve mañana por más!`);
break;
}

case 'top': {
const rpg = readRpg();
const senderId = m.key.participant || m.key.remoteJid;
const u = getUser(senderId);

if (rpg.tops.length === 0) return m.reply(`${getBotEmoji(mePn)} No hay jugadores en el ranking.`);

let msg = `🏆 *TOP 10 JUGADORES*\n\n`;

rpg.tops.forEach((p, i) => {
const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `▫️${i + 1}`;
msg += `${medal} ${p.name} - Nvl ${p.lvl} | Poder ${p.power}\n`;
});

const userPos = rpg.tops.findIndex(p => p.id === senderId);
if (userPos !== -1) {
msg += `\n📊 Tu posición: #${userPos + 1}`;
} else if (u.reg) {
const userPower = calcPower(u);
const above = rpg.tops.filter(p => p.power > userPower).length;
msg += `\n📊 Tu posición: #${above + 1} (Fuera del top 10)`;
}

await m.reply(msg);
break;
}


case 'fixlids': {
if (!isCreator) return m.reply('Solo el owner puede usar este comando.');

let fixedCount = 0;
const data = readData();

for (const [key, cfg] of Object.entries(data)) {
if (cfg.botlid && cfg.botlid.includes(':') && cfg.botlid.includes('@lid')) {
const correctDigits = cfg.botlid.split(':')[0].replace(/[^0-9]/g, '');
if (correctDigits) {
const oldLid = cfg.botlid;
cfg.botlid = `${correctDigits}@lid`;
fixedCount++;
console.log(`Corregido: ${oldLid} -> ${cfg.botlid}`);
}
}
}

if (fixedCount > 0) {
writeData(data);
m.reply(`✅ Se corrigieron ${fixedCount} LIDs mal formados.`);
} else {
m.reply('✅ No se encontraron LIDs mal formados.');
}
break;
}
case 'setmenu': {
if (!isCreator) return m.reply('Solo el propietario puede personalizar el menú.')

const input = args.trim()
if (!input) {
const menuConfig = getBotMenuConfig(mePn)
const currentConfig = Object.assign({}, DEFAULT_MENU_CONFIG, menuConfig)
const configText = `╭───◉ 〚 CONFIGURACIÓN ACTUAL DEL MENÚ 〛
│ ◦ Texto: ${currentConfig.welcomeText}
│ ◦ URLs: ${currentConfig.mediaUrls.join(' | ')}
╰────────────────`
return m.reply(configText)
}

if (input.startsWith('http')) {
const urls = input.split('|').map(url => url.trim()).filter(url => url)
updateBotMenuConfig(mePn, { mediaUrls: urls })
await m.react('✅')
m.reply(`✅ URLs del menú actualizadas: ${urls.length} URLs configuradas`)
} else {
const processedText = input.replace(/\$bot/g, getBotName(mePn))
updateBotMenuConfig(mePn, { welcomeText: processedText })
await m.react('✅')
m.reply('✅ Texto del menú actualizado.')
}
break
}

case 'setname': {
if (!isCreator) return m.reply('Solo el propietario puede cambiar el nombre del bot.')
const newName = args.trim()
if (!newName) return m.reply('Debes proporcionar un nuevo nombre.')
const botId = mePn
updateBotConfig(botId, { name: newName })
await m.react('✅')
m.reply(`Nombre del bot actualizado a: *${newName}*`)
break
}
case 'setemoji': {
if (!isCreator) return m.reply('Solo el propietario puede cambiar el emoji del bot.')
const newEmoji = args.trim()
if (!newEmoji) return m.reply('Debes proporcionar un nuevo emoji.')
const botId = mePn
updateBotConfig(botId, { emoji: newEmoji })
await m.react('✅')
m.reply(`${getBotEmoji(mePn)} del bot actualizado a: ${newEmoji}`)
break
}
case 'setphoto': {
if (!isCreator) return m.reply('Solo el propietario puede cambiar la foto de los mensajes.')
const newPhoto = args.trim()
if (!newPhoto) return m.reply('Debes proporcionar una nueva URL de foto.')
if (!/^https?:\/\/.+\..+/.test(newPhoto)) return m.reply('URL inválida.')
const botId = mePn
updateBotConfig(botId, { menuPhoto: newPhoto })
await m.react('✅')
m.reply('Foto de los mensajes actualizada exitosamente.')
break
}
case 'botconfig': {
if (!isCreator) return m.reply('Solo el propietario puede ver la configuración.')
const botId = mePn
const config = getBotConfig(botId)
const configText = `╭─〔 ⚙️ CONFIGURACIÓN DEL BOT 〕─╮
│ ∘ Nombre: ${config.name}
│ ∘ getBotEmoji(mePn): ${config.emoji}
│ ∘ Foto Menú: ${config.menuPhoto}
│ ∘ ID Bot: ${botId}
╰────────────────────────────╯`
m.reply(configText)
break
}
case 'resetconfig': {
if (!isCreator) return m.reply('Solo el propietario puede restablecer la configuración.')
const botId = mePn
const botConfigs = readBotConfig()
delete botConfigs[botId]
writeBotConfig(botConfigs)
await m.react('✅')
m.reply('Configuración restablecida a valores por defecto.')
break
}
case 'antiprivado': {
if (!isCreator) return m.reply('Solo mi dueño o yo podemos usar este comando.')
const v = String(args || '').trim().toLowerCase()
if (!v) return m.reply(`Usa: ${getPrefix()[0]}antiprivado on/off`)
const on = /^(on|encender|activar|1|si|sí)$/i.test(v)
const off = /^(off|apagar|desactivar|0|no)$/i.test(v)
if (!on && !off) return m.reply(`Usa: ${getPrefix()[0]}antiprivado on/off`)
cfg.antiprivado = on
data[meKey] = cfg; writeData(data)
return m.reply(`✅ antiprivado ${on ? 'activado' : 'desactivado'}`)
}
case 'modobot': {
if (!isCreator) return m.reply('Solo mi dueño o yo podemos usar este comando.')
const v = String(args || '').trim().toLowerCase()
if (!v) return m.reply(`Usa: ${getPrefix()[0]}modobot on/off`)
const on = /^(on|encender|activar|1|si|sí)$/i.test(v)
const off = /^(off|apagar|desactivar|0|no)$/i.test(v)
if (!on && !off) return m.reply(`Usa: ${getPrefix()[0]}modobot on/off`)
cfg.modobot = on
data[meKey] = cfg; writeData(data)
return m.reply(`✅ modobot ${on ? 'activado' : 'desactivado'}`)
}
case 'noprefix': {
if (!isCreator) return m.reply('Solo mi dueño o yo podemos usar este comando.')

const v = String(args || '').trim().toLowerCase()
if (!v) return m.reply(`Usa: ${getPrefix()[0]}noprefix on/off\nEstado actual: ${cfg.noprefix ? 'ON' : 'OFF'}`)

const on = /^(on|encender|activar|1|si|sí)$/i.test(v)
const off = /^(off|apagar|desactivar|0|no)$/i.test(v)
if (!on && !off) return m.reply(`Usa: ${getPrefix()[0]}noprefix on/off`)

cfg.noprefix = on
data[meKey] = cfg
writeData(data)

return m.reply(`✅ noprefix ${on ? 'activado' : 'desactivado'}\n\n${on ? 'Ahora los comandos funcionarán sin prefijo' : 'Ahora los comandos necesitan prefijo'}`)
}
case 'prigrupo': {
if (!isCreator) return m.reply('Solo mi dueño o yo podemos usar este comando.')
const v = String(args || '').trim().toLowerCase()
if (!v) return m.reply(`Usa: ${getPrefix()[0]}prigrupo on/off`)
const on = /^(on|encender|activar|1|si|sí)$/i.test(v)
const off = /^(off|apagar|desactivar|0|no)$/i.test(v)
if (!on && !off) return m.reply(`Usa: ${getPrefix()[0]}prigrupo on/off`)
cfg.prigrupo = on
data[meKey] = cfg; writeData(data)
return m.reply(`✅ prigrupo ${on ? 'activado' : 'desactivado'}`)
}
case 'addgrupo': {
if (!isCreator) return m.reply('Solo mi dueño o yo podemos usar este comando.')
if (!isGroup) return m.reply('Este comando solo en grupos.')
if (!cfg.gruposPermitidos.includes(chat)) cfg.gruposPermitidos.push(chat)
data[meKey] = cfg; writeData(data)
return m.reply('✅ Grupo agregado a la lista permitida.')
}
case 'delgrupo': {
if (!isCreator) return m.reply('Solo mi dueño o yo podemos usar este comando.')
if (!isGroup) return m.reply('Este comando solo en grupos.')
cfg.gruposPermitidos = cfg.gruposPermitidos.filter(g => g !== chat)
data[meKey] = cfg; writeData(data)
return m.reply('✅ Grupo eliminado de la lista permitida.')
}
case 'waifu': {
const response = await fetch('https://nekos.life/api/v2/img/neko')
const data = await response.json()
conn.sendMessage(m.chat, { image: { url: data.url }, caption: "Waifu" }, { quoted: m })
break
}
case 'threads': {
if (!args || args.length === 0) return m.reply('¿Dónde está la URL de Threads?')
m.reply('📥 Descargando de Threads...')
try {
const botName = getBotName(mePn) || "Bot";
const TMdl = require('./scrapers/tmdl.js')
const tmdl = new TMdl()
const res = await tmdl.dl(args)

if (!res.status) throw new Error(res.error)

const vd = res.result

let thumbBuffer = null
if (vd.thumb || vd.pImg) {
try {
const thumbUrl = vd.thumb || vd.pImg
const thumbRes = await fetch(thumbUrl)
const buffer = await thumbRes.arrayBuffer()
const image = await require('jimp').read(Buffer.from(buffer))
image.resize(250, 250)
thumbBuffer = await image.getBufferAsync(require('jimp').MIME_JPEG)
} catch (error) {
console.error('Error procesando thumbnail:', error)
thumbBuffer = null
}
}

await conn.sendMessage(m.chat, {
video: { url: vd.dUrl },
caption: `⧉  *T H R E A D S - D O W N L O A D E R*

◦  *Título* : ${vd.tit || '-'}
◦  *Creador* : ${vd.aut || '-'}
◦  *Plataforma* : Threads
◦  *Estado* : Descarga completada

> Desarrollado por ${botName} - En constante evolución`,
jpegThumbnail: thumbBuffer
}, { quoted: m })

} catch (error) {
console.error(error)
await m.reply(`❌ Error en threads:\n\`\`\`${error.message}\`\`\``)
}
}
break
case 'quemusica':
case 'quemusicaes':
case 'whatmusic': {
const acrcloud = require('acrcloud');
const fs = require('fs');
const yts = require('yt-search');

const acr = new acrcloud({
host: 'identify-eu-west-1.acrcloud.com',
access_key: 'c33c767d683f78bd17d4bd4991955d81',
access_secret: 'bvgaIAEtADBTbLwiPGYlxupWqkNGIjT7J9Ag2vIu',
});

const q = m.quoted ? m.quoted : m;
const msg = q.message || {};
const type = Object.keys(msg)[0] || '';

if (!/audioMessage|videoMessage/i.test(type)) {
return m.reply(`${getBotEmoji(mePn)} Responde a un audio o video para identificar la música.`);
}

if ((q.msg || q).seconds > 20) {
return m.reply('⚠️ El audio/video es muy largo. Usa entre 5-20 segundos.');
}

await m.react('⏳');

const media = await q.download();

let ext = 'mp3';
if (type === 'videoMessage') {
ext = 'mp4';
}

const tempFilePath = `./tmp/${m.sender}.${ext}`;
fs.writeFileSync(tempFilePath, media);

try {
const res = await acr.identify(fs.readFileSync(tempFilePath));
const { code, msg } = res.status;

if (code !== 0) throw msg;

const { title, artists, album, genres, release_date } = res.metadata.music[0];

const search = await yts(title);
const video = search.videos.length > 0 ? search.videos[0] : null;

const head = `𓊈 ${getBotName(mePn)} 𝐌𝐔𝐒𝐈𝐂 𝐈𝐃 𓊉`;

const details = `
╭─〔  R E S U L T A D O 〕─╮
│ ∘ Título : ${title}
│ ∘ Artista : ${artists?.map(v => v.name).join(', ') || 'Desconocido'}
│ ∘ Álbum : ${album?.name || 'No encontrado'}
│ ∘ Género : ${genres?.map(v => v.name).join(', ') || 'No encontrado'}
│ ∘ Lanzamiento : ${release_date || 'No encontrado'}
│ ∘ YouTube : ${video ? video.url : 'No encontrado'}
╰─────────────────────────╯
`.trim();

if (!video) {
await m.react('❌');
return m.reply('⚠️ La canción fue identificada, pero no se encontró video en YouTube.');
}

await conn.sendMessage(m.chat, {
image: { url: video.thumbnail },
caption: `${head}\n\n${details}`,
footer: `Detectado por ${getBotName(mePn)} ${getBotEmoji(mePn)}`,
buttons: [
{
buttonId: `.ytmp3 ${video.url}`,
buttonText: { displayText: "🎧 Descargar Audio" }
}
],
headerType: 4
}, { quoted: m });

await m.react('✅');

} catch (error) {
await m.react('❌');
m.reply(`⚠️ Error al identificar: ${error}`);
} finally {
fs.unlinkSync(tempFilePath);
}

break;
}
case 'play': {
const q = (args || '').toString().trim()
if (!q) return m.reply(`${getBotEmoji(mePn)} Ingresa el nombre de la canción o enlace de YouTube.`)
await m.react('⏳')
try {
let videoInfo = null
let isLongVideo = false

if (q.includes('youtube.com') || q.includes('youtu.be')) {
const infoUrl = `https://api-nv.ultraplus.click/api/youtube/info?url=${encodeURIComponent(q)}&key=${nvkey}`
const infoRes = await fetch(infoUrl)
const infoData = await infoRes.json()

if (infoData?.status && infoData.Result) {
videoInfo = infoData.Result
const duration = videoInfo.duracion

const timeParts = duration.split(':')
let totalMinutes = 0

if (timeParts.length === 2) {
totalMinutes = parseInt(timeParts[0]) + (parseInt(timeParts[1]) / 60)
} else if (timeParts.length === 3) {
totalMinutes = (parseInt(timeParts[0]) * 60) + parseInt(timeParts[1]) + (parseInt(timeParts[2]) / 60)
}

isLongVideo = totalMinutes > 10
}
}

if (!videoInfo) {
const res = await fetch(`https://api-nv.ultraplus.click/api/youtube/search?q=${encodeURIComponent(q)}&key=${nvkey}`)
const dataApi = await res.json()
if (!dataApi?.status || !Array.isArray(dataApi.Result) || !dataApi.Result.length) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se encontraron resultados.`)
}
videoInfo = dataApi.Result[0]

const duration = videoInfo.duracion
const timeParts = duration.split(':')
let totalMinutes = 0

if (timeParts.length === 2) {
totalMinutes = parseInt(timeParts[0]) + (parseInt(timeParts[1]) / 60)
} else if (timeParts.length === 3) {
totalMinutes = (parseInt(timeParts[0]) * 60) + parseInt(timeParts[1]) + (parseInt(timeParts[2]) / 60)
}

isLongVideo = totalMinutes > 10
}

const { titulo, canal, vistas, duracion, fecha, url, miniatura } = videoInfo

const head = `𓊈 ${getBotName(mePn)} 𝐏𝐋𝐀𝐘 𓊉`
const resultBox = [
'⧉  *Y O U T U B E - P L A Y E R*',
'',
`  ◦  *Título* : ${titulo}`,
`  ◦  *Duración* : ${duracion}`,
`  ◦  *Vistas* : ${vistas}`,
`  ◦  *Canal* : ${canal}`,
`  ◦  *Publicado* : ${fecha}`,
`  ◦  *Link* : ${url}`,
'',
'*Estado* : Reproducción lista'
].join('\n')

const caption = `${head}\n\n${resultBox}`

let buttons = []

if (isLongVideo) {
buttons = [
{
buttonId: `.ytmp3doc ${url}`, 
buttonText: { 
displayText: 'Audio MP3 (Documento)' 
}
}, {
buttonId: `.ytmp4doc ${url}`, 
buttonText: {
displayText: 'Video MP4 (Documento)'
}
}
]
} else {
buttons = [
{
buttonId: `.ytmp3doc ${url}`, 
buttonText: { 
displayText: 'Audio MP3 (Documento)' 
}
}, {
buttonId: `.ytmp4doc ${url}`, 
buttonText: {
displayText: 'Video MP4 (Documento)'
}
}, {
buttonId: `.ytmp3 ${url}`, 
buttonText: {
displayText: 'Audio MP3 (Audio)'
}
}, {
buttonId: `.ytmp4 ${url}`, 
buttonText: {
displayText: 'Video MP4 (Video)'
}
}
]
}

await conn.sendMessage(m.chat, {
image: { url: miniatura },
caption: caption,
footer: `Desarrollado por ${getBotName(mePn)} - En constante evolución`,
buttons: buttons,
headerType: 1
}, { quoted: m });

await m.react('✅')
} catch {
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al buscar o procesar el video.`)
}
break
}
case 'ytmp3': {
if (!args || args.length === 0) return m.reply('¿Dónde está la URL?')
await ytDownloadAudio(conn, m, args, false)
}
break

case 'ytmp4': {
if (!args || args.length === 0) return m.reply('¿Dónde está la URL?')
await ytDownloadVideo(conn, m, args, false)
}
break

case 'ytmp3doc': {
if (!args || args.length === 0) return m.reply('¿Dónde está la URL?')
await ytDownloadAudio(conn, m, args, true)
}
break

case 'ytmp4doc': {
if (!args || args.length === 0) return m.reply('¿Dónde está la URL?')
await ytDownloadVideo(conn, m, args, true)
}
break
case 'mp3':
case 'ytmp3v2': {
if (!args) return m.reply('Ingresa una URL válida.');
await m.react('⏳');
const yt2dow = require('./scrapers/ytdow2.js');

try {
const encoded = encodeURIComponent(args);
const infoApi = `https://api-nv.ultraplus.click/api/youtube/info?url=${encoded}&key=${nvkey}`;
const getInfo = await fetch(infoApi);
const infoJson = await getInfo.json();
if (!infoJson.status) return m.reply('Error info.');
const info = infoJson.Result;

const downloadUrl = await yt2dow(args, { type: 'audio', format: 'mp3' });

await conn.sendMessage(m.chat, {
audio: { url: downloadUrl },
mimetype: 'audio/mpeg',
fileName: `${info.titulo}.mp3`
}, { quoted: m });

await m.react('✅');
} catch (e) {
await m.react('❌');
m.reply('Error mp3.');
}
}
break;

case 'mp3doc':
case 'ytmp3docv2': {
if (!args) return m.reply('Ingresa una URL válida.');
await m.react('⏳');
const yt2dow = require('./scrapers/ytdow2.js');

try {
const encoded = encodeURIComponent(args);
const infoApi = `https://api-nv.ultraplus.click/api/youtube/info?url=${encoded}&key=${nvkey}`;
const getInfo = await fetch(infoApi);
const infoJson = await getInfo.json();
if (!infoJson.status) return m.reply('Error info.');
const info = infoJson.Result;

let processedThumbnail = null;
try {
const thumbReq = await fetch(info.miniatura);
const buf = await thumbReq.arrayBuffer();
const img = await require('jimp').read(Buffer.from(buf));
img.resize(250, 250);
processedThumbnail = await img.getBufferAsync(require('jimp').MIME_JPEG);
} catch {}

const downloadUrl = await yt2dow(args, { type: 'audio', format: 'mp3' });

await conn.sendMessage(m.chat, {
document: { url: downloadUrl },
mimetype: 'audio/mpeg',
fileName: `${info.titulo}.mp3`,
caption: info.titulo,
jpegThumbnail: processedThumbnail
}, { quoted: m });

await m.react('✅');
} catch (e) {
await m.react('❌');
m.reply('Error mp3doc.');
}
}
break;

case 'mp4':
case 'ytmp4v2': {
if (!args) return m.reply('Ingresa una URL válida.');
await m.react('⏳');
const yt2dow = require('./scrapers/ytdow2.js');

try {
const url = args.split(" ")[0];
const quality = args.split(" ")[1] || "720";
const encoded = encodeURIComponent(url);

const infoApi = `https://api-nv.ultraplus.click/api/youtube/info?url=${encoded}&key=${nvkey}`;
const getInfo = await fetch(infoApi);
const infoJson = await getInfo.json();
if (!infoJson.status) return m.reply('Error info.');
const info = infoJson.Result;

const downloadUrl = await yt2dow(url, { type: 'video', quality });

await conn.sendMessage(m.chat, {
video: { url: downloadUrl },
mimetype: 'video/mp4',
fileName: `${info.titulo}.mp4`,
caption: info.titulo
}, { quoted: m });

await m.react('✅');
} catch (e) {
await m.react('❌');
m.reply('Error mp4.');
}
}
break;

case 'mp4doc':
case 'ytmp4docv2': {
if (!args) return m.reply('Ingresa una URL válida.');
await m.react('⏳');
const yt2dow = require('./scrapers/ytdow2.js');

try {
const url = args.split(" ")[0];
const quality = args.split(" ")[1] || "720";
const encoded = encodeURIComponent(url);

const infoApi = `https://api-nv.ultraplus.click/api/youtube/info?url=${encoded}&key=${nvkey}`;
const getInfo = await fetch(infoApi);
const infoJson = await getInfo.json();
if (!infoJson.status) return m.reply('Error info.');
const info = infoJson.Result;

let processedThumbnail = null;
try {
const thumbReq = await fetch(info.miniatura);
const buf = await thumbReq.arrayBuffer();
const img = await require('jimp').read(Buffer.from(buf));
img.resize(250, 250);
processedThumbnail = await img.getBufferAsync(require('jimp').MIME_JPEG);
} catch {}

const downloadUrl = await yt2dow(url, { type: 'video', quality });

await conn.sendMessage(m.chat, {
document: { url: downloadUrl },
mimetype: 'video/mp4',
fileName: `${info.titulo}.mp4`,
caption: info.titulo,
jpegThumbnail: processedThumbnail
}, { quoted: m });

await m.react('✅');
} catch (e) {
await m.react('❌');
m.reply('Error mp4doc.');
}
}
break;
case 'tomanga':
case 'manga': {
let imageBuffer

if (m.quoted && m.quoted.message && m.quoted.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m.quoted)
} else if (m.message && m.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m)
} else {
return m.reply(`${getBotEmoji(mePn)} Envía una imagen o responde a una imagen para convertir a estilo manga.`)
}

await m.react('⏳')

try {
const FormData = require('form-data')
const form = new FormData()
form.append('file', imageBuffer, {
filename: 'image.jpg',
contentType: 'image/jpeg'
})
form.append('expiry', '120')

const uploadResponse = await fetch('https://cdn.russellxz.click/upload.php', {
method: 'POST',
body: form
})

const uploadData = await uploadResponse.json()

if (!uploadData.url) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al subir la imagen al CDN.`)
}

const imageUrl = uploadData.url
const apiUrl = `https://api.nekolabs.web.id/tools/convert/tomanga?imageUrl=${encodeURIComponent(imageUrl)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al convertir la imagen a estilo manga.`)
}

const convertedImageUrl = data.result
const imageResponse = await fetch(convertedImageUrl)
const convertedBuffer = await imageResponse.buffer()

const originType = m.quoted ? 'imagen respondida' : 'imagen enviada'

const caption = `⧉  *M A N G A - C O N V E R T E R*

◦  *Filtro* : Estilo Manga
◦  *Origen* : ${originType}
◦  *Estado* : Conversión completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
image: convertedBuffer, 
caption: caption
}, { quoted: m })

await m.react('✅')

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al procesar la imagen.`)
}
break
}
case 'fps': {
if (!text) return m.reply(`${getBotEmoji(mePn)} Por favor, proporciona el valor de FPS.\nEjemplo: .fps 300`)

const args = text.split(' ')
const fpsValue = parseInt(args[1] || args[0])

if (isNaN(fpsValue) || fpsValue <= 0 || fpsValue > 1000) return m.reply(`${getBotEmoji(mePn)} Por favor, proporciona un valor de FPS válido (1-1000).\nEjemplo: .fps 300`)

let videoBuffer

if (m.quoted && m.quoted.message && m.quoted.message.videoMessage) {
videoBuffer = await getBufferFromMsg(m.quoted)
} else if (m.message && m.message.videoMessage) {
videoBuffer = await getBufferFromMsg(m)
} else {
return m.reply(`${getBotEmoji(mePn)} Envía un video o responde a un video para modificar los FPS.`)
}

await m.react('⏳')

try {
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const timestamp = Date.now()
const inputFileName = `input_${timestamp}.mp4`
const outputFileName = `output_${fpsValue}fps_${timestamp}.mp4`

const tmpDir = 'tmp'
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const inputPath = path.join(tmpDir, inputFileName)
const outputPath = path.join(tmpDir, outputFileName)

fs.writeFileSync(inputPath, videoBuffer)

await new Promise((resolve, reject) => {
const ffmpeg = spawn('ffmpeg', [
'-i', inputPath,
'-filter:v', `fps=${fpsValue}`,
'-c:a', 'copy',
'-y',
outputPath
])

let errorOutput = ''

ffmpeg.stderr.on('data', (data) => {
errorOutput += data.toString()
})

ffmpeg.on('close', (code) => {
if (code === 0) resolve()
else reject(new Error(`FFmpeg error: ${errorOutput}`))
})

ffmpeg.on('error', reject)
})

const processedBuffer = fs.readFileSync(outputPath)
if (!processedBuffer || processedBuffer.length === 0) throw new Error('El video procesado está vacío')

const fileSizeMB = (processedBuffer.length / (1024 * 1024)).toFixed(2)

const now = new Date()
const year = now.getFullYear()
const month = String(now.getMonth() + 1).padStart(2, '0')
const day = String(now.getDate()).padStart(2, '0')
const randomNum = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
const fileName = `VID-${year}${month}${day}-WA${randomNum}.mp4`

const caption = `⧉  *F P S - C O N V E R T E R*

◦  *FPS objetivo* : ${fpsValue}
◦  *Tamaño* : ${fileSizeMB} MB
◦  *Estado* : Procesamiento completado

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
document: processedBuffer,
fileName: fileName,
mimetype: 'video/mp4',
caption: caption
}, { quoted: m })

await m.react('✅')

try {
if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
} catch (cleanupError) {}

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al procesar el video.`)
}
break
}
case 'res': {
if (!text) return m.reply(`${getBotEmoji(mePn)} Proporciona una resolución válida.: .res 1080`)

const args = text.split(' ')
const resolution = parseInt(args[1] || args[0])

if (![144, 240, 360, 480, 720, 1080, 1440, 2160].includes(resolution)) 
return m.reply(`${getBotEmoji(mePn)} Resolución no válida.\nEjemplo: .res 720`)

let videoBuffer

if (m.quoted?.message?.videoMessage) {
videoBuffer = await getBufferFromMsg(m.quoted)
} else if (m.message?.videoMessage) {
videoBuffer = await getBufferFromMsg(m)
} else {
return m.reply(`${getBotEmoji(mePn)} Envía o responde a un video para modificar la resolución.`)
}

await m.react('⏳')

try {
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const timestamp = Date.now()
const inputFileName = `input_${timestamp}.mp4`
const outputFileName = `output_resolution_${timestamp}.mp4`

const tmpDir = 'tmp'
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const inputPath = path.join(tmpDir, inputFileName)
const outputPath = path.join(tmpDir, outputFileName)

fs.writeFileSync(inputPath, videoBuffer)

await new Promise((resolve, reject) => {
const ffmpeg = spawn('ffmpeg', [
'-i', inputPath,
'-vf', `scale=-2:${resolution}`,
'-c:a', 'copy',
'-y',
outputPath
])

ffmpeg.stderr.on('data', () => {})
ffmpeg.on('close', code => code === 0 ? resolve() : reject())
ffmpeg.on('error', reject)
})

const processedBuffer = fs.readFileSync(outputPath)
if (!processedBuffer.length) throw new Error('El video procesado está vacío')

const fileSizeMB = (processedBuffer.length / (1024 * 1024)).toFixed(2)
const fileName = `VID-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*10000)}.mp4`

const caption = `⧉  *R E S O L U C I Ó N - C O N V E R T E R*

◦  *Resolución objetivo* : ${resolution}p
◦  *Tamaño* : ${fileSizeMB} MB
◦  *Estado* : Completado correctamente

> Desarrollado por ${getBotName(mePn)}`

await conn.sendMessage(m.chat, { 
document: processedBuffer,
fileName: fileName,
mimetype: 'video/mp4',
caption
}, { quoted: m })

await m.react('✅')

fs.unlinkSync(inputPath)
fs.unlinkSync(outputPath)

} catch (err) {
console.error(err)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al cambiar la resolución del video.`)
}
break
}
case 'toghibli':
case 'ghibli': {
let imageBuffer

if (m.quoted && m.quoted.message && m.quoted.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m.quoted)
} else if (m.message && m.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m)
} else {
return m.reply(`${getBotEmoji(mePn)} Envía una imagen o responde a una imagen para convertir a estilo Ghibli.`)
}

await m.react('⏳')

try {
const FormData = require('form-data')
const form = new FormData()
form.append('file', imageBuffer, {
filename: 'image.jpg',
contentType: 'image/jpeg'
})
form.append('expiry', '120')

const uploadResponse = await fetch('https://cdn.russellxz.click/upload.php', {
method: 'POST',
body: form
})

const uploadData = await uploadResponse.json()

if (!uploadData.url) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al subir la imagen al CDN.`)
}

const imageUrl = uploadData.url
const apiUrl = `https://api.nekolabs.web.id/tools/convert/toghibli/v1?imageUrl=${encodeURIComponent(imageUrl)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al convertir la imagen a estilo Ghibli.`)
}

const convertedImageUrl = data.result
const imageResponse = await fetch(convertedImageUrl)
const convertedBuffer = await imageResponse.buffer()

const originType = m.quoted ? 'imagen respondida' : 'imagen enviada'

const caption = `⧉  *G H I B L I - C O N V E R T E R*

◦  *Filtro* : Estudio Ghibli
◦  *Origen* : ${originType}
◦  *Estado* : Conversión completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
image: convertedBuffer, 
caption: caption
}, { quoted: m })

await m.react('✅')

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al procesar la imagen.`)
}
break
}
case 'topixar':
case 'pixar': {
let imageBuffer

if (m.quoted && m.quoted.message && m.quoted.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m.quoted)
} else if (m.message && m.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m)
} else {
return m.reply(`${getBotEmoji(mePn)} Envía una imagen o responde a una imagen para convertir a estilo Pixar.`)
}

await m.react('⏳')

try {
const FormData = require('form-data')
const form = new FormData()
form.append('file', imageBuffer, {
filename: 'image.jpg',
contentType: 'image/jpeg'
})
form.append('expiry', '120')

const uploadResponse = await fetch('https://cdn.russellxz.click/upload.php', {
method: 'POST',
body: form
})

const uploadData = await uploadResponse.json()

if (!uploadData.url) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al subir la imagen al CDN.`)
}

const imageUrl = uploadData.url
const apiUrl = `https://api.nekolabs.web.id/tools/convert/topixar?imageUrl=${encodeURIComponent(imageUrl)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al convertir la imagen a estilo Pixar.`)
}

const convertedImageUrl = data.result
const imageResponse = await fetch(convertedImageUrl)
const convertedBuffer = await imageResponse.buffer()

const originType = m.quoted ? 'imagen respondida' : 'imagen enviada'

const caption = `⧉  *P I X A R - C O N V E R T E R*

◦  *Filtro* : Estudio Pixar
◦  *Origen* : ${originType}
◦  *Estado* : Conversión completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
image: convertedBuffer, 
caption: caption
}, { quoted: m })

await m.react('✅')

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al procesar la imagen.`)
}
break
}
case 'hd':
case 'upscale': {
let imageBuffer

if (m.quoted && m.quoted.message && m.quoted.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m.quoted)
} else if (m.message && m.message.imageMessage) {
imageBuffer = await getBufferFromMsg(m)
} else {
return m.reply(`${getBotEmoji(mePn)} Envía una imagen o responde a una imagen para mejorar la calidad.`)
}

await m.react('⏳')

try {
const FormData = require('form-data')
const form = new FormData()
form.append('file', imageBuffer, {
filename: 'image.jpg',
contentType: 'image/jpeg'
})
form.append('expiry', '120')

const uploadResponse = await fetch('https://cdn.russellxz.click/upload.php', {
method: 'POST',
body: form
})

const uploadData = await uploadResponse.json()

if (!uploadData.url) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al subir la imagen al CDN.`)
}

const imageUrl = uploadData.url
const apiUrl = `https://api.nekolabs.web.id/tools/pxpic/upscale?imageUrl=${encodeURIComponent(imageUrl)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al mejorar la calidad de la imagen.`)
}

const upscaledImageUrl = data.result
const imageResponse = await fetch(upscaledImageUrl)
const upscaledBuffer = await imageResponse.buffer()

const originType = m.quoted ? 'imagen respondida' : 'imagen enviada'

const caption = `⧉  *H D - U P S C A L E R*

◦  *Proceso* : Mejora de calidad
◦  *Origen* : ${originType}
◦  *Estado* : Mejora completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
image: upscaledBuffer, 
caption: caption
}, { quoted: m })

await m.react('✅')

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al procesar la imagen.`)
}
break
}
case 'brat': {
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg')

if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un texto para el video.`)
await m.react('🔄')
try {
const encodedText = encodeURIComponent(args)
const apiUrl = `https://api.zenzxz.my.id/api/maker/bratvid?text=${encodedText}`
const response = await fetch(apiUrl)
const videoBuffer = await response.buffer()
await conn.sendVideoAsSticker(m.chat, videoBuffer, m, { 
packname: 'Neveloopp Pack', 
author: 'Neveloopp' 
})
await m.react('✅')
} catch (error) {
await m.react('❌')
console.error('Error en brat:', error)
await m.reply(`${getBotEmoji(mePn)} Error al generar el video sticker:\n\n\`\`\`${error.stack || error.message}\`\`\``)
}
break
}

case 'spotify': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa el nombre de una canción o un enlace de Spotify válido.`)
await m.react('⏳')
try {
let spotifyUrl = '', title = '', artist = '', image = '', duration = '', album = '', publish = '', source = ''
if (args.includes('spotify.com') || args.includes('spotify.link')) {
spotifyUrl = args
const res = await fetch(`https://api-nv.ultraplus.click/api/download/spotify?url=${encodeURIComponent(spotifyUrl)}&key=${nvkey}`)
const json = await res.json()
if (!json?.status || !json.result?.url_download) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se pudo obtener la canción.`)
}
title = json.result.title
artist = json.result.artist
image = json.result.image
source = json.result.source
duration = 'Desconocido'
album = 'Desconocido'
publish = 'Desconocido'
spotifyUrl = json.result.source
} else {
const searchRes = await fetch(`https://delirius-apiofc.vercel.app/search/spotify?q=${encodeURIComponent(args)}&limit=5`)
const searchJson = await searchRes.json()
if (!searchJson?.status || !searchJson.data?.length) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se encontraron resultados para "${args}".`)
}
const randomResult = searchJson.data[Math.floor(Math.random() * searchJson.data.length)]
spotifyUrl = randomResult.url
title = randomResult.title
artist = randomResult.artist
image = randomResult.image
duration = randomResult.duration
album = randomResult.album
publish = randomResult.publish
source = randomResult.url
}
const res2 = await fetch(`https://api-nv.ultraplus.click/api/download/spotify?url=${encodeURIComponent(spotifyUrl)}&key=${nvkey}`)
const json2 = await res2.json()
if (!json2?.status || !json2.result?.url_download) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se pudo obtener la canción.`)
}
const { url_download } = json2.result
const head = `𓊈 ${getBotName(mePn)} 𝐏𝐋𝐀𝐘 𓊉`
const resultBox = [
'╭─〔  R E S U L T  〕─╮',
`│ ∘ Título    : ${title}`,
`│ ∘ Artista   : ${artist}`,
`│ ∘ Álbum     : ${album}`,
`│ ∘ Duración  : ${duration}`,
`│ ∘ Publicado : ${publish}`,
`│ ∘ Link      : ${source}`,
'╰──────────────────╯'
].join('\n')
const caption = `${head}\n\n${resultBox}\n\n📥 Opciones de Descarga:\n1️⃣ Audio MP3 (Audio)\n2️⃣ Audio MP3 (Documento)\n\n> by ${getBotName(mePn)} ${getBotEmoji(mePn)}`
const preview = await conn.sendMessage(m.chat, { image: { url: image }, caption }, { quoted: m })
global._pendingJobs[preview.key.id] = {
data: { chatId: m.chat, title, artist, url_download },
handler: async (connH, mH, txtH, dataH) => {
const opt = txtH.trim().toLowerCase()
await mH.react('⏳')
try {
if (opt === '1' || opt === 'audio' || opt === 'play') {
await connH.sendMessage(dataH.chatId, {
audio: { url: dataH.url_download },
mimetype: 'audio/mpeg',
fileName: `${dataH.title} - ${dataH.artist}.mp3`,
ptt: false
}, { quoted: mH })
await mH.react('✅')
return
}
if (opt === '2' || opt === 'document' || opt === 'doc') {
await connH.sendMessage(dataH.chatId, {
document: { url: dataH.url_download },
mimetype: 'audio/mpeg',
fileName: `${dataH.title} - ${dataH.artist}.mp3`
}, { quoted: mH })
await mH.react('✅')
return
}
await mH.react('❌')
} catch { await mH.react('❌') }
}
}
await m.react('✅')
} catch {
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al obtener la canción.`)
}
break
}
case 'gdrive':
case 'gd': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un enlace de Google Drive válido`)
if (!args.includes('drive.google.com')) return m.reply(`${getBotEmoji(mePn)} El enlace proporcionado no es válido.`)
await m.react('⏳')

try {
const apiUrl = `https://api.nekolabs.web.id/downloader/google-drive?url=${encodeURIComponent(args)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al obtener los archivos de Google Drive.`)
}

const result = data.result

if (result.type === 'folder') {
const folder = result.details
const files = result.contents

if (!files || files.length === 0) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} La carpeta está vacía.`)
}

const caption = `⧉  *G O O G L E - D R I V E - D O W N L O A D E R*

◦  *Carpeta* : ${folder.name || '-'}
◦  *Archivos* : ${folder.totalFiles || files.length}
◦  *Propietario* : ${folder.owner?.name || '-'}
◦  *Estado* : Comprimiendo archivos

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await m.reply(caption)

const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const tempDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tempDir)) {
fs.mkdirSync(tempDir, { recursive: true })
}

const zipPath = path.join(tempDir, `${folder.name || 'drive_folder'}.zip`)
const output = fs.createWriteStream(zipPath)
const archive = archiver('zip', { zlib: { level: 9 } })

await new Promise((resolve, reject) => {
output.on('close', resolve)
output.on('error', reject)
archive.pipe(output)

let downloadedCount = 0
const totalFiles = Math.min(files.length, 10)

files.slice(0, 10).forEach(async (file, index) => {
try {
const fileResponse = await fetch(file.downloadUrl)
const fileBuffer = await fileResponse.buffer()
archive.append(fileBuffer, { name: file.name })

downloadedCount++
if (downloadedCount === totalFiles) {
archive.finalize()
}
} catch (error) {
console.error(`Error downloading ${file.name}:`, error)
downloadedCount++
if (downloadedCount === totalFiles) {
archive.finalize()
}
}
})
})

const zipBuffer = fs.readFileSync(zipPath)

const finalCaption = `⧉  *G O O G L E - D R I V E - D O W N L O A D E R*

◦  *Carpeta* : ${folder.name || '-'}
◦  *Archivos* : ${Math.min(files.length, 10)}/${files.length} (máx. 10)
◦  *Propietario* : ${folder.owner?.name || '-'}
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
document: zipBuffer,
mimetype: 'application/zip',
fileName: `${folder.name || 'drive_folder'}.zip`,
caption: finalCaption
}, { quoted: m })

try {
fs.unlinkSync(zipPath)
} catch {}

} else {
const file = result.details
const fileResponse = await fetch(file.downloadUrl)
const fileBuffer = await fileResponse.buffer()

const caption = `⧉  *G O O G L E - D R I V E - D O W N L O A D E R*

◦  *Archivo* : ${file.name || '-'}
◦  *Tamaño* : ${file.size || '-'}
◦  *Tipo* : ${file.mimeType || '-'}
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

const mimeType = file.mimeType || 'application/octet-stream'
const fileName = file.name || 'drive_file'

if (mimeType.includes('video')) {
await conn.sendMessage(chat, { 
video: fileBuffer,
mimetype: 'video/mp4',
fileName: fileName,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('audio')) {
await conn.sendMessage(chat, { 
audio: fileBuffer,
mimetype: 'audio/mpeg',
fileName: fileName,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('image')) {
await conn.sendMessage(chat, { 
image: fileBuffer,
fileName: fileName,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('android') || fileName.toLowerCase().endsWith('.apk')) {
await conn.sendMessage(chat, { 
document: fileBuffer,
mimetype: 'application/vnd.android.package-archive',
fileName: fileName,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('pdf')) {
await conn.sendMessage(chat, { 
document: fileBuffer,
mimetype: 'application/pdf',
fileName: fileName,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('zip') || mimeType.includes('rar')) {
await conn.sendMessage(chat, { 
document: fileBuffer,
mimetype: 'application/zip',
fileName: fileName,
caption: caption
}, { quoted: m })
} else {
await conn.sendMessage(chat, { 
document: fileBuffer,
fileName: fileName,
caption: caption
}, { quoted: m })
}
}

await m.react('✅')

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al descargar los archivos.`)
}
break
}
case 'mega': {
    if (!args) return m.reply('Ingresa un enlace de Mega.nz');

    await m.react('⏳');

    try {
        const { File } = require('megajs');

        const megaUrl = args.trim();
        const file = File.fromURL(megaUrl);

        await file.loadAttributes();

        const buffer = await file.downloadBuffer();
        const name = file.name || 'archivo_mega';
        const size = file.size || 0;

        function fmtSize(bytes) {
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            if (!bytes) return '0 B';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
        }

        const ext = (name.split('.').pop() || '').toLowerCase();

        const caption = `⧉  *M E G A - D O W N L O A D E R*

◦  *Archivo* : ${name}
◦  *Tamaño* : ${fmtSize(size)}
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`;

        let mimetype = 'application/octet-stream';
        if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
            mimetype = 'video/mp4';
        } else if (['mp3', 'm4a', 'flac', 'wav', 'ogg', 'opus'].includes(ext)) {
            mimetype = 'audio/mpeg';
        } else if (ext === 'apk') {
            mimetype = 'application/vnd.android.package-archive';
        } else if (ext === 'pdf') {
            mimetype = 'application/pdf';
        } else if (['zip', 'rar', '7z'].includes(ext)) {
            mimetype = 'application/zip';
        }

        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            await conn.sendMessage(chat, {
                image: buffer,
                fileName: name,
                caption: caption
            }, { quoted: m });
        } else {
            await conn.sendMessage(chat, {
                document: buffer,
                mimetype: mimetype,
                fileName: name,
                caption: caption
            }, { quoted: m });
        }

        await m.react('✅');
    } catch (e) {
        await m.react('❌');
        m.reply('Error al procesar enlace Mega: ' + e.message);
    }
}
break;
case 'mediafire':
case 'mf': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un enlace de MediaFire válido`)
if (!args.includes('mediafire.com')) return m.reply(`${getBotEmoji(mePn)} El enlace proporcionado no es válido.`)
await m.react('⏳')

try {
const apiUrl = `https://api.nekolabs.web.id/downloader/mediafire?url=${encodeURIComponent(args)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al obtener el archivo de MediaFire.`)
}

const result = data.result
const downloadUrl = result.download_url
const filename = result.filename || 'mediafire_file'

const fileResponse = await fetch(downloadUrl)
const fileBuffer = await fileResponse.buffer()

const caption = `⧉  *M E D I A F I R E - D O W N L O A D E R*

◦  *Archivo* : ${result.filename || '-'}
◦  *Tamaño* : ${result.filesize || '-'}
◦  *Tipo* : ${result.mimetype || '-'}
◦  *Subido* : ${result.uploaded || '-'}
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

const mimeType = result.mimetype || 'application/octet-stream'

if (mimeType.includes('video')) {
await conn.sendMessage(chat, { 
video: fileBuffer,
mimetype: 'video/mp4',
fileName: filename,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('audio')) {
await conn.sendMessage(chat, { 
audio: fileBuffer,
mimetype: 'audio/mpeg',
fileName: filename,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('image')) {
await conn.sendMessage(chat, { 
image: fileBuffer,
fileName: filename,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('pdf')) {
await conn.sendMessage(chat, { 
document: fileBuffer,
mimetype: 'application/pdf',
fileName: filename,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('zip') || mimeType.includes('rar')) {
await conn.sendMessage(chat, { 
document: fileBuffer,
mimetype: 'application/zip',
fileName: filename,
caption: caption
}, { quoted: m })
} else if (mimeType.includes('android')) {
await conn.sendMessage(chat, { 
document: fileBuffer,
mimetype: 'application/vnd.android.package-archive',
fileName: filename,
caption: caption
}, { quoted: m })
} else {
await conn.sendMessage(chat, { 
document: fileBuffer,
fileName: filename,
caption: caption
}, { quoted: m })
}

await m.react('✅')

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al descargar el archivo.`)
}
break
}
case 'pinterestvideo':
case 'pindl':
case 'pinvideodl': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Provide a valid Pinterest link`)
if (!args.includes('pin.it/') && !args.includes('pinterest.com/')) return m.reply(`${getBotEmoji(mePn)} The provided link is not a valid Pinterest URL`)

await m.react('⏳')
try {
const encodedUrl = encodeURIComponent(args)
let data, videoUrl, videoInfo

try {
const apiUrlV2 = `https://api-nv.ultraplus.click/api/video/dl/pinterestv2?url=${encodedUrl}&key=${nvkey}`
const responseV2 = await fetch(apiUrlV2)
data = await responseV2.json()

if (data?.status && data.result?.video?.formats?.mp4) {
const { video, info, user, stats, tags } = data.result
videoUrl = video.formats.mp4
const tagsText = tags && tags.length > 0 ? tags.slice(0, 5).join(', ') : 'No tags'

videoInfo = [
'╭─〔  𝐕𝐈𝐃𝐄𝐎 𝐈𝐍𝐅𝐎 〕─╮',
`│ ∘ Título  : ${info.title || 'Sin título'}`,
`│ ∘ Usuario : ${user.fullName || user.username}`,
`│ ∘ Seguidores : ${user.followers}`,
`│ ∘ Guardado : ${stats.saves} veces`,
`│ ∘ Duración : ${video.duration || 'N/A'}`,
`│ ∘ Resolución : ${video.size.width}x${video.size.height}`,
`│ ∘ Tags : ${tagsText}`,
'╰──────────────────────╯'
].join('\n')
} else {
throw new Error('API v2 failed')
}
} catch (v2Error) {
const apiUrlV1 = `https://api-nv.ultraplus.click/api/video/dl/pinterest?url=${encodedUrl}&key=${nvkey}`
const responseV1 = await fetch(apiUrlV1)
data = await responseV1.json()

if (!data?.status || !data.result?.video_url) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Could not get Pinterest video`)
}

videoUrl = data.result.video_url
videoInfo = [
'╭─〔  𝐕𝐈𝐃𝐄𝐎 𝐈𝐍𝐅𝐎 〕─╮',
`│ ∘ Fuente : Pinterest`,
`│ ∘ Original : ${data.result.original_url}`,
`│ ∘ Fecha : ${new Date(data.result.timestamp).toLocaleString()}`,
'╰──────────────────────╯'
].join('\n')
}

const head = `𓊈 ${getBotName(mePn)} 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 𝐕𝐈𝐃𝐄𝐎 𓊉`
const caption = [
`${head}`,
videoInfo,
`> ${getBotName(mePn)} ${getBotEmoji(mePn)}`
].join('\n')

await conn.sendMessage(m.chat, { 
video: { url: videoUrl }, 
caption: caption,
mimetype: 'video/mp4'
}, { quoted: m })

await m.react('✅')

} catch (error) {
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error downloading Pinterest video`)
}
break
}
case 'pin':
case 'pinterest': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un término de búsqueda.`)
await m.react('⏳')
try {
const { data } = await axios.get(`https://api-nv.ultraplus.click/api/pinterest/search?q=${encodeURIComponent(args)}&limit=15&key=${nvkey}`)

if (!data.status || !data.response || !data.response.pins || !data.response.pins.length) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se encontraron resultados.`)
}

const validResults = data.response.pins
.filter(pin => pin.media && pin.media.images && pin.media.images.orig && pin.media.images.orig.url)
.map(pin => pin.media.images.orig.url)

if (!validResults.length) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se encontraron imágenes válidas.`)
}

const head = `𓊈 ${getBotName(mePn)} 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 𝐒𝐄𝐀𝐑𝐂𝐇 𓊉`
const caption = [
`${head}`,
'╭─〔  R E S U L T A D O S  〕─╮',
`│ ∘ Búsqueda : ${args}`,
`│ ∘ Cantidad : ${validResults.length}`,
'╰──────────────────────╯',
'> Selección automática de los primeros 10 resultados.'
].join('\n')

const images = validResults.slice(0, 10)
const medias = images.map((url, i) => ({
type: 'image',
data: { url: url },
caption: [
`╭─〔  I M A G E N  ${i + 1} 〕─╮`,
`│ ∘ Fuente   : Pinterest`,
`│ ∘ Búsqueda : ${args}`,
`│ ∘ Enlace   : ${url}`,
'╰──────────────────────╯',
`> ${getBotName(mePn)} ${getBotEmoji(mePn)}`
].join('\n')
}))

await conn.sendAlbumMessage(m.chat, medias, { quoted: m, caption })
await m.react('✅')
} catch (e) {
console.error(e)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error: ${e.message}`)
}
break
}
case 'yts':
case 'ytsearch':
case 'yt': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa el término de búsqueda.`)
await m.react('⏳')
try {
const res = await fetch(`https://api-nv.ultraplus.click/api/youtube/search?q=${encodeURIComponent(args)}&key=${nvkey}`)
const dataApi = await res.json()

if (!dataApi?.status || !Array.isArray(dataApi.Result) || !dataApi.Result.length) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se encontraron resultados.`)
}

const videos = dataApi.Result.slice(0, 5)
const head = `𓊈 ${getBotName(mePn)} 𝐘𝐎𝐔𝐓𝐔𝐁𝐄 𝐒𝐄𝐀𝐑𝐂𝐇 𓊉`

let resultText = `${head}\n`
resultText += '╭──────────────────────╮\n'
resultText += `│  Resultados para: ${args}\n`
resultText += '╰──────────────────────╯\n\n'

videos.forEach((video, i) => {
const titulo = video.titulo || '-'
const canal = video.canal || '-'
const vistas = video.vistas || '-'
const duracion = video.duracion || '-'
const fecha = video.fecha || '-'
const url = video.url || '-'

resultText += `⧉  *R E S U L T A D O - ${i + 1}*\n\n`
resultText += `◦  *Título* : ${titulo}\n`
resultText += `◦  *Canal* : ${canal}\n`
resultText += `◦  *Vistas* : ${vistas}\n`
resultText += `◦  *Duración* : ${duracion}\n`
resultText += `◦  *Publicado* : ${fecha}\n`
resultText += `◦  *Link* : ${url}\n\n`
})

resultText += `📥 *D E S C A R G A S*\n\n`
resultText += `Responde a *este mensaje* con uno de estos formatos:\n`
resultText += `∘ audio <número>\n`
resultText += `∘ audiodoc <número>\n`
resultText += `∘ video <número>\n`
resultText += `∘ videodoc <número>\n\n`
resultText += `Ejemplo: audio 1\n\n`
resultText += `> ${getBotName(mePn)} ${getBotEmoji(mePn)}`

const firstThumbnail = videos[0]?.miniatura || getBotMenuPhoto(mePn, m.sender) || FotosMenu.default
const firstTitle = videos[0]?.titulo || `${getBotName(mePn)} ${getBotEmoji(mePn)}`

const sentMsg = await conn.sendMessage(m.chat, {
text: resultText,
linkPreview: true,
contextInfo: {
mentionedJid: [],
forwardingScore: 0,
isForwarded: false,
remoteJid: null,
externalAdReply: {
title: firstTitle,
body: null,
mediaType: 1,
previewType: 0,
showAdAttribution: false,
renderLargerThumbnail: false,
thumbnailUrl: firstThumbnail
}
}
}, { quoted: m })

global._pendingJobs[sentMsg.key.id] = {
handler: async (connH, mH, txtH, dataH) => {
const txt = (txtH || '').toLowerCase().trim()
if (!txt) return mH.reply('Usa: audio|audiodoc|video|videodoc <número>. Ej: audio 1')

const parts = txt.split(/\s+/).filter(Boolean)
let type = null
let num = null

for (const p of parts) {
if (!type && ['audio', 'audiodoc', 'video', 'videodoc'].includes(p)) {
type = p
continue
}
if (!num && !isNaN(p)) {
num = parseInt(p)
}
}

if (!type && num !== null) {
type = 'audio'
}

if (!type || num === null || isNaN(num)) {
return mH.reply('Formato inválido. Usa: audio|audiodoc|video|videodoc <número>. Ej: video 2')
}

const list = dataH.videos || []

if (num < 1 || num > list.length) {
return mH.reply('Opción inválida, elige un número de la lista.')
}

const selected = list[num - 1]
const url = selected && selected.url
if (!url) return mH.reply('No pude obtener la URL del video.')

await mH.react('⏳')

try {
if (type === 'audio') {
await ytDownloadAudio(connH, mH, url, false)
} else if (type === 'audiodoc') {
await ytDownloadAudio(connH, mH, url, true)
} else if (type === 'video') {
await ytDownloadVideo(connH, mH, url, false)
} else if (type === 'videodoc') {
await ytDownloadVideo(connH, mH, url, true)
} else {
return mH.reply('Tipo inválido. Usa audio, audiodoc, video o videodoc.')
}
await mH.react('✅')
} catch (err) {
console.error(err)
await mH.react('❌')
await mH.reply('❌ Error al procesar tu descarga.')
}
},
data: { videos }
}

await m.react('✅')
} catch (error) {
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al buscar en YouTube.`)
}
}
break
case 'tiktoksearch': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un término de búsqueda.`)
await m.react('⏳')
try {
const res = await fetch(`https://delirius-apiofc.vercel.app/search/tiktoksearch?query=${encodeURIComponent(args)}`)
if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
const data = await res.json()
if (!data.meta || !data.meta.length) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se encontraron resultados.`)
}

const head = `𓊈 ${getBotName(mePn)} 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐄𝐀𝐑𝐂𝐇 𓊉`
const caption = [
`${head}`,
'╭─〔  R E S U L T A D O S  〕─╮',
`│ ∘ Búsqueda : ${args}`,
`│ ∘ Cantidad : ${data.meta.length}`,
'╰──────────────────────╯',
'> Selección automática de los primeros 5 resultados.'
].join('\n')

const videos = data.meta.slice(0, 5)
const medias = videos.map((v, i) => ({
type: 'video',
data: { url: v.hd },
caption: [
`╭─〔  V I D E O  ${i + 1} 〕─╮`,
`│ ∘ Autor     : ${v.author.nickname || v.author.username}`,
`│ ∘ Región    : ${v.region}`,
`│ ∘ Duración  : ${v.duration}s`,
`│ ∘ Likes     : ${v.like}`,
`│ ∘ Comentarios: ${v.coment}`,
`│ ∘ Compartido: ${v.share}`,
`│ ∘ Reproducc.: ${v.play}`,
`│ ∘ Música    : ${v.music.title}`,
`│ ∘ Enlace    : ${v.url}`,
'╰──────────────────────╯',
`> ${getBotName(mePn)} ${getBotEmoji(mePn)}`
].join('\n')
}))

await conn.sendAlbumMessage(m.chat, medias, { quoted: m, caption })
await m.react('✅')
} catch (e) {
console.error(e)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error: ${e.message}`)
}
break
}
case 'facebook':
case 'fb': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un enlace de Facebook válido`)
if (!args.includes('facebook.com') && !args.includes('fb.watch')) return m.reply(`${getBotEmoji(mePn)} El enlace proporcionado no es válido.`)
await m.react('⏳')
const apiUrl = `https://eliasar-yt-api.vercel.app/api/facebookdl?link=${encodeURIComponent(args)}`
try {
const r = await fetch(apiUrl)
const json = await r.json()
if (!json?.status || !Array.isArray(json.data) || !json.data.length) { await m.react('❌'); return m.reply(`${getBotEmoji(mePn)} No se pudo obtener el video.`) }
const pick = json.data.find(v => /hd|1080|720/i.test(String(v.quality))) || json.data[0]
await conn.sendMessage(chat, { video: { url: pick.url }, mimetype: 'video/mp4', caption: `${getBotEmoji(mePn)} Video descargado` }, { quoted: m })
await m.react('✅')
} catch { await m.react('❌'); m.reply(`${getBotEmoji(mePn)} Error al obtener el video.`) }
break
}

case 'tiktok':
case 'tt': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un enlace de TikTok válido`)
if (!args.includes('tiktok.com')) return m.reply(`${getBotEmoji(mePn)} El enlace proporcionado no es válido.`)
await m.react('⏳')

try {
const apiUrl = `https://api.ootaizumi.web.id/downloader/tiktok?url=${encodeURIComponent(args)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.status || !data.result) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al obtener el video de TikTok.`)
}

const result = data.result

let videoUrl = result.hdplay || result.play || result.wmplay

if (!videoUrl) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se pudo obtener el video.`)
}

let processedThumbnail = null
if (result.cover) {
try {
const thumbResponse = await fetch(result.cover)
const buffer = await thumbResponse.arrayBuffer()
const image = await require('jimp').read(Buffer.from(buffer))
image.resize(250, 250)
processedThumbnail = await image.getBufferAsync(require('jimp').MIME_JPEG)
} catch {
processedThumbnail = null
}
}

const videoCaption = `⧉  *T I K T O K - D O W N L O A D E R*

◦  *Título* : ${result.title || '-'}
◦  *Creador* : ${result.author?.nickname || result.author_name || '-'}
◦  *Duración* : ${result.duration ? `${result.duration}s` : '-'}
◦  *Me gusta* : ${result.digg_count ? result.digg_count.toLocaleString() : '-'}
◦  *Comentarios* : ${result.comment_count ? result.comment_count.toLocaleString() : '-'}
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
video: { url: videoUrl }, 
mimetype: 'video/mp4', 
caption: videoCaption,
jpegThumbnail: processedThumbnail
}, { quoted: m })

if (result.music) {
const audioCaption = `⧉  *T I K T O K - A U D I O*

◦  *Título* : ${result.music_info?.title || result.title || '-'}
◦  *Artista* : ${result.music_info?.author || result.author?.nickname || '-'}
◦  *Duración* : ${result.music_info?.duration ? `${result.music_info.duration}s` : '-'}
◦  *Estado* : Audio extraído

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
document: { url: result.music }, 
mimetype: 'audio/mpeg',
fileName: `audio_tiktok_${result.author?.nickname || 'unknown'}.mp3`,
jpegThumbnail: processedThumbnail,
caption: audioCaption
}, { quoted: m })
}

await m.react('✅')
} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al obtener el video.`)
}
break
}

case 'instagram':
case 'ig': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un enlace de Instagram válido`)
if (!args.includes('instagram.com')) return m.reply(`${getBotEmoji(mePn)} El enlace proporcionado no es válido.`)
await m.react('⏳')

try {
const apiUrl = `https://api.nekolabs.web.id/downloader/instagram?url=${encodeURIComponent(args)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result || !data.result.downloadUrl || data.result.downloadUrl.length === 0) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al obtener el contenido de Instagram.`)
}

const metadata = data.result.metadata
const downloadUrl = data.result.downloadUrl[0]

let processedThumbnail = null

if (metadata.isVideo) {
try {
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const tempDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tempDir)) {
fs.mkdirSync(tempDir, { recursive: true })
}

const tempVideo = path.join(tempDir, 'ig_temp_video.mp4')
const tempThumb = path.join(tempDir, 'ig_thumb.jpg')

const videoResponse = await fetch(downloadUrl)
const videoBuffer = await videoResponse.arrayBuffer()
fs.writeFileSync(tempVideo, Buffer.from(videoBuffer))

await new Promise((resolve, reject) => {
const ffmpeg = spawn('ffmpeg', [
'-i', tempVideo,
'-ss', '00:00:04',
'-vframes', '1',
'-vf', 'scale=250:250',
'-q:v', '2',
tempThumb
])

ffmpeg.on('close', (code) => {
if (code === 0 && fs.existsSync(tempThumb)) {
const thumbBuffer = fs.readFileSync(tempThumb)
processedThumbnail = thumbBuffer

try {
fs.unlinkSync(tempVideo)
fs.unlinkSync(tempThumb)
} catch {}

resolve()
} else {
reject(new Error('FFmpeg failed'))
}
})

ffmpeg.on('error', reject)
})
} catch {
processedThumbnail = null
}
}

const caption = `⧉  *I N S T A G R A M - D O W N L O A D E R*

◦  *Usuario* : ${metadata.username || '-'}
◦  *Me gusta* : ${metadata.like ? metadata.like.toLocaleString() : '-'}
◦  *Comentarios* : ${metadata.comment ? metadata.comment.toLocaleString() : '-'}
◦  *Tipo* : ${metadata.isVideo ? 'Video' : 'Imagen'}
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

if (metadata.isVideo) {
await conn.sendMessage(chat, { 
video: { url: downloadUrl }, 
mimetype: 'video/mp4', 
caption: caption,
jpegThumbnail: processedThumbnail
}, { quoted: m })
} else {
await conn.sendMessage(chat, { 
image: { url: downloadUrl }, 
caption: caption,
jpegThumbnail: processedThumbnail
}, { quoted: m })
}

await m.react('✅')
} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al obtener el contenido.`)
}
break
}
case 'twitter':
case 'x': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un enlace de Twitter/X válido`)
if (!args.includes('x.com') && !args.includes('twitter.com')) return m.reply(`${getBotEmoji(mePn)} El enlace proporcionado no es válido.`)
await m.react('⏳')

try {
const apiUrl = `https://api.ootaizumi.web.id/downloader/twitter?url=${encodeURIComponent(args)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.status || !data.result || data.result.length === 0) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al obtener el contenido de Twitter/X.`)
}

const results = data.result
const videoResult = results.find(item => item.type === 'video' && item.resolution !== 'unknown' && item.link && item.link !== '#')

if (!videoResult) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se pudo obtener el video del tweet.`)
}

const videoUrl = videoResult.link
const videoResponse = await fetch(videoUrl)
const videoBuffer = await videoResponse.buffer()

let processedThumbnail = null
const thumbnailResult = results.find(item => item.type === 'video' && item.resolution === 'unknown' && item.link && item.link.includes('.jpg'))

if (thumbnailResult) {
try {
const thumbResponse = await fetch(thumbnailResult.link)
const thumbBuffer = await thumbResponse.arrayBuffer()
const image = await require('jimp').read(Buffer.from(thumbBuffer))
image.resize(250, 250)
processedThumbnail = await image.getBufferAsync(require('jimp').MIME_JPEG)
} catch {
processedThumbnail = null
}
}

const caption = `⧉  *T W I T T E R - D O W N L O A D E R*

◦  *Plataforma* : Twitter/X
◦  *Calidad* : ${videoResult.resolution || '-'}
◦  *Tipo* : Video
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
video: videoBuffer, 
mimetype: 'video/mp4', 
caption: caption,
jpegThumbnail: processedThumbnail
}, { quoted: m })

await m.react('✅')

} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al obtener el video.`)
}
break
}
case 'capcut':
case 'cc': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa un enlace de CapCut válido`)
if (!args.includes('capcut.com')) return m.reply(`${getBotEmoji(mePn)} El enlace proporcionado no es válido.`)
await m.react('⏳')

try {
const apiUrl = `https://api.nekolabs.web.id/downloader/capcut?url=${encodeURIComponent(args)}`
const response = await fetch(apiUrl)
const data = await response.json()

if (!data.success || !data.result || !data.result.videoUrl) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Error al obtener el video de CapCut.`)
}

const result = data.result
const videoUrl = result.videoUrl

let processedThumbnail = null

try {
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const tempDir = path.join(__dirname, 'tmp')
if (!fs.existsSync(tempDir)) {
fs.mkdirSync(tempDir, { recursive: true })
}

const tempVideo = path.join(tempDir, 'cc_temp_video.mp4')
const tempThumb = path.join(tempDir, 'cc_thumb.jpg')

const videoResponse = await fetch(videoUrl)
const videoBuffer = await videoResponse.arrayBuffer()
fs.writeFileSync(tempVideo, Buffer.from(videoBuffer))

await new Promise((resolve, reject) => {
const ffmpeg = spawn('ffmpeg', [
'-i', tempVideo,
'-ss', '00:00:04',
'-vframes', '1',
'-vf', 'scale=250:250',
'-q:v', '2',
tempThumb
])

ffmpeg.on('close', (code) => {
if (code === 0 && fs.existsSync(tempThumb)) {
const thumbBuffer = fs.readFileSync(tempThumb)
processedThumbnail = thumbBuffer

try {
fs.unlinkSync(tempVideo)
fs.unlinkSync(tempThumb)
} catch {}

resolve()
} else {
reject(new Error('FFmpeg failed'))
}
})

ffmpeg.on('error', reject)
})
} catch {
processedThumbnail = null
}

const caption = `⧉  *C A P C U T - D O W N L O A D E R*

◦  *Título* : ${result.title || '-'}
◦  *Creador* : ${result.author?.name || '-'}
◦  *Plataforma* : CapCut
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`

await conn.sendMessage(chat, { 
video: { url: videoUrl }, 
mimetype: 'video/mp4', 
caption: caption,
jpegThumbnail: processedThumbnail
}, { quoted: m })

await m.react('✅')
} catch (error) {
console.error(error)
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al obtener el video.`)
}
break
}
case 'anime': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa el nombre de un anime para buscar.`)

await m.react('⏳')

try {
const query = encodeURIComponent(args.trim())
const apiUrl = `https://neveloopp-api.vercel.app/api/animedl?query=${query}`

const response = await fetch(apiUrl)
const data = await response.json()

if (!data.results?.status || !data.results.title) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se encontró información para el anime "${args}".`)
}

const anime = data.results

let processedThumbnail
try {
const thumbResponse = await fetch(anime.image)
const buffer = await thumbResponse.arrayBuffer()
const image = await require('jimp').read(Buffer.from(buffer))
image.resize(250, 250)
processedThumbnail = await image.getBufferAsync(require('jimp').MIME_JPEG)
} catch {
processedThumbnail = null
}

const infoText = `⧉  *I N F O R M A C I Ó N - A N I M E*

◦  *Título* : ${anime.title}
◦  *Tipo* : ${anime.type}
◦  *Episodios* : ${anime.episodios}
◦  *Estado* : Información obtenida

📖 ${anime.description || 'No hay descripción disponible.'}`

await conn.sendMessage(m.chat, {
image: { url: anime.image },
caption: infoText
}, { quoted: m })

if (anime.episodes && anime.episodes.length > 0) {
const availableEpisodes = anime.episodes
.filter(ep => ep.pixeldrain !== null)
.sort((a, b) => a.episode - b.episode)

if (availableEpisodes.length > 0) {
await m.reply(`${getBotEmoji(mePn)} Enviando ${availableEpisodes.length} episodios en orden...`)

for (const episode of availableEpisodes) {
try {
const pixeldrainId = episode.pixeldrain.split('/').pop()
const downloadUrl = `https://cdn-pixeldrain-nv.vercel.app/api/cdn/pixeldrain?url=https://pixeldrain.com/u/${pixeldrainId}&download=true`

const episodeCaption = `⧉  *D E S C A R G A - A N I M E*

◦  *Anime* : ${anime.title}
◦  *Episodio* : ${episode.episode}
◦  *Idioma* : ${episode.idioma}
◦  *Formato* : Video MP4
◦  *Estado* : Descarga disponible`

await conn.sendMessage(m.chat, {
document: { url: downloadUrl },
mimetype: 'video/mp4',
fileName: `${anime.title} - Episodio ${episode.episode}.mp4`,
jpegThumbnail: processedThumbnail,
caption: episodeCaption
}, { quoted: m })

await sleep(1000)
} catch (epError) {
console.error(`Error enviando episodio ${episode.episode}:`, epError)
}
}

await m.reply(`⧉  *D E S C A R G A - C O M P L E T A D A*

◦  *Anime* : ${anime.title}
◦  *Episodios* : ${availableEpisodes.length}
◦  *Estado* : Descarga completada

> Desarrollado por ${getBotName(mePn)} - En constante evolución`)
} else {
await m.reply(`${getBotEmoji(mePn)} ❌ No hay episodios disponibles para descargar de "${anime.title}"`)
}
} else {
await m.reply(`${getBotEmoji(mePn)} ❌ No se encontraron episodios para "${anime.title}"`)
}

await m.react('✅')

} catch (error) {
await m.react('❌')
console.error('Error en comando anime:', error)
await m.reply(`${getBotEmoji(mePn)} Error al buscar el anime: ${error.message}`)
}
break
}
case 'reactall': {
if (!isCreator) return m.reply('🚫 Solo el owner puede usar este comando.')

const parts = args.split(' ')
const postLink = parts[0]
const reacts = parts.slice(1).join(' ')

if (!postLink || !reacts) {
return m.reply(`${getBotEmoji(mePn)} Uso: ${getPrefix()[0]}reactall <link_post> <emoji1,emoji2,emoji3,emoji4>`)
}

if (!postLink.includes('whatsapp.com/channel/')) {
return m.reply(`${getBotEmoji(mePn)} El link debe ser de una publicación de canal de WhatsApp.`)
}

await m.react('🔄')

try {
const urlParts = postLink.split('/')
const messageId = urlParts[urlParts.length - 1]
const inviteCode = urlParts[urlParts.length - 2]

const channelInfo = await conn.newsletterMetadata("invite", inviteCode)
const channelId = channelInfo.id

const emojiArray = reacts.split(',').map(e => e.trim()).filter(e => e)
if (emojiArray.length > 4) {
return m.reply(`${getBotEmoji(mePn)} Máximo 4 emojis permitidos.`)
}

const { executeSocketMethod } = require('./baileys')

const result = await executeSocketMethod('all', 'newsletterReactMessage', channelId, messageId, emojiArray[0])

if (!result.ok) {
return m.reply(`${getBotEmoji(mePn)} Error: ${result.message}`)
}

const successCount = result.details.success.length
const failCount = result.details.errors.length

let resultMsg = `${getBotEmoji(mePn)} *RESULTADO*\n\n`
resultMsg += `Post: ${postLink}\n`
resultMsg += `Emoji: ${emojiArray[0]}\n`
resultMsg += `Bots: ${successCount + failCount}\n`
resultMsg += `✅: ${successCount}\n`
resultMsg += `❌: ${failCount}`

if (failCount > 0) {
resultMsg += `\n\nErrores:\n`
result.details.errors.forEach((error, index) => {
resultMsg += `${index + 1}. ${error.id}: ${error.error}\n`
})
}

await m.reply(resultMsg)
await m.react('✅')

} catch (error) {
await m.react('❌')
await m.reply(`${getBotEmoji(mePn)} Error: ${error.message}`)
}
break;
}
case 'react':
case 'reaccionar':
case 'channelreact': {
if (!args) {
return m.reply(`${getBotEmoji(mePn)} Uso: ${getPrefix()[0]}react <link_post> <emoji1,emoji2,emoji3,emoji4>\n\nEjemplo: ${getPrefix()[0]}react https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31/473 😨,🤣,👾,😳`);
}

await m.react('⏳');

try {
const parts = args.split(' ');
const postLink = parts[0];
const reacts = parts.slice(1).join(' ');

if (!postLink || !reacts) {
return m.reply(`${getBotEmoji(mePn)} Formato incorrecto. Uso: ${getPrefix()[0]}react <link> <emoji1,emoji2,emoji3,emoji4>`);
}

if (!postLink.includes('whatsapp.com/channel/')) {
return m.reply(`${getBotEmoji(mePn)} El link debe ser de una publicación de canal de WhatsApp.`);
}

const emojiArray = reacts.split(',').map(e => e.trim()).filter(e => e);
if (emojiArray.length > 4) {
return m.reply(`${getBotEmoji(mePn)} Máximo 4 emojis permitidos.`);
}

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTVkMTZkMTc4MTFlNDNlNDhiODU3MiIsImlhdCI6MTc2MzAzNzU1MCwiZXhwIjoxNzYzNjQyMzUwfQ.YOK_4RoEVNi8OpXaMpJmND309TG2MJm_q0IE5gTGZD0';

const requestData = {
post_link: postLink,
reacts: emojiArray.join(',')
};

const response = await fetch('https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post', {
method: 'POST',
headers: {
'Accept': 'application/json, text/plain, */*',
'Content-Type': 'application/json',
'Authorization': `Bearer ${apiKey}`,
'User-Agent': 'Mozilla/5.0 (Android 13; Mobile; rv:146.0) Gecko/146.0 Firefox/146.0',
'Referer': 'https://asitha.top/channel-manager'
},
body: JSON.stringify(requestData)
});

const result = await response.json();

if (response.ok && result.message) {
await m.react('✅');
await m.reply(`${getBotEmoji(mePn)} ✅ Reacciones enviadas con éxito`);
} else {
await m.react('❌');
await m.reply(`${getBotEmoji(mePn)} Error al enviar las reacciones`);
}

} catch (error) {
await m.react('❌');
await m.reply(`${getBotEmoji(mePn)} Error al procesar la solicitud`);
}
break;
}
case 'check':
case 'run':
case 'runtime': {
const os = require('os')
const si = require('systeminformation')
const moment = require('moment-timezone')
const fetchLocal = require('node-fetch')
const processLocal = require('process')

async function getServerInfo() {
try {
const osInfo = await si.osInfo()
const mem = await si.mem()
const cpu = await si.cpu()
const disks = await si.fsSize()
const uptime = moment.duration(os.uptime(), 'seconds').humanize()
const cpuLoad = await si.currentLoad()

const pingStart = Date.now()
const locationData = await fetchLocal('http://ip-api.com/json')
const ping = Date.now() - pingStart

const location = await locationData.json()

const ramUsed = (mem.used / 1073741824).toFixed(2)
const ramTotal = (mem.total / 1073741824).toFixed(2)
const ramAvailable = (mem.available / 1073741824).toFixed(2)
const ramUsagePercent = ((mem.used / mem.total) * 100).toFixed(2)

const diskUsed = disks.reduce((a, b) => a + b.used, 0) / 1073741824
const diskTotal = disks.reduce((a, b) => a + b.size, 0) / 1073741824
const diskAvailable = disks.reduce((a, b) => a + b.available, 0) / 1073741824
const diskUsagePercent = ((diskUsed / diskTotal) * 100).toFixed(2)

const cpuUsagePercent = cpuLoad.currentLoad.toFixed(2)
const cpuCoresUsage = cpuLoad.cpus.map((core, i) => ` *◦ Core ${i + 1}* : ${core.load.toFixed(2)}%`).join('\n')

const ramStatus = ramUsagePercent > 90 ? '🔴 CRÍTICO' : 
ramUsagePercent > 80 ? '🟡 ALTO' : 
ramUsagePercent > 60 ? '🟠 MODERADO' : '🟢 NORMAL'

const diskStatus = diskUsagePercent > 90 ? '🔴 CRÍTICO' : 
diskUsagePercent > 85 ? '🟡 ALTO' : 
diskUsagePercent > 70 ? '🟠 MODERADO' : '🟢 NORMAL'

const cpuStatus = cpuUsagePercent > 90 ? '🔴 CRÍTICO' : 
cpuUsagePercent > 80 ? '🟡 ALTO' : 
cpuUsagePercent > 60 ? '🟠 MODERADO' : '🟢 NORMAL'

const message = `
╭  ${getBotEmoji(mePn)} \`\`\`Server Status - LIVE\`\`\` ${getBotEmoji(mePn)} ╮

📊 *ESTADO DEL SISTEMA*
*◦ Estado RAM* : ${ramStatus} (${ramUsagePercent}%)
*◦ Estado CPU* : ${cpuStatus} (${cpuUsagePercent}%)
*◦ Estado Disco* : ${diskStatus} (${diskUsagePercent}%)
*◦ Ping/Respuesta* : ${ping}ms

💾 *MEMORIA RAM*
*◦ Usada* : ${ramUsed} GB
*◦ Disponible* : ${ramAvailable} GB
*◦ Total* : ${ramTotal} GB
*◦ Uso* : ${ramUsagePercent}%

💿 *ALMACENAMIENTO*
*◦ Usado* : ${diskUsed.toFixed(2)} GB
*◦ Disponible* : ${diskAvailable.toFixed(2)} GB
*◦ Total* : ${diskTotal.toFixed(2)} GB
*◦ Uso* : ${diskUsagePercent}%

⚡ *PROCESADOR*
*◦ Uso Total* : ${cpuUsagePercent}%
*◦ Modelo* : ${cpu.manufacturer} ${cpu.brand}
*◦ Velocidad* : ${cpu.speed}GHz
*◦ Núcleos* : ${cpu.cores}

${cpuCoresUsage}

🌍 *INFORMACIÓN DEL SERVIDOR*
*◦ OS* : ${osInfo.distro} ${osInfo.release}
*◦ Path Actual* : ${processLocal.cwd()}
*◦ Ubicación* : ${location.city}, ${location.regionName}, ${location.country}
*◦ Timezone* : ${location.timezone}
*◦ Tiempo Activo* : ${uptime}
`

await conn.sendMessage(m.chat, { 
text: message, 
linkPreview: true, 
contextInfo: { 
mentionedJid: [], 
forwardingScore: 0, 
isForwarded: false, 
remoteJid: null, 
externalAdReply: { 
title: `${getBotName(m.key.participant)} ${getBotEmoji(mePn)}`, 
body: "Estado en tiempo real del servidor", 
mediaType: 1, 
previewType: 0, 
showAdAttribution: false, 
renderLargerThumbnail: true, 
thumbnailUrl: getBotMenuPhoto(mePn, m.key.participant) || getBotMenuPhoto(mePn, m.key.participant), 
sourceUrl: 'https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31' 
} 
} 
}, { quoted: m })

} catch { 
await conn.sendMessage(m.chat, { text: 'Error retrieving system information.' }, { quoted: m }) 
}
}
await getServerInfo()
break
}

case 'code':
case 'serbot': {
const messageText = `𓊈 Neveloopp-MD 𝐁𝐎𝐓 𝐂𝐑𝐄𝐀𝐓𝐈𝐎𝐍 𓊉

╭─〔  B E  A  B O T  〕─╮
│ ∘ Platform : Neveloopp-MD
│ ∘ Cost     : Completely Free
│ ∘ Access   : Open to Everyone
│ ∘ Status   : Available ✅

📦 *Want your own WhatsApp bot?*
🧠 *No coding required. Just follow the steps.*

🌐 *Create your bot here:*
🔗 https://neveloopp-bot-code.eliasaryt.pro/

╰─〔 Powered by Neveloopp-MD 〕─╯`;

await conn.sendMessage(m.chat, { text: messageText }, { quoted: m });
break;
}
case 'ping': {
try {
const start = Date.now()
const sent = await conn.sendMessage(chat, { text: '🏓 Pong...' }, { quoted: m })
const ping = Date.now() - start
const resultText = `🏓 Pong\n\n${getBotEmoji(mePn)} Ping: ${ping} ms`
if (isGroup) {
await sleep(100)
try {
await conn.relayMessage(chat, { protocolMessage: { key: sent.key, type: 14, editedMessage: proto.Message.fromObject({ conversation: resultText }) } }, { messageId: sent.key.id })
} catch { await conn.sendMessage(chat, { text: resultText }, { quoted: m }) }
} else {
await conn.sendMessage(chat, { text: resultText }, { quoted: m })
}
} catch { await conn.sendMessage(chat, { text: 'Error calculando el ping.' }, { quoted: m }) }
break
}
case 'bots':
case 'totalbots': {
const { total, bots } = getActiveBots()

function ocultar(id) {
const clean = String(id).replace(/[^0-9]/g, '')
if (clean.length < 5) return clean
return clean.slice(0, 3) + '×××××' + clean.slice(-3)
}

function formatUptime(ms) {
if (!ms) return '0m'
const segundos = Math.floor(ms / 1000)
const dias = Math.floor(segundos / 86400)
const horas = Math.floor((segundos % 86400) / 3600)
const minutos = Math.floor((segundos % 3600) / 60)

if (dias > 0) return `${dias}d ${horas}h`
if (horas > 0) return `${horas}h ${minutos}m`
return `${minutos}m`
}

const lista = bots.map(bot => `*⌗ ${ocultar(bot.id)}* - ${bot.name} (${formatUptime(bot.uptime)})`).join('\n')
const txt = `╭─〔 🤖 𝐁𝐎𝐓𝐒 𝐀𝐂𝐓𝐈𝐕𝐎𝐒 〕─╮
│ ∘ Total activos : ${total}
│
${lista ? lista.split('\n').map(l => '│ ' + l).join('\n') : '│ ∘ Ninguno activo'}
╰────────────────────╯`
await conn.sendMessage(m.chat, { text: txt.trim() }, { quoted: m })
break
}
case 'mm': {
const p = getPrefix()[0]
const { total } = getActiveBots()

const images = [
"https://cdn.skyultraplus.com/uploads/u9/2058cc9b8bcd798d.jpg",
"https://cdn.skyultraplus.com/uploads/u9/55549a66ffcd9e0e.jpg", 
"https://cdn.skyultraplus.com/uploads/u9/d2fb8ab99c792b11.jpg"
];
const randomImg = images[Math.floor(Math.random() * images.length)];

const botname = getBotName(mePn);
const textbot = `${getBotName(mePn)} OFC`;
const redes = "https://api-nv.ultraplus.click/";

const menuText = `𓊈 ${getBotName(mePn)} 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 𓊉

╭─〔  S T A T U S  〕─╮
│ ∘ Name     : ${getBotName(mePn)}
│ ∘ Platform : Node.js
│ ∘ Active Bots : ${total}
│ ∘ Owner Bot: .creator
│ ∘ antiprivado : ${cfg.antiprivado ? 'ON' : 'OFF'}
│ ∘ modobot     : ${cfg.modobot ? 'ON' : 'OFF'}
│ ∘ prigrupo    : ${cfg.prigrupo ? 'ON' : 'OFF'}

> © ${getBotName(mePn)}`

const thumbBuffer = await (await fetch(randomImg)).buffer();

const contextInfo = {
externalAdReply: {
title: botname,
body: textbot,
thumbnailUrl: redes,
thumbnail: thumbBuffer,
sourceUrl: redes,
mediaType: 1,
renderLargerThumbnail: true,
showAdAttribution: true,
mediaUrl: '',
sourceId: ''
}
}

const nativeFlowPayload = {
header: {
hasMediaAttachment: false,
title: '',
subtitle: ''
},
body: { 
text: `¡Hola ${m.pushName || 'usuario'}! 👋\n\nBienvenido a ${getBotName(mePn)}\nSelecciona una opción del menú para ver los comandos disponibles.` 
},
footer: { 
text: menuText 
},
buttons: [
{
name: 'single_select',
buttonParamsJson: JSON.stringify({
"title":"📋 Menú de Comandos",
"sections":[
{
"title":"⌏ Selecciona una categoría ⌎",
"highlight_label":"Comandos Disponibles",
"rows":[
{"title":"🛠️ SYSTEM COMMANDS","description":"Ping, check, help","id":"system_cmds"},
{"title":"📥 DOWNLOADERS","description":"YouTube, TikTok, Instagram, etc","id":"download_cmds"},
{"title":"👥 GROUP COMMANDS","description":"Gestión de grupos","id":"group_cmds"},
{"title":"🖼️ MEDIA & TOOLS","description":"Stickers, screenshots, etc","id":"media_cmds"},
{"title":"🔐 MODOS BOT","description":"Configuraciones del bot","id":"mode_cmds"},
{"title":"🧠 IA","description":"Comandos de inteligencia artificial","id":"ai_cmds"}
]
}
],
"has_multiple_buttons":true
})
},
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({"display_text":"📱 Canal Oficial","url":"https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31","merchant_url":"https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31"})
},
{
name: 'cta_url',
buttonParamsJson: JSON.stringify({"display_text":"🌐 Sitio Web","url":"https://bot-neveloopp.ultraplus.click","merchant_url":"https://bot-neveloopp.ultraplus.click"})
},
{
name: 'quick_reply',
buttonParamsJson: JSON.stringify({"display_text":"🎯 Comandos Rápidos","id":"quick_cmds"})
}
],
nativeFlowMessage: {
messageParamsJson: JSON.stringify({
"bottom_sheet":{
"in_thread_buttons_limit":3,
"divider_indices":[1,2,3,999],
"list_title":"Menú Principal",
"button_title":"▻ Ver Comandos 📘"
},
"tap_target_configuration":{
"title":"🚀 ${getBotName(mePn)}",
"description":"Bot multifuncional",
"canonical_url":"${redes}",
"domain":"${redes}",
"button_index":0
},
"limited_time_offer": {
"text": `${m.pushName || 'Usuario'}`,
"url": redes,
"copy_code": `${getBotName(mePn)}`,
"expiration_time": Date.now() + 3600000
}
})
},
contextInfo
}

try {
await conn.relayMessage(
m.chat,
{ 
viewOnceMessage: { 
message: { 
interactiveMessage: nativeFlowPayload 
} 
} 
},
{ quoted: m }
)
} catch (e) {
console.error('Error al enviar el menú interactivo:', e)
await conn.sendMessage(m.chat, { 
text: `❌ Error al cargar el menú interactivo.\n\n${menuText}` 
}, { quoted: m })
}
break;
}
case 'menu':
case 'help': {
try {
await m.react(getBotEmoji(mePn));

const p = getPrefix()[0]
const { total } = getActiveBots()

function countCommands() {
try {
const fs = require('fs');
const path = require('path');
const mainJsPath = path.join(__dirname, 'main.js');
const code = fs.readFileSync(mainJsPath, 'utf-8');
const caseGroups = code.match(/(case\s+['"`][^'"`]+['"`]:\s*)+/g) || [];
const excludedCases = ['menu', 'help', 'default', 'undefined', 'null'];
const commands = new Set();

caseGroups.forEach(group => {
const firstCaseMatch = group.match(/case\s+['"`]([^'"`]+)['"`]/);
if (firstCaseMatch) {
const commandName = firstCaseMatch[1];
if (!excludedCases.includes(commandName) && !commandName.startsWith('_')) {
commands.add(commandName);
}
}
});

return commands.size;
} catch (error) {
return 25;
}
}

const totalCommands = countCommands();
const botName = getBotName(mePn) || "Bot";
const prefix = p || ".";
const activeBots = total || 0;

const channelRD = {
id: "120363418194182743@newsletter",
name: `${botName} Official Channel`
};

const senderName = m.pushName || 'Usuario';
const senderJid = m.sender || '';

const antiprivado = cfg && cfg.antiprivado ? 'ON' : 'OFF';
const prigrupo = cfg && cfg.prigrupo ? 'ON' : 'OFF';

const menuConfig = getBotMenuConfig(mePn);
const currentConfig = Object.assign({}, DEFAULT_MENU_CONFIG, menuConfig);

const welcomeText = currentConfig.welcomeText
.replace(/@user/g, `@${senderName}`)
.replace(/\$\{senderName\}/g, senderName)
.replace(/\$\{botName\}/g, botName)
.replace(/\$bot/g, botName)
.replace(/\$\{prefix\}/g, prefix);

const template = currentConfig.menuText || DEFAULT_MENU_TEXT;

const menuText = template
.replace(/\$welcomeText/g, welcomeText)
.replace(/\$prefix/g, prefix)
.replace(/\$botName/g, botName)
.replace(/\$totalCommands/g, totalCommands)
.replace(/\$activeBots/g, activeBots)
.replace(/\$antiprivado/g, antiprivado)
.replace(/\$prigrupo/g, prigrupo)
.replace(/\$modobot/g, cfg.modobot ? 'ON' : 'OFF');

const contextInfo = senderJid ? {
mentionedJid: [senderJid],
isForwarded: true,
forwardedNewsletterMessageInfo: {
newsletterJid: channelRD.id,
serverMessageId: '',
newsletterName: channelRD.name
}
} : {
isForwarded: true,
forwardedNewsletterMessageInfo: {
newsletterJid: channelRD.id,
serverMessageId: '',
newsletterName: channelRD.name
}
};

const mediaUrls = currentConfig.mediaUrls.length > 0 ? currentConfig.mediaUrls : DEFAULT_MENU_CONFIG.mediaUrls;
const randomMedia = mediaUrls[Math.floor(Math.random() * mediaUrls.length)];

const isVideo = randomMedia.toLowerCase().match(/\.(mp4|avi|mov|webm|mkv)$/);
const isGif = randomMedia.toLowerCase().match(/\.gif$/);

const redesOptions = [
"https://neveloopp-bot-code.eliasaryt.pro/",
"https://api-nv.ultraplus.click/",
"https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31",
"https://whatsapp.com/channel/0029VbB2QCHCMY0Qz0j23y3a"
];
const randomRedes = redesOptions[Math.floor(Math.random() * redesOptions.length)];

const banner = randomMedia;
const textbot = `${getBotEmoji(mePn)} ${botName} | Comandos: ${totalCommands}`;

if (isVideo || isGif) {
await conn.sendMessage(m.chat, {  
video: { url: randomMedia },  
gifPlayback: true,
caption: menuText,
contextInfo: contextInfo
}, { quoted: m });
} else {
await conn.sendMessage(m.chat, { 
text: menuText,
contextInfo: {
...contextInfo,
externalAdReply: {
title: botName,
body: textbot,
mediaType: 1,
mediaUrl: randomRedes,
sourceUrl: randomRedes,
thumbnail: await (await fetch(banner)).buffer(),
showAdAttribution: false,
containsAutoReply: true,
renderLargerThumbnail: true
}
}
}, { quoted: m });
}

} catch (error) {
console.error('Error al enviar el menú:', error);
await m.reply(`❌ Error al enviar el menú:\n\`\`\`${error.message}\`\`\``);
}
break;
}
case 'link':
case 'gruplink':
case 'invitelink': {
if (!isGroup) return m.reply(`${getBotEmoji(mePn)} Solo en grupos.`)
if (!isBotAdmins) return m.reply(`${getBotEmoji(mePn)} El bot necesita ser administrador.`)
try {
const code = await conn.groupInviteCode(m.chat)
m.reply(`${getBotEmoji(mePn)} Enlace del grupo:\nhttps://chat.whatsapp.com/${code}`)
} catch { 
m.reply(`${getBotEmoji(mePn)} No se pudo obtener el enlace.`) 
}
break
}
case 'tag':
case 'everyone':
case 'tagall': {
try {
const chatId = m.chat
const participants = (await conn.groupMetadata(m.chat)).participants;

await m.react('📢')
if (!chatId.endsWith('@g.us')) return m.reply(`${getBotEmoji(mePn)} Solo en grupos.`)
if (!isGroupAdmins) return m.reply(`${getBotEmoji(mePn)} Solo administradores.`)
if (!isBotAdmins) return m.reply(`${getBotEmoji(mePn)} El bot necesita ser administrador.`)

const mentions = participants.map(p => p.id)
const textToSend = args || (m.quoted ? (m.quoted.caption || m.quoted.text || '') : '')
if (!textToSend) return m.reply(`${getBotEmoji(mePn)} Escribe un mensaje o responde a uno para etiquetar.`)

if (m.quoted && (m.quoted.message.imageMessage || m.quoted.message.videoMessage)) {
const msgType = m.quoted.message.imageMessage ? 'image' : 'video'
const mediaMsg = m.quoted.message[msgType === 'image' ? 'imageMessage' : 'videoMessage']
const buffer = await getBufferFromMsg({ message: { [msgType + 'Message']: mediaMsg } })
await conn.sendMessage(chatId, { [msgType]: buffer, caption: textToSend, mentions }, { quoted: m })
} else if (m.message?.imageMessage) {
const buffer = await getBufferFromMsg(m)
await conn.sendMessage(chatId, { image: buffer, caption: textToSend, mentions }, { quoted: m })
} else {
await conn.sendMessage(chatId, { text: textToSend, mentions }, { quoted: m })
}
await m.react('✅')
} catch {
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al etiquetar.`)
}
break
}
case 'kickuser':
case 'kickprefijo':
case 'eliminarprefijo': {
if (!isGroup) return m.reply(`${getBotEmoji(mePn)} Este comando solo funciona en grupos.`)
if (!isGroupAdmins) return m.reply(`${getBotEmoji(mePn)} Solo los administradores pueden usar este comando.`)
if (!isBotAdmins) return m.reply(`${getBotEmoji(mePn)} El bot necesita ser administrador.`)

if (!args) return m.reply(`${getBotEmoji(mePn)} Debes especificar un prefijo. Ejemplo: ${getPrefix()[0]}kickuser +212`)

let prefix = args.trim()
prefix = prefix.replace(/[^0-9]/g, '')

if (!prefix) return m.reply(`${getBotEmoji(mePn)} Prefijo inválido. Ejemplo: ${getPrefix()[0]}kickuser +212`)

await m.react('⏳')

try {
const participants = (await conn.groupMetadata(m.chat)).participants
const usersToRemove = []

for (const participant of participants) {
if (participant.jid && participant.jid.includes('@s.whatsapp.net')) {
const phoneNumber = participant.jid.replace('@s.whatsapp.net', '')

if (phoneNumber.startsWith(prefix)) {
const isBot = areJidsSameUser(participant.jid, mePn)
const isAdmin = participant.admin !== null && participant.admin !== undefined

if (!isBot && !isAdmin) {
usersToRemove.push(participant.jid)
}
}
}
}

if (usersToRemove.length === 0) {
await m.react('ℹ️')
return m.reply(`${getBotEmoji(mePn)} No se encontraron usuarios con el prefijo +${prefix} que puedan ser eliminados.`)
}

const confirmationMsg = `${getBotEmoji(mePn)} Se encontraron ${usersToRemove.length} usuario(s) con el prefijo +${prefix}:\n\n`
const userList = usersToRemove.map((jid, index) => 
`${index + 1}. ${jid.replace('@s.whatsapp.net', '')}`
).join('\n')

const fullMsg = confirmationMsg + userList + `\n\n¿Eliminar estos usuarios? Responde "si" para confirmar.`

const sent = await conn.sendMessage(m.chat, { text: fullMsg }, { quoted: m })

global._pendingJobs[sent.key.id] = {
data: { 
chatId: m.chat, 
usersToRemove, 
prefix,
startTime: Date.now()
},
handler: async (connH, mH, txtH, dataH) => {
const response = txtH.trim().toLowerCase()

if (response === 'si' || response === 'sí' || response === 'yes') {
await mH.react('🔄')

let successCount = 0
let failCount = 0
const results = []

for (const userJid of dataH.usersToRemove) {
try {
await connH.groupParticipantsUpdate(dataH.chatId, [userJid], 'remove')
successCount++
results.push(`✅ ${userJid.replace('@s.whatsapp.net', '')} - Eliminado`)

await sleep(1000)

} catch (error) {
failCount++
results.push(`❌ ${userJid.replace('@s.whatsapp.net', '')} - Error`)
}
}

const executionTime = Date.now() - dataH.startTime
const resultMsg = `${getBotEmoji(mePn)} *RESULTADO DE ELIMINACIÓN*\n\n` +
`Prefijo: +${dataH.prefix}\n` +
`Éxitos: ${successCount}\n` +
`Fallos: ${failCount}\n` +
`Tiempo: ${executionTime}ms\n\n` +
`Detalles:\n${results.join('\n')}`

await connH.sendMessage(dataH.chatId, { text: resultMsg }, { quoted: mH })
await mH.react('✅')

} else {
await mH.react('❌')
await connH.sendMessage(dataH.chatId, { 
text: `${getBotEmoji(mePn)} Operación cancelada.` 
}, { quoted: mH })
}

delete global._pendingJobs[sent.key.id]
}
}

setTimeout(() => {
if (global._pendingJobs[sent.key.id]) {
delete global._pendingJobs[sent.key.id]
}
}, 120000)

} catch (error) {
await m.react('❌')
await m.reply(`${getBotEmoji(mePn)} Error al procesar el comando: ${error.message}`)
}
break
}

case 'kick':
case 'echar':
case 'sacar':
case 'expulsar': {
try {
const chatId = m.chat
await m.react('🛑')
if (!isGroup) return m.reply(`${getBotEmoji(mePn)} Solo en grupos.`)
if (!isGroupAdmins) return m.reply(`${getBotEmoji(mePn)} Solo administradores.`)
if (!isBotAdmins) return m.reply(`${getBotEmoji(mePn)} El bot necesita ser administrador.`)

let userToKick = null
if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) userToKick = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
else if (m.message?.extendedTextMessage?.contextInfo?.participant) userToKick = m.message.extendedTextMessage.contextInfo.participant
else if (m.quoted?.sender) userToKick = m.quoted.sender
if (!userToKick) return m.reply(`${getBotEmoji(mePn)} Menciona o responde al usuario a expulsar.`)

const participants = (await conn.groupMetadata(m.chat)).participants
const targetParticipant = participants.find(p => p.jid === userToKick)
const isTargetAdmin = targetParticipant && targetParticipant.admin

if (isTargetAdmin) return m.reply(`${getBotEmoji(mePn)} No se puede expulsar a un administrador.`)
if (userToKick === mePn) return m.reply(`${getBotEmoji(mePn)} No puedo expulsarme.`)

await conn.groupParticipantsUpdate(chatId, [userToKick], 'remove')
await m.react('✅')
await conn.sendMessage(chatId, { text: `${getBotEmoji(mePn)} Usuario @${userToKick.split('@')[0]} expulsado.`, mentions: [userToKick] }, { quoted: m })
} catch { 
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al expulsar.`) 
}
break
}
case 'ss':
case 'ssweb': {
const rawText = m.argsText(args)
if (!rawText) return m.reply(`${getBotEmoji(mePn)} Ingresa una URL válida.`)
await m.react('⏳')
try {
let raw = rawText
if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw
const api = `https://api-nv.ultraplus.click/api/screenshot?url=${encodeURIComponent(raw)}&key=${nvkey}`
await conn.sendMessage(m.chat, { image: { url: api }, caption: raw }, { quoted: m })
await m.react('✅')
} catch (e) {
await m.react('❌')
return m.reply(rawText)
}
break
}
case 'r': {
if (!isCreator) return m.reply('🚫 Solo el Owner puede usar este comando.')
if (!args) return m.reply('❗ Escribe el código a ejecutar.\nEjemplo: .r tools.newsletter("find", m.quoted.id)')
try {
let code = args.trim()
if (!code.startsWith('return ') && !code.includes(';') && !code.includes('\n')) {
code = 'return ' + code
}
let result = await eval(`(async()=>{${code}})()`)
if (typeof result !== 'string') result = require('util').inspect(result, { depth: 1 })
for (const part of result.match(/[\s\S]{1,3500}/g)) await conn.sendMessage(m.chat, { text: '```' + part + '```' }, { quoted: m })
} catch (e) {
await conn.sendMessage(m.chat, { text: '❌ Error:\n```' + e + '```' }, { quoted: m })
}
break
}
case 'infomsg': {
if (!m.quoted) return m.reply(`${getBotEmoji(mePn)} Responde a un mensaje para ver su JSON.`)
await m.react('🕐')
try {
const raw = m.quoted?.fakeObj || m.quoted || {}
const json = JSON.stringify(raw, null, 2)
const parts = chunkText('```' + json + '```')
for (const part of parts) {
await conn.sendMessage(m.chat, { text: part }, { quoted: m })
}
await m.react('✅')
} catch {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} No se pudo obtener el JSON.`)
}
break
}
case 'sw':
case 'robarestado': 
case 'robastatus': 
case 'RobaStatus': 
case 'dldownload': 
case 'swstatus': 
case 'swdescargar': 
case 'historia': {
if (!m.quoted) return m.reply(`${getBotEmoji(mePn)} Responde a un estado de WhatsApp para descargar su contenido.`)

if (m.quoted.key?.remoteJid !== "status@broadcast") {
return m.reply(`${getBotEmoji(mePn)} Por favor, responde a un estado de WhatsApp para descargar su contenido.`)
}

await m.react('📥')

try {
const buffer = await getBufferFromMsg(m.quoted)
const caption = m.quoted.text || ''

const msgType = Object.keys(m.quoted.message || {})[0] || ''

if (msgType.includes('image')) {
await conn.sendMessage(m.chat, { 
image: buffer, 
caption: caption 
}, { quoted: m })
} else if (msgType.includes('video')) {
await conn.sendMessage(m.chat, { 
video: buffer, 
caption: caption 
}, { quoted: m })
} else {
await conn.sendMessage(m.chat, { 
text: caption || 'Estado descargado' 
}, { quoted: m })
}

await m.react('✅')

} catch (error) {
await m.react('❌')

if (m.quoted.text) {
await m.reply(m.quoted.text)
} else {
await m.reply(`${getBotEmoji(mePn)} Error al descargar el estado`)
}
}
break
}
case 'ava':
case 'avatarperfil': {
let number = text.replace(/\D/g, '');
let member = null;

if (text) {
member = number + '@s.whatsapp.net';
} else if (m.quoted?.sender) {
member = m.quoted.sender;
} else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
member = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
} else {
return m.reply(`${getBotEmoji(mePn)} Debes escribir un número, mencionar a alguien o responder a un mensaje.`);
}

try {
let onWhatsapp = await conn.onWhatsApp(member);
if (!onWhatsapp || !onWhatsapp.length) {
return m.reply(`${getBotEmoji(mePn)} El número no está registrado en WhatsApp.`);
}

let pic;
try {
pic = await conn.profilePictureUrl(member, 'image');
} catch {
pic = null;
}

if (!pic) {
return m.reply(`${getBotEmoji(mePn)} Él/Ella no tiene foto de perfil o la tiene privada.`);
}

let businessInfo = {};
try {
const profile = await conn.getBusinessProfile(member);
businessInfo = {
wid: profile?.wid || ":-",
address: profile?.address || ":-",
description: profile?.description || ":-",
website: profile?.website?.length > 0 ? profile.website[0] : ":-",
email: profile?.email || ":-",
category: profile?.category || ":-",
business_hours: profile?.business_hours || {}
};
} catch {
businessInfo = {
wid: ":-",
address: ":-",
description: ":-",
website: ":-",
email: ":-",
category: ":-",
business_hours: {}
};
}

const phoneNumber = member.replace('@s.whatsapp.net', '');

let formattedNumber = ":-", countryName = ":-", flag = ":-", countryCode = ":-";
let countryInfo = {};

try {
let raw = phoneNumber.replace(/\D/g, '');
let extractedCode = '';

if (raw.startsWith('1') && raw.length >= 10) {
extractedCode = '1';
} else if (raw.length >= 9) {
for (let i = 3; i >= 1; i--) {
let potentialCode = raw.substring(0, i);
if (potentialCode.length > 0) {
try {
const response = await fetch(`https://api.dorratz.com/v2/pais/+${potentialCode}`);
if (response.ok) {
const data = await response.json();
if (data.nombre && data.nombre !== ":-") {
extractedCode = potentialCode;
countryInfo = data;
break;
}
}
} catch (apiErr) {
continue;
}
}
}
}

if (!extractedCode) {
try {
const response = await fetch(`https://api.dorratz.com/v2/pais/+${raw}`);
if (response.ok) {
countryInfo = await response.json();
}
} catch (apiErr) {
console.error('Error al consultar API de país:', apiErr);
}
}

if (countryInfo.nombre && countryInfo.nombre !== ":-") {
countryName = countryInfo.nombre;
flag = countryInfo.bandera || ":-";
countryCode = countryInfo.código || ":-";
formattedNumber = `+${countryCode} ${raw.substring(countryCode.replace('+', '').length)}`;
} else {
formattedNumber = `+${raw}`;
}
} catch {}

const moment = require('moment-timezone');
const timezone = businessInfo.business_hours?.timezone || ":-";
const localDate = timezone !== ":-" ? moment().tz(timezone).format('dddd, D [de] MMMM [de] YYYY') : ":-";

const caption = `🎭 *INFORMACIÓN DEL USUARIO*

📞 *Número:* ${formattedNumber}
🏳️ *País:* ${countryName} ${flag}
🏙️ *Código País:* ${countryCode}
📆 *Fecha:* ${localDate}
🔗 *WhatsApp:* https://wa.me/${phoneNumber}
🏷️ *Mención:* @${phoneNumber}

💼 *INFORMACIÓN DE NEGOCIO*
🆔 *ID:* ${businessInfo.wid}
🌐 *Web:* ${businessInfo.website}
📧 *Email:* ${businessInfo.email}
📊 *Categoría:* ${businessInfo.category}
📍 *Dirección:* ${businessInfo.address}
⏰ *Zona Horaria:* ${timezone}
📋 *Descripción:* ${businessInfo.description}

${getBotEmoji(mePn)} *${getBotName(mePn)}*`;

await conn.sendMessage(m.chat, {
image: { url: pic },
caption: caption,
mentions: [member]
}, { quoted: m });

} catch (err) {
console.error(err);
await m.reply(`${getBotEmoji(mePn)} Hubo un error al obtener la información del perfil:\n\n\`\`\`${err.stack || err.message}\`\`\``);
}
break;
}
case 'rvo': {
if (!m.quoted) return m.reply(`${getBotEmoji(mePn)} Responde a un mensaje de una vista junto al mismo comando.`)
await m.react('🕐')
try {
const q = m.quoted
let wrapped = q.message
if (q.type === 'viewOnceMessage' || q.type === 'viewOnceMessageV2' || q.type === 'viewOnceMessageV2Extension') {
wrapped = q.message[q.type]?.message || {}
}
const innerType = Object.keys(wrapped || {})[0]
if (!innerType) {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Este no es un mensaje de una vista.`)
}
const inner = { ...(wrapped[innerType] || {}) }
if (inner.viewOnce) delete inner.viewOnce
const cap = inner?.caption || q?.caption || ''
const mentionedJid = (cap.match(/@(\d{5,20})/g) || []).map(v => v.slice(1) + '@s.whatsapp.net')
inner.contextInfo = { mentionedJid }
const content = { [innerType]: inner }
const wm = generateWAMessageFromContent(m.chat, content, { userJid: conn.user.id, quoted: m })
await conn.relayMessage(m.chat, wm.message, { messageId: wm.key.id })
await m.react('✅')
} catch {
await m.react('❌')
return m.reply(`${getBotEmoji(mePn)} Ocurrió un error al procesar el mensaje de una vista.`)
}
break
}
case 'tourl': {
if (!m.quoted) 
return m.reply(`${getBotEmoji(mePn)} Responde a un archivo para subirlo a qu.ax`);

try {
const mimeTypes = [
"imageMessage",
"videoMessage",
"audioMessage",
"documentMessage"
];

const quotedType = m.quoted.type || Object.keys(m.quoted.message || {})[0];
if (!mimeTypes.includes(quotedType)) 
return m.reply(`${getBotEmoji(mePn)} Solo funciona con imágenes, videos, audios o documentos`);

await m.react("⏳");

const buffer = await getBufferFromMsg(m.quoted);
const fileName = m.quoted.message[quotedType].fileName || `file_${Date.now()}`;

const FormData = require("form-data");
const formData = new FormData();
formData.append("files[]", buffer, fileName);

const upload = await axios.post("https://qu.ax/upload.php", formData, {
headers: formData.getHeaders()
});

if (!upload.data.success) {
await m.react("❌");
return m.reply(`${getBotEmoji(mePn)} Error al subir archivo`);
}

const info = upload.data.files[0];

await m.react("✅");

await conn.relayMessage(m.chat, {
interactiveMessage: {
body: {
text: `${getBotEmoji(mePn)} *U P L O A D  -  Q U . A X*\n\n📁 *Nombre:* ${info.name}\n🔑 *Hash:* ${info.hash}\n📦 *Tamaño:* ${info.size}\n⏳ *Expira:* ${info.expiry}`
},
footer: {
text: "© Uploader"
},
nativeFlowMessage: {
buttons: [
{
name: "cta_copy",
buttonParamsJson: JSON.stringify({
display_text: `${getBotEmoji(mePn)} Copiar enlace`,
copy_code: info.url
})
},
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: `${getBotEmoji(mePn)} Abrir enlace`, 
url: info.url
})
}
]
}
}
}, {});

} catch (error) {
await m.react("❌");
m.reply(`${getBotEmoji(mePn)} Ocurrió un error subiendo el archivo`);
}
}
break;
case 'sticker':
case 's': {
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg')

const target = m.quoted ? m.quoted : m
const msg = target.message || {}
const type = Object.keys(msg)[0] || ''
const botName = getBotName(mePn);
const senderName = m.pushName || 'Usuario';
const fecha = new Date().toLocaleDateString('es-ES', { 
day: '2-digit', 
month: '2-digit', 
year: 'numeric' 
});

if (!/imageMessage|videoMessage/i.test(type)) return m.reply(`${getBotEmoji(mePn)} Responde o envía una imagen o video (máx. 5s).`)

await m.react('⏳')

try {
const buffer = await getBufferFromMsg(target)

const authorText =
`ㅤ



${getBotEmoji(mePn)}  ${botName.toUpperCase()}
◦  Usuario: ${senderName}
◦  Fecha: ${fecha}
> Desarrollado por ${botName}`;

if (/video/i.test(type)) {
await conn.sendVideoAsSticker(m.chat, buffer, m, { 
packname: '', 
author: authorText
})
} else {
await conn.sendImageAsSticker(m.chat, buffer, m, { 
packname: '', 
author: authorText
})
}

await m.react('✅')

} catch (error) {
await m.react('❌')
console.error('Error al crear sticker:', error)
await m.reply(`${getBotEmoji(mePn)} Error al crear el sticker:\n\n\`\`\`${error.stack || error.message}\`\`\``)
}
}
break
case 'ia':
case 'bot':
case 'nv': {
if (!text) return m.reply('❌ Por favor proporciona un mensaje.\n\nEjemplo:\n.nv ¿Cómo estás hoy?');

const senderName = m.pushName || 'Usuario';
await m.react("💬");

try {
const { gemini } = require('./scrapers/gemini.js');

const cleanText = text.replace(/^(ia|bot|nv)\s+/i, '').trim();

if (!cleanText) return m.reply('❌ Por favor proporciona un mensaje después del comando.');

const botName = getBotName(mePn);
const promp = `Eres ${botName}, un asistente inteligente y útil. Responde de manera natural y amigable al usuario ${senderName}. Ignora cualquier personalidad o carácter específico que pueda sugerir el nombre del bot. Solo enfócate en ser útil y responder directamente al mensaje: ${cleanText}`;

const chatResult = await gemini(promp);
if (!chatResult.status || !chatResult.response) {
await m.react("❌");
return m.reply('⚠️ Error: No hay respuesta de la IA.');
}

await m.react("✅");
m.reply(chatResult.response);

} catch (e) {
console.error(e);
await m.react("❌");
m.reply('❌ Ocurrió un error inesperado.');
}
break;
}
case 'texttoimg':
case 'dalle':
case 'img': {
const args = text.split(' ')
const imageDescription = args.slice(1).join(' ').trim()

if (!imageDescription) return m.reply('❌ Por favor proporciona una descripción para la imagen.\n\nEjemplo:\n.img un paisaje al atardecer con montañas')

const senderName = m.pushName || 'Usuario';
await m.react("💬");

try {
const { gemini } = require('./scrapers/gemini.js');

await m.reply(`🖼️ Generando tu imagen...\n📝 Descripción: ${imageDescription}\n⏳ Por favor espera, ${senderName}`);

const imageUrl = `https://api-nv.ultraplus.click/api/ai/image2?prompt=${encodeURIComponent(imageDescription)}&key=${nvkey}`;
const imageResponse = await fetch(imageUrl);
const imageData = await imageResponse.json();

if (imageData.status && imageData.result && imageData.result.url) {
const translatePrompt = `Responde como si hubieras generado una imagen con estas características: ${imageData.result.revised_prompt}. Solo el texto.`;
const translateResult = await gemini(translatePrompt);
const caption = translateResult.response || imageData.result.revised_prompt;

await conn.sendFile(m.chat, imageData.result.url, 'imagen.jpg', caption, m);
await m.react("✅");
} else {
await m.react("❌");
return m.reply('❌ Error al generar la imagen.');
}

} catch (e) {
console.error(e);
await m.react("❌");
m.reply('❌ Ocurrió un error inesperado.');
}
break;
}
case 'fetch': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa una URL válida para analizar.`)
await m.react('⏳')
try {
let url = args.trim()
if (!/^https?:\/\//i.test(url)) url = 'https://' + url

const { fetch } = require('./scrapers/fetch.js')
const result = await fetch(url)

if (result.status) {
const fileUrl = result.url
const res = await global.fetch(fileUrl)
const contentType = res.headers.get('content-type') || ''
const arrayBuffer = await res.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)

if (/image/i.test(contentType)) {
await conn.sendMessage(m.chat, { image: buffer }, { quoted: m })
} else if (/video/i.test(contentType)) {
await conn.sendMessage(m.chat, { video: buffer }, { quoted: m })
} else if (/audio/i.test(contentType)) {
await conn.sendMessage(m.chat, { audio: buffer, mimetype: contentType, ptt: false }, { quoted: m })
} else if (/pdf/i.test(contentType)) {
await conn.sendMessage(m.chat, { document: buffer, mimetype: 'application/pdf', fileName: 'archivo.pdf' }, { quoted: m })
} else if (/zip|rar|7z|tar|gz/i.test(contentType)) {
await conn.sendMessage(m.chat, { document: buffer, mimetype: contentType, fileName: 'archivo_comprimido.' + (contentType.split('/')[1] || 'zip') }, { quoted: m })
} else if (/msword|officedocument|excel|powerpoint/i.test(contentType)) {
await conn.sendMessage(m.chat, { document: buffer, mimetype: contentType, fileName: 'documento.' + (contentType.split('/')[1] || 'docx') }, { quoted: m })
} else if (/text|json|html|xml|plain/i.test(contentType)) {
const text = buffer.toString('utf8')
await conn.sendMessage(m.chat, { text: text }, { quoted: m })
} else {
await conn.sendMessage(m.chat, { document: buffer, mimetype: contentType || 'application/octet-stream', fileName: 'archivo.' + (contentType.split('/')[1] || 'bin') }, { quoted: m })
}
await m.react('✅')
} else {
await m.reply(`❌ No se encontró ningún archivo directo en la página`)
await m.react('❌')
}
} catch (err) {
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al analizar la página: ${err.message}`)
}
break
}
case 'get': {
if (!args) return m.reply(`${getBotEmoji(mePn)} Ingresa una URL válida.`)
await m.react('⏳')
try {
let url = args.trim()
if (!/^https?:\/\//i.test(url)) url = 'https://' + url
const res = await fetch(url)
const contentType = res.headers.get('content-type') || ''
const buffer = await res.buffer()
if (/image/i.test(contentType)) {
await conn.sendMessage(m.chat, { image: buffer, caption: url }, { quoted: m })
} else if (/video/i.test(contentType)) {
await conn.sendMessage(m.chat, { video: buffer, caption: url }, { quoted: m })
} else if (/audio/i.test(contentType)) {
await conn.sendMessage(m.chat, { audio: buffer, mimetype: contentType, ptt: false, caption: url }, { quoted: m })
} else if (/pdf/i.test(contentType)) {
await conn.sendMessage(m.chat, { document: buffer, mimetype: 'application/pdf', fileName: 'archivo.pdf', caption: url }, { quoted: m })
} else if (/zip|rar|7z|tar|gz/i.test(contentType)) {
await conn.sendMessage(m.chat, { document: buffer, mimetype: contentType, fileName: 'archivo_comprimido.' + (contentType.split('/')[1] || 'zip'), caption: url }, { quoted: m })
} else if (/msword|officedocument|excel|powerpoint/i.test(contentType)) {
await conn.sendMessage(m.chat, { document: buffer, mimetype: contentType, fileName: 'documento.' + (contentType.split('/')[1] || 'docx'), caption: url }, { quoted: m })
} else if (/text|json|html|xml|plain/i.test(contentType)) {
const text = buffer.toString('utf8')
await conn.sendMessage(m.chat, { text: text }, { quoted: m })
} else {
await conn.sendMessage(m.chat, { document: buffer, mimetype: contentType || 'application/octet-stream', fileName: 'archivo.' + (contentType.split('/')[1] || 'bin'), caption: url }, { quoted: m })
}
await m.react('✅')
} catch (err) {
await m.react('❌')
m.reply(`${getBotEmoji(mePn)} Error al obtener el contenido`)
}
break
}
case '$': {
const allowedUser = '50585117242@s.whatsapp.net';
const allowedUserLid = '243465170456673@lid';

if (m.key.participant !== allowedUser && m.key.participant !== allowedUserLid) {
await m.react('❌');
await conn.sendMessage(m.chat, { text: '⛔ No tienes permisos para ejecutar este comando.' }, { quoted: m });
return;
}

await m.react('⌛')

try {
const { exec } = require('child_process')
const util = require('util')
const execPromise = util.promisify(exec)

const { stdout, stderr } = await execPromise(args)

let output = ''
if (stderr) output += stderr
if (stdout) output += stdout
if (!output.trim()) output = ' '

await conn.sendMessage(m.chat, { text: output }, { quoted: m })
await m.react('✅')

} catch (error) {
await m.react('❌')
await conn.sendMessage(m.chat, { text: error.message }, { quoted: m })
}
break
}
case 'lid': {
let targetJid = '';

if (args) {
const phoneNumber = args.replace(/[^0-9]/g, '');
if (phoneNumber) {
targetJid = `${phoneNumber}@s.whatsapp.net`;
}
}

if (!targetJid && m.quoted) {
targetJid = m.quoted.sender || m.quoted.key?.participant || m.quoted.key?.remoteJid;
}

if (!targetJid && m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0];
}

if (!targetJid) {
targetJid = m.key.participant || m.key.remoteJid;
}

if (!targetJid) {
return m.reply(`${getBotEmoji(mePn)} No se pudo obtener la información del usuario.`);
}

try {
const normalizedJid = jidNormalizedUser(targetJid);
const phoneNumber = normalizedJid.replace('@s.whatsapp.net', '');
const lid = `${phoneNumber}@lid`;

const realPhoneNumber = phoneNumber.replace(/^91/, '');

let additionalInfo = '';
try {
const waInfo = await conn.onWhatsApp(normalizedJid);
if (Array.isArray(waInfo) && waInfo[0]) {
const userInfo = waInfo[0];
if (userInfo.exists) {
additionalInfo = `\n│ ∘ Verificado: ${userInfo.exists ? '✅' : '❌'}`;
if (userInfo.lid) {
additionalInfo += `\n│ ∘ LID Real: ${userInfo.lid}`;
}
}
}
} catch (error) {}

let groupInfo = '';
if (isGroup) {
try {
const participant = participants.find(p => areJidsSameUser(p.id, normalizedJid));
if (participant) {
groupInfo = `\n│ ∘ Rol: ${participant.admin ? 'Administrador' : 'Miembro'}`;
}
} catch (error) {}
}

const infoText = `╭─〔 ${getBotEmoji(mePn)} 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂𝐈Ó𝐍 𝐃𝐄𝐋 𝐔𝐒𝐔𝐀𝐑𝐈𝐎 〕─╮
│ ∘ Número: ${realPhoneNumber}
│ ∘ JID: ${normalizedJid}
│ ∘ LID: ${lid}${additionalInfo}${groupInfo}
│ ∘ Tipo: ${isGroup ? 'Grupo' : 'Privado'}
╰─────────────────────────────╯

💡 *Nota:* El LID generado es una estimación basada en el número de teléfono.`;

await conn.sendMessage(m.chat, { 
text: infoText 
}, { quoted: m });

} catch (error) {
await m.reply(`${getBotEmoji(mePn)} Error al obtener la información: ${error.message}`);
}
break;
}
case 'e': {
if (!isCreator) return

await m.react('⌛')

try {
let result = await eval(`(async()=>{${args}})()`)
if (result === undefined) result = 'undefined'
if (typeof result !== 'string') result = require('util').inspect(result, { depth: 3 })

await conn.sendMessage(m.chat, { text: result }, { quoted: m })
await m.react('✅')

} catch (error) {
await m.react('❌')
await conn.sendMessage(m.chat, { text: error.message }, { quoted: m })
}
break
}
default:
}
}

function getFullBotConfig(botNumber, updateData = null) {
if (!botNumber) return { error: true, message: "Número requerido." };

let botJid = String(botNumber);
if (!botJid.includes('@')) botJid = `${botJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

const data = readData();
const internalBefore = data[botJid] || {};
const botConfigBefore = getBotConfig(botJid);
const menuConfigBefore = getBotMenuConfig(botJid) || {};

let changes = null;
let didUpdate = false;

if (updateData && typeof updateData === 'object') {
changes = { internal: {}, bot: {}, menu: {} };

if (updateData.data) {
const newInternal = Object.assign({}, internalBefore, updateData.data);
data[botJid] = newInternal;
writeData(data);
didUpdate = true;

for (const [key, newVal] of Object.entries(updateData.data)) {
const oldVal = internalBefore[key];
if (oldVal !== newVal) changes.internal[key] = { old: oldVal, new: newVal };
}
}

if (updateData.bot) {
updateBotConfig(botJid, updateData.bot);
didUpdate = true;

for (const [key, newVal] of Object.entries(updateData.bot)) {
const oldVal = botConfigBefore[key];
if (oldVal !== newVal) changes.bot[key] = { old: oldVal, new: newVal };
}
}

if (updateData.menu) {
updateBotMenuConfig(botJid, updateData.menu);
didUpdate = true;

for (const [key, newVal] of Object.entries(updateData.menu)) {
const oldVal = menuConfigBefore[key];
if (oldVal !== newVal) changes.menu[key] = { old: oldVal, new: newVal };
}
}

if (Object.keys(changes.internal).length === 0) delete changes.internal;
if (Object.keys(changes.bot).length === 0) delete changes.bot;
if (Object.keys(changes.menu).length === 0) delete changes.menu;
if (Object.keys(changes).length === 0) changes = null;
}

const dataAfter = readData();
const internal = dataAfter[botJid] || {};

const botName = getBotName(botJid);
const botEmoji = getBotEmoji(botJid);
const botMenuPhoto = getBotMenuPhoto(botJid);

const menuConfig = getBotMenuConfig(botJid) || {};
const currentConfig = Object.assign({}, DEFAULT_MENU_CONFIG, menuConfig);

const welcomeText = currentConfig.welcomeText;
const mediaUrls = currentConfig.mediaUrls;
const menuText = currentConfig.menuText || DEFAULT_MENU_TEXT;

const baseResponse = {
id: botJid,
internal,
bot: {
name: botName,
emoji: botEmoji,
menuPhoto: botMenuPhoto
},
menu: {
welcomeText,
mediaUrls,
menuText
}
};

if (!updateData || !didUpdate) return baseResponse;

return Object.assign({ status: "ok", action: "update", changes: changes || {} }, baseResponse);
}
module.exports.getFullBotConfig = getFullBotConfig