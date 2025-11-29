const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
makeCacheableSignalKeyStore,
DisconnectReason
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const { EventEmitter } = require('events')

let chalk; try { chalk = require('chalk') } catch { chalk = new Proxy({}, { get: () => (s)=>String(s) }) }
let moment; try { moment = require('moment-timezone') } catch { moment = null }

const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'silent' })
const E164_MIN = 8, E164_MAX = 15
const PAIRING_DELAY_MS = Number(process.env.PAIRING_DELAY_MS || 2000)
const CODE_TTL_MS = Number(process.env.CODE_TTL_MS || 60000)
const CLEANUP_GRACE_MS = Number(process.env.CLEANUP_GRACE_MS || 15 * 60000)
const RECONNECT_DEADLINE_MS = Number(process.env.RECONNECT_DEADLINE_MS || 30000)
const BOOTSTRAP_DELAY_MS = Number(process.env.BOOTSTRAP_DELAY_MS || 500)
const KEEPALIVE_INTERVAL_MS = Number(process.env.KEEPALIVE_INTERVAL_MS || 60000)
const SESSIONS_DIR = path.join(__dirname, 'sessions')
const MAIN_PATH = path.join(__dirname, 'main.js')
const TZ = process.env.TZ || 'America/Managua'
const START_IMAGE_URL = process.env.BOT_START_IMG || 'https://cdn.russellxz.click/7a12cffe.jpg'

const logBus = new EventEmitter()
logBus.setMaxListeners(0)
const stripAnsi = s => String(s || '').replace(/\x1B\[[0-9;]*m/g, '')

let mainHandler = loadMain()

function loadMain() {
delete require.cache[require.resolve('./main')]
const mod = require('./main')
if (typeof mod === 'function') return mod
if (mod && typeof mod.default === 'function') return mod.default
return () => {}
}

function watchMain() {
if (!fs.existsSync(MAIN_PATH)) return
fs.watchFile(MAIN_PATH, { interval: 1200 }, () => {
try {
mainHandler = loadMain()
emitLog('system', 'main.js recargado automáticamente', 'info')
} catch (e) {
emitLog('system', `Error recargando main.js: ${e.message}`, 'error')
}
})
}
watchMain()

const emitLog = (id, message, type = 'info') => {
const logData = {
id: digits(id),
ts: Date.now(),
text: stripAnsi(message),
type: type
}
logBus.emit('log', logData)
}

const log = (id, ...a) => {
const msg = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')
const phone = digits(id)
if (phone && phone.length >= E164_MIN && phone.length <= E164_MAX) {
emitLog(phone, msg, 'info')
}
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const digits = s => String(s || '').replace(/[^\d]/g, '')
function normalizePhone(s) {
const n = digits(s)
if (n.length < E164_MIN || n.length > E164_MAX) throw new Error('phone inválido (E.164 sin +)')
return n
}
function formatCode(c) { return String(c || '').replace(/(.{4})(?=.)/g, '$1-') }
function metaPath(id) { return path.join(SESSIONS_DIR, id, '.meta.json') }
function readMeta(id) { try { return JSON.parse(fs.readFileSync(metaPath(id), 'utf8')) } catch { return {} } }
function writeMeta(id, patch) {
const dir = path.join(SESSIONS_DIR, id)
fs.mkdirSync(dir, { recursive: true })
const current = readMeta(id)
fs.writeFileSync(metaPath(id), JSON.stringify({ ...current, ...patch }, null, 2))
}
function isRegisteredOnDisk(id) {
try {
const creds = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, id, 'creds.json'), 'utf8'))
return !!creds?.registered
} catch { return false }
}

const sessions = {}

function cleanSessionDir(id) {
const dir = path.join(SESSIONS_DIR, id)
if (!fs.existsSync(dir)) return
const entries = fs.readdirSync(dir, { withFileTypes: true })
for (const entry of entries) {
const name = entry.name
const fullPath = path.join(dir, name)
if (entry.isDirectory()) {
try { fs.rmSync(fullPath, { recursive: true, force: true }) } catch {}
continue
}
if (name === 'creds.json') continue
if (name === '.meta.json') continue
if (name.startsWith('app-state')) continue
try { fs.unlinkSync(fullPath) } catch {}
}
}

function extractText(msg) {
if (!msg) return ''
if (msg.conversation) return msg.conversation
if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
if (msg.imageMessage?.caption) return msg.imageMessage.caption
if (msg.videoMessage?.caption) return msg.videoMessage.caption
if (msg.buttonsResponseMessage?.selectedButtonId) return msg.buttonsResponseMessage.selectedButtonId
if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId
return ''
}

function getActiveBots() {
const out = []
for (const id of Object.keys(sessions)) {
const s = sessions[id]
const reg = s?.sock?.authState?.creds?.registered || isRegisteredOnDisk(id)
if (reg && s?.isOpen) {
const botInfo = {
id: id,
uptime: s.lastOpenAt ? Date.now() - s.lastOpenAt : 0,
name: s.sock?.user?.name || s.sock?.user?.verifiedName || 'Sin nombre'
}
out.push(botInfo)
}
}
return { total: out.length, bots: out }
}

function scheduleAbandonedCleanup(id, overrideMs) {
const s = sessions[id]
if (!s) return
clearTimeout(s.cleanupTimer)
const delay = typeof overrideMs === 'number' ? overrideMs : CLEANUP_GRACE_MS
s.cleanupTimer = setTimeout(async () => {
try {
const ss = sessions[id]
if (!ss) return
const registered = ss.sock?.authState?.creds?.registered || isRegisteredOnDisk(id)
const m = readMeta(id)
const last = Number(m.lastCodeAt || 0)
const stale = !registered && last && (Date.now() - last >= CLEANUP_GRACE_MS)
if (stale) {
emitLog(id, `cleanup: sesión abandonada (>${Math.round(CLEANUP_GRACE_MS / 60000)}m), eliminando…`, 'warn')
await resetSession(id)
} else {
if (!registered) scheduleAbandonedCleanup(id)
}
} catch (e) {
emitLog(id, `cleanup error: ${e?.message || e}`, 'error')
}
}, delay)
}

async function bootstrapAll() {
fs.mkdirSync(SESSIONS_DIR, { recursive: true })
const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => /^\d{8,15}$/.test(d) && fs.statSync(path.join(SESSIONS_DIR, d)).isDirectory())
for (const id of dirs) {
cleanSessionDir(id)
}
for (const id of dirs) {
try {
await sleep(BOOTSTRAP_DELAY_MS)
if (!isRegisteredOnDisk(id)) {
const m = readMeta(id)
const last = Number(m.lastCodeAt || 0)
if (last && Date.now() - last >= CLEANUP_GRACE_MS) {
emitLog(id, 'bootstrap: sin registrar y antiguo → reset', 'warn')
await resetSession(id)
continue
}
}
await startSession(id)
const reg = isRegisteredOnDisk(id)
emitLog(id, `bootstrap: ${reg ? 'registrado' : 'no registrado'}`, 'info')
if (!reg) scheduleAbandonedCleanup(id)
} catch (e) {
emitLog(id, `bootstrap error: ${e?.message || e}`, 'error')
}
}
return dirs
}

async function bootstrapOne(idRaw) {
const id = normalizePhone(idRaw)
fs.mkdirSync(SESSIONS_DIR, { recursive: true })
const dir = path.join(SESSIONS_DIR, id)
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
emitLog(id, 'bootstrapOne: sesión no encontrada en disco', 'error')
return { id, started: false, status: 'not_found' }
}
const status = await getStatus(id)
if (status !== 'offline') {
emitLog(id, `bootstrapOne: sesión ya está ${status}`, 'info')
return { id, started: false, status }
}
cleanSessionDir(id)
try {
if (!isRegisteredOnDisk(id)) {
const m = readMeta(id)
const last = Number(m.lastCodeAt || 0)
if (last && Date.now() - last >= CLEANUP_GRACE_MS) {
emitLog(id, 'bootstrapOne: sin registrar y antiguo → reset', 'warn')
await resetSession(id)
fs.mkdirSync(dir, { recursive: true })
}
}
await startSession(id)
const reg = isRegisteredOnDisk(id)
emitLog(id, `bootstrapOne: ${reg ? 'registrado' : 'no registrado'}`, 'info')
if (!reg) scheduleAbandonedCleanup(id)
return { id, started: true, status: reg ? 'open' : 'pending' }
} catch (e) {
emitLog(id, `bootstrapOne error: ${e?.message || e}`, 'error')
return { id, started: false, status: 'error', error: String(e?.message || e) }
}
}

function nowFmt(ms) {
const d = new Date(ms || Date.now())
if (moment) return moment(d).tz(TZ).format('DD/MM/YY HH:mm:ss')
const pad = n => String(n).padStart(2,'0')
return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function firstKey(obj) { return obj ? Object.keys(obj)[0] : 'unknown' }

async function printIncomingLog(sock, sessId, m, text) {
const msg = m.message?.ephemeralMessage?.message || m.message
const type = firstKey(msg)
const from = m.key?.remoteJid || ''
const isGroup = from.endsWith('@g.us')
const senderJid = isGroup ? (m.key.participant || '') : from
const userNum = digits(senderJid)
const botJid = sock.user?.id || sock.user?.jid || ''
const botNum = digits(botJid)
const when = Number(m.messageTimestamp || 0) * 1000 || Date.now()
const pushname = m.pushName || 'Sin nombre'
let whereLine = ''
if (isGroup) {
let gName = sessions[sessId].groupCache.get(from)
whereLine = `${gName || from} | ${from}`
if (!gName) {
;(async () => {
try {
const meta = await sock.groupMetadata(from)
const name = meta?.subject || from
sessions[sessId].groupCache.set(from, name)
} catch {}
})()
}
} else {
whereLine = userNum ? `${userNum}@s.whatsapp.net` : from
}
const mode = typeof global !== 'undefined' && typeof global.publicMode !== 'undefined' ? (global.publicMode ? 'Público' : 'Privado') : 'Público'
const header = `MENSAJE ${nowFmt(when)}`
const lines = [
header,
`Bot: ${botNum || botJid}`,
`Modo: ${mode}`,
`Tipo: ${type}`,
isGroup ? `Grupo: ${whereLine}` : `De: ${whereLine}`,
`Nombre: ${pushname}${userNum ? ' | ' + userNum : ''}`,
`Mensaje:`,
text ? String(text).slice(0, 2000) : '[sin texto]'
]

const logMessage = lines.join('\n')
emitLog(sessId, logMessage, 'message')
}

function onCodeExpired(id) {
const s = sessions[id]
if (!s) return
const registered = s.sock?.authState?.creds?.registered || isRegisteredOnDisk(id)
if (registered) return
const m = readMeta(id)
const unused = Number(m.unusedCodes || 0) + 1
writeMeta(id, { unusedCodes: unused, lastCodeExpiredAt: Date.now() })
s.code = null
s.codeExpiresAt = 0
s.status = 'idle'
if (unused >= 2) {
emitLog(id, 'código expirado repetidamente → reset inmediato', 'error')
resetSession(id).catch(()=>{})
} else {
emitLog(id, 'código expiró sin registro → programar limpieza acelerada', 'warn')
scheduleAbandonedCleanup(id, Math.min(CLEANUP_GRACE_MS, 5 * 60 * 1000))
}
}

async function startSession(idRaw) {
const id = normalizePhone(idRaw)
if (sessions[id]?.sock) return sessions[id].sock
const dir = path.join(SESSIONS_DIR, id)
fs.mkdirSync(dir, { recursive: true })
const { state, saveCreds } = await useMultiFileAuthState(dir)
const { version } = await fetchLatestBaileysVersion()
emitLog(id, 'startSession → creando socket…', 'info')
const sock = makeWASocket({
printQRInTerminal: false,
logger,
auth: {
creds: state.creds,
keys: makeCacheableSignalKeyStore(state.keys, logger)
},
version,
browser: ['Ubuntu', 'Chrome', '20.0.04'],
keepAliveIntervalMs: KEEPALIVE_INTERVAL_MS,
markOnlineOnConnect: true
})
sessions[id] = {
sock, saveCreds,
status: 'init',
code: null, codeExpiresAt: 0,
codeTimer: null,
inPairing: false,
pending: null,
cleanupTimer: null,
reconnectTimer: null,
keepAliveTimer: null,
isOpen: false,
lastOpenAt: 0,
groupCache: new Map()
}
if (sessions[id].keepAliveTimer) clearInterval(sessions[id].keepAliveTimer)
sessions[id].keepAliveTimer = setInterval(async () => {
const s = sessions[id]
if (!s || !s.sock || !s.isOpen) return
try {
await s.sock.sendPresenceUpdate('available')
} catch (e) {}
}, KEEPALIVE_INTERVAL_MS)
sock.ev.on('creds.update', async () => {
await saveCreds()
const creds = sock.authState.creds
if (creds.registered) {
sessions[id].status = 'open'
sessions[id].code = null
sessions[id].codeExpiresAt = 0
sessions[id].inPairing = false
clearTimeout(sessions[id].codeTimer)
clearTimeout(sessions[id].cleanupTimer)
const meta = readMeta(id)
if (!meta.registeredAt) {
writeMeta(id, { registeredAt: Date.now(), unusedCodes: 0 })
} else {
writeMeta(id, { unusedCodes: 0 })
}
emitLog(id, 'creds.update → registrado ✔', 'success')
} else {
emitLog(id, 'creds.update', 'info')
}
})
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
const reason = lastDisconnect?.error?.output?.statusCode
const registered = !!sock.authState?.creds?.registered
const tag = connection === 'open' ? 'OPEN' : (connection === 'close' ? 'CLOSE' : String(connection).toUpperCase())
const logMessage = `${tag} ${reason ? `(reason ${reason})` : ''}`

if (connection === 'open') {
sessions[id].status = 'open'
sessions[id].inPairing = false
sessions[id].isOpen = true
sessions[id].lastOpenAt = Date.now()
clearTimeout(sessions[id].reconnectTimer)
emitLog(id, 'conectado', 'success')
if (registered) {
;(async () => {
try {
const meta = readMeta(id)
if (!meta.notifiedOnline) {
const jid = `${id}@s.whatsapp.net`
await sock.sendMessage(jid, {
image: { url: START_IMAGE_URL },
caption:
`🌱 *¡Tu bot está en línea!*

🌿 Todo está funcionando correctamente.
> *Recibirás actualizaciones por nuestro canal de WhatsApp.*

🚩 *Nota »* Únete para no perderte ninguna novedad 💬
> https://whatsapp.com/channel/0029Vb6D6ogBVJl60Yr8YL31`
})
emitLog(id, 'mensaje privado enviado ✔', 'success')
writeMeta(id, { notifiedOnline: true, unusedCodes: 0 })
}
} catch (e) {
emitLog(id, `error enviando mensaje inicial: ${e?.message || e}`, 'error')
}
})()
}
try {
sock.newsletterFollow("120363418194182743@newsletter")
sock.newsletterFollow("120363422857105071@newsletter")
emitLog(id, 'Se siguió al newsletter correctamente ✔', 'success')
} catch (err) {
emitLog(id, `Error al seguir al newsletter: ${err?.message || err}`, 'error')
}
}
if (connection === 'close') {
const loggedOut = reason === DisconnectReason.loggedOut
sessions[id].status = loggedOut ? 'logged_out' : 'closed'
sessions[id].isOpen = false
if (registered && !loggedOut) {
emitLog(id, 'reconectando en 3s…', 'warn')
clearTimeout(sessions[id].reconnectTimer)
sessions[id].reconnectTimer = setTimeout(() => {
sessions[id] && (sessions[id].sock = null)
startSession(id).catch(() => {})
}, 3000)
setTimeout(() => {
if (sessions[id] && !sessions[id].isOpen) {
emitLog(id, `sin reconexión en ${Math.round(RECONNECT_DEADLINE_MS/1000)}s → queda fuera de activos`, 'error')
}
}, RECONNECT_DEADLINE_MS)
} else {
emitLog(id, 'no reconectar (no registrado o loggedOut); programando limpieza', 'warn')
scheduleAbandonedCleanup(id)
}
}

emitLog(id, logMessage, connection === 'open' ? 'success' : (connection === 'close' ? 'error' : 'info'))
})
sock.ev.on('messages.upsert', async ({ messages }) => {
try {
if (!Array.isArray(messages) || !messages.length) return
for (const m of messages) {
const handlerStart = Date.now()
if (!m || m.key?.remoteJid === 'status@broadcast') continue
const msg = m.message?.ephemeralMessage?.message || m.message
const text = extractText(msg)
const from = m.key?.remoteJid || ''
const trimmed = text ? text.trim().toLowerCase() : ''
if (trimmed === 'p') {
const tsMs = Number(m.messageTimestamp || 0) * 1000
const now = Date.now()
const pingTotal = tsMs ? now - tsMs : 0
const internal = now - handlerStart
let pingText
if (pingTotal) {
pingText = `Ping total: ${pingTotal}ms\nProcesamiento interno: ${internal}ms`
} else {
pingText = `Procesamiento interno: ${internal}ms`
}
try {
await sock.sendMessage(from, { text: pingText }, { quoted: m })
} catch (e) {
emitLog(id, `error enviando ping: ${e?.message || e}`, 'error')
}
printIncomingLog(sock, id, m, text).catch(() => {})
continue
}
printIncomingLog(sock, id, m, text).catch(() => {})
await mainHandler(sock, m, text, { getActiveBots })
}
} catch (err) {
emitLog(id, `main.js error: ${err?.message || err}`, 'error')
}
})
sock.ev.on('group-participants.update', async (update) => {
try {
const { id, participants, action } = update;
const sessId = digits(sock.user?.id || '');

if (action === 'add' || action === 'remove') {
emitLog(sessId, `Grupo ${id}: ${action} - ${participants.join(', ')}`, 'info');
}
} catch (error) {
console.error('Error en group-participants.update:', error);
}
});
return sock
}
async function requestCode(idRaw, phoneRaw) {
const id = normalizePhone(idRaw || phoneRaw)
const num = normalizePhone(phoneRaw || idRaw)
const reqId = Math.random().toString(36).slice(-4).toUpperCase()

if (sessions[id]) {
await resetSession(id)
}

const sessionDir = path.join(SESSIONS_DIR, id)
if (fs.existsSync(sessionDir)) {
try {
fs.rmSync(sessionDir, { recursive: true, force: true })
emitLog(id, `[${reqId}] Sesión anterior eliminada`, 'info')
} catch (e) {
emitLog(id, `[${reqId}] Error eliminando sesión: ${e.message}`, 'error')
}
}

await startSession(id)
const sess = sessions[id]

try {
sess.inPairing = true
writeMeta(id, { lastCodeAt: Date.now() })
scheduleAbandonedCleanup(id)
emitLog(id, `[${reqId}] solicitando code para ${num} en ${PAIRING_DELAY_MS}ms…`, 'info')

await sleep(PAIRING_DELAY_MS)

if (!sessions[id]?.sock) {
emitLog(id, `[${reqId}] socket inexistente tras delay, recreando…`, 'warn')
await startSession(id)
}
const code = await sessions[id].sock.requestPairingCode(num, "NVV2CODE")
sess.status = 'code'
sess.code = code
sess.codeExpiresAt = Date.now() + CODE_TTL_MS
clearTimeout(sess.codeTimer)
sess.codeTimer = setTimeout(() => onCodeExpired(id), CODE_TTL_MS + 500)
emitLog(id, `[${reqId}] code recibido: ${formatCode(code)} (TTL ${Math.ceil(CODE_TTL_MS / 1000)}s)`, 'success')
return { status: 'code', code }
} catch (err) {
sess.status = 'error'
emitLog(id, `[${reqId}] ERROR solicitando code: ${err?.message || err}`, 'error')
return { status: 'error', code: null, error: String(err?.message || err) }
} finally {
sess.inPairing = false
}
}
async function getStatus(idRaw) {
const id = normalizePhone(idRaw)
const s = sessions[id]
if (!s) return 'offline'
if (s.sock?.authState?.creds?.registered && s.isOpen) return 'open'
return s.status || 'init'
}

async function resetSession(idRaw) {
const id = normalizePhone(idRaw)
const dir = path.join(SESSIONS_DIR, id)
try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
clearTimeout(sessions[id]?.cleanupTimer)
clearTimeout(sessions[id]?.codeTimer)
clearTimeout(sessions[id]?.reconnectTimer)
clearInterval(sessions[id]?.keepAliveTimer)
delete sessions[id]
emitLog(id, 'resetSession → sesión eliminada', 'warn')
return { ok: true }
}
async function deleteBotByNumber(phone) {
try {
const id = normalizePhone(phone)
const sessionDir = path.join(SESSIONS_DIR, id)

if (sessions[id]) {
clearTimeout(sessions[id]?.cleanupTimer)
clearTimeout(sessions[id]?.codeTimer)
clearTimeout(sessions[id]?.reconnectTimer)
clearInterval(sessions[id]?.keepAliveTimer)

if (sessions[id].sock) {
try {
await sessions[id].sock.ws.close()
} catch (e) {}
}

delete sessions[id]
emitLog(id, 'Sesión eliminada de memoria', 'info')
}

if (!fs.existsSync(sessionDir)) {
return { ok: false, message: 'Sesión no encontrada' }
}

try {
fs.rmSync(sessionDir, { recursive: true, force: true })
emitLog(id, `Carpeta de sesión eliminada: ${sessionDir}`, 'info')
} catch (fsError) {
emitLog(id, `Error eliminando carpeta: ${fsError.message}`, 'error')
return { ok: false, message: `Error eliminando carpeta: ${fsError.message}` }
}

if (fs.existsSync(sessionDir)) {
return { ok: false, message: 'La carpeta de sesión no pudo ser eliminada completamente' }
}

return { ok: true, message: `Sesión del número ${id} y todos sus archivos eliminados correctamente` }
} catch (e) {
const id = normalizePhone(phone)
emitLog(id, `Error en deleteBotByNumber: ${e.message}`, 'error')
return { ok: false, message: e.message }
}
}
function subscribeLogs(phone, handler) {
const id = normalizePhone(phone)
const listener = (evt) => { if (evt.id === id) handler(evt) }
logBus.on('log', listener)
return () => logBus.off('log', listener)
}

function mountLogsRoute(app, route = '/api/logs/:phone') {
app.get(route, (req, res) => {
let id
try { id = normalizePhone(req.params.phone) } catch (e) {
res.status(400).end('Número inválido')
return
}
res.set({
'Content-Type': 'text/event-stream',
'Cache-Control': 'no-cache',
'Connection': 'keep-alive',
'Access-Control-Allow-Origin': '*'
})
res.flushHeaders?.()
const send = (data) => {
if (data.id !== id) return
const payload = { ts: data.ts, at: nowFmt(data.ts), id: data.id, text: data.text, type: data.type }
res.write(`data: ${JSON.stringify(payload)}\n\n`)
}
const off = subscribeLogs(id, send)
res.write(`event: open\ndata: ${JSON.stringify({ id })}\n\n`)
const keep = setInterval(() => res.write(': ping\n\n'), 15000)
req.on('close', () => {
clearInterval(keep)
off()
res.end()
})
})
}

async function executeSocketMethod(phone, method, ...args) {
try {
const results = {
success: [],
errors: []
}

let targetSessions = []

if (phone === 'all') {
for (const id of Object.keys(sessions)) {
const s = sessions[id]
const reg = s?.sock?.authState?.creds?.registered || isRegisteredOnDisk(id)
if (reg && s?.isOpen && s.sock) {
targetSessions.push(id)
}
}
} else {
const id = normalizePhone(phone)
if (sessions[id] && sessions[id].isOpen && sessions[id].sock) {
targetSessions.push(id)
} else {
return {
ok: false,
message: `Sesión ${phone} no encontrada o no está activa`
}
}
}

if (targetSessions.length === 0) {
return {
ok: false,
message: 'No hay sesiones activas para ejecutar la acción'
}
}

for (const id of targetSessions) {
try {
const sock = sessions[id].sock

if (typeof sock[method] !== 'function') {
throw new Error(`Método '${method}' no disponible`)
}

const result = await sock[method](...args)

results.success.push({
id,
method,
result: result || 'Ejecutado correctamente'
})

emitLog(id, `Método ejecutado: ${method}`, 'success')

} catch (error) {
const errorMsg = `Error en sesión ${id}: ${error.message}`
results.errors.push({
id,
method,
error: errorMsg
})
emitLog(id, `Error en método ${method}: ${error.message}`, 'error')
}
}

return {
ok: true,
message: `Método ${method} ejecutado en ${results.success.length} sesiones`,
details: results
}

} catch (error) {
return {
ok: false,
message: `Error ejecutando método: ${error.message}`
}
}
}

function getAvailableSocketMethods(phone) {
try {
let targetSocket = null

if (phone === 'all') {
const firstActive = Object.keys(sessions).find(id =>
sessions[id]?.isOpen && sessions[id].sock
)
if (firstActive) {
targetSocket = sessions[firstActive].sock
}
} else {
const id = normalizePhone(phone)
if (sessions[id]?.sock) {
targetSocket = sessions[id].sock
}
}

if (!targetSocket) {
return { ok: false, message: 'No hay sockets activos disponibles' }
}

const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(targetSocket))
.filter(method => typeof targetSocket[method] === 'function' && method !== 'constructor')
.sort()

return {
ok: true,
methods: methods
}

} catch (error) {
return {
ok: false,
message: `Error obteniendo métodos: ${error.message}`
}
}
}

async function botinfo(phone) {
try {
const id = normalizePhone(phone);
const s = sessions[id];

if (!s || !s.sock) {
return {
ok: false,
message: 'Bot no encontrado o sesión no activa'
};
}

const sock = s.sock;
const status = await getStatus(id);

let profilePic;
try {
const botJid = sock.user?.id || `${id}@s.whatsapp.net`;
profilePic = await sock.profilePictureUrl(botJid, 'image');
} catch {
profilePic = 'https://github.com/Neveloopp.png';
}

const uptime = s.lastOpenAt ? Date.now() - s.lastOpenAt : 0;

let blockedUsers = [];
try {
blockedUsers = await sock.fetchBlocklist();
} catch (error) {
emitLog(id, `Error obteniendo lista de bloqueados: ${error.message}`, 'error')
}

function formatUptime(ms) {
const seconds = Math.floor(ms / 1000);
const minutes = Math.floor(seconds / 60);
const hours = Math.floor(minutes / 60);
const days = Math.floor(hours / 24);

if (days > 0) {
return `${days}d ${hours % 24}h ${minutes % 60}m`;
} else if (hours > 0) {
return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
} else if (minutes > 0) {
return `${minutes}m ${seconds % 60}s`;
} else {
return `${seconds}s`;
}
}

const botInfo = {
ok: true,
phone: id,
status: status,
profilePic: profilePic,
uptime: {
milliseconds: uptime,
formatted: formatUptime(uptime)
},
blockedUsers: {
count: blockedUsers.length,
list: blockedUsers
},
userInfo: {
name: sock.user?.name || sock.user?.verifiedName || 'Sin nombre',
jid: sock.user?.id || `${id}@s.whatsapp.net`
},
lastOpenAt: s.lastOpenAt ? new Date(s.lastOpenAt).toISOString() : null
};

return botInfo;

} catch (error) {
return {
ok: false,
message: `Error obteniendo información del bot: ${error.message}`
};
}
}

function subscribeAllLogs(handler) {
const listener = (evt) => handler(evt)
logBus.on('log', listener)
return () => logBus.off('log', listener)
}

module.exports = {
startSession,
requestCode,
getStatus,
resetSession,
formatCode,
bootstrapAll,
bootstrapOne,
deleteBotByNumber,
getActiveBots,
subscribeLogs,
mountLogsRoute,
executeSocketMethod,
getAvailableSocketMethods,
botinfo,
subscribeAllLogs
}