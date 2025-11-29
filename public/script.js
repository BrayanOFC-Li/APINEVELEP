const body = document.body
const themeBtn = document.getElementById('themeToggle')
const mobileMenuBtn = document.getElementById('mobileMenuBtn')
const sidebar = document.querySelector('.sidebar')

const savedTheme = localStorage.getItem('theme')
if(savedTheme === 'light') {
  body.classList.remove('dark')
  body.classList.add('light')
}

const setIcon = () => {
  themeBtn.innerHTML = body.classList.contains('dark') ? 
    '<i class="bi bi-moon-stars"></i>' : 
    '<i class="bi bi-sun"></i>'
}
setIcon()

themeBtn?.addEventListener('click', () => {
  if(body.classList.contains('dark')) {
    body.classList.replace('dark', 'light')
    localStorage.setItem('theme', 'light')
  } else {
    body.classList.replace('light', 'dark')
    localStorage.setItem('theme', 'dark')
  }
  setIcon()
})

let menuClickInProgress = false

mobileMenuBtn?.addEventListener('click', (e) => {
  e.stopPropagation()
  menuClickInProgress = true
  sidebar.classList.toggle('mobile-open')
  setTimeout(() => {
    menuClickInProgress = false
  }, 100)
})

function closeMobileMenu() {
  sidebar.classList.remove('mobile-open')
}

document.addEventListener('click', (e) => {
  if (menuClickInProgress) return
  
  if (sidebar.classList.contains('mobile-open') && 
      !sidebar.contains(e.target) && 
      e.target !== mobileMenuBtn) {
    closeMobileMenu()
  }
})

function notify(m, t = 'ok') {
  let n = document.getElementById('toast')
  if(!n) {
    n = document.createElement('div')
    n.id = 'toast'
    Object.assign(n.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      padding: '12px 14px',
      borderRadius: '14px',
      fontWeight: '800',
      boxShadow: '0 10px 25px rgba(0,0,0,.18)',
      zIndex: '9999',
      maxWidth: '80vw',
      color: '#0a0e17',
      border: '1px solid rgba(0,0,0,.08)'
    })
    document.body.appendChild(n)
  }
  n.style.background = t === 'err' ? '#ffd1dc' : t === 'warn' ? '#ffe9b8' : '#c8ffe9'
  n.textContent = m
  n.style.opacity = '0'
  n.style.transform = 'translateY(8px)'
  n.style.transition = 'all .2s ease'
  requestAnimationFrame(() => {
    n.style.opacity = '1'
    n.style.transform = 'translateY(0)'
  })
  clearTimeout(notify._t)
  notify._t = setTimeout(() => {
    n.style.opacity = '0'
    n.style.transform = 'translateY(8px)'
  }, 2400)
}

const $ = s => document.querySelector(s)
const phoneInput = $('#phone')
const labelInput = $('#label')
const sendBtn = $('#sendBtn')
const statusBox = $('#status')
const codeModal = $('#codeModal')
const modalClose = $('#modalClose')
const btnBack = $('#btnBack')
const digitsBox = $('#digits')
const kId = $('#kId')
const kCode = $('#kCode')
const kStatus = $('#kStatus')
const dlMeta = $('#dlMeta')
const tbody = $('#tbody')
const emptyMsg = $('#emptyMsg')
const refreshBtn = $('#refresh')
const searchInput = $('#search')
const kpiBots = $('#kpiBots')
const kpiOnline = $('#kpiOnline')
const kpiUpdated = $('#kpiUpdated')
const kpiTotal = $('#kpiTotal')
const kpiCoins = $('#kpiCoins')
const kpiDailyCoins = $('#kpiDailyCoins')
const dotOnline = $('#dotOnline')
const logsModal = $('#logsModal')
const logsOverlay = $('#logsOverlay')
const logsClose = $('#logsClose')
const logsCopy = $('#logsCopy')
const logsClear = $('#logsClear')
const logBox = $('#logBox')
const logTitle = $('#logTitle')
const logSub = $('#logSub')
const userName = $('#userName')
const userEmail = $('#userEmail')
const userRole = $('#userRole')
const adminLink = $('#adminLink')
const pageTitle = $('#pageTitle')
const profileUsername = $('#profileUsername')
const profileEmail = $('#profileEmail')
const profileApiKey = $('#profileApiKey')
const rotateKey = $('#rotateKey')
const syncAllBtn = $('#syncAllBtn')
const apiKeyExample = $('#api-key-example')

const botsListView = $('#botsListView')
const botDetailView = $('#botDetailView')
const serversGrid = $('#serversGrid')
const backToList = $('#backToList')
const detailBotName = $('#detailBotName')
const detailStatusDot = $('#detailStatusDot')
const detailStatusText = $('#detailStatusText')
const detailJid = $('#detailJid')
const detailName = $('#detailName')
const detailId = $('#detailId')
const detailLastSeen = $('#detailLastSeen')
const detailRestart = $('#detailRestart')
const detailPower = $('#detailPower')
const detailLogs = $('#detailLogs')
const detailDelete = $('#detailDelete')
const detailLogsContent = $('#detailLogsContent')
const viewAllLogs = $('#viewAllLogs')
const detailApagar = $('#detailApagar')
const detailEncender = $('#detailEncender')
const detailReiniciar = $('#detailReiniciar')
const detailHeader = $('#detailHeader')
const detailCustomize = $('#detailCustomize')

const customSection = $('#customSection')
const customBotInfo = $('#customBotInfo')
const customActions = $('#customActions')
const customName = $('#customName')
const customEmoji = $('#customEmoji')
const customWelcomeText = $('#customWelcomeText')
const customMediaUrls = $('#customMediaUrls')
const customMenuPhoto = $('#customMenuPhoto')
const customMenuText = $('#customMenuText')
const customBack = $('#customBack')
const customSave = $('#customSave')
const customLogs = $('#customLogs')
const customDelete = $('#customDelete')

let currentDetailBot = null
let currentConfigBot = null
let currentConfigData = null

const api = () => localStorage.getItem('apiKey') || ''

function hdr() {
  const h = {'content-type': 'application/json'}
  const key = api()
  if(key) h['x-api-key'] = key
  return h
}

async function getBotInfo(idDigits) {
  try {
    const r = await fetch(`/api/bot/info?phone=${encodeURIComponent(idDigits)}`, {
      headers: hdr(),
      credentials: 'include'
    })
    const j = await r.json()
    return j.ok ? j.bot : null
  } catch (e) {
    return null
  }
}

function renderDigits(str) {
  const cs = String(str || '').replace(/\s+/g, '').slice(0, 12)
  digitsBox.innerHTML = ''
  for(const ch of cs) {
    const d = document.createElement('div')
    d.className = 'digit'
    d.textContent = ch
    digitsBox.appendChild(d)
  }
}

function openModal(m) {
  m.classList.add('show')
  m.removeAttribute('aria-hidden')
}

function closeModal(m) {
  m.classList.remove('show')
  m.setAttribute('aria-hidden', 'true')
}

btnBack?.addEventListener('click', () => closeModal(codeModal))
modalClose?.addEventListener('click', () => closeModal(codeModal))

async function connect() {
  const phone = (phoneInput?.value || '').trim()
  const label = (labelInput?.value || '').trim()
  if(!phone) {
    notify('Ingresa un número válido', 'warn')
    return
  }
  statusBox.classList.remove('hidden')
  sendBtn.disabled = true
  try {
    const r = await fetch('/bots/connect', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include',
      body: JSON.stringify({phone, label})
    })
    const d = await r.json()
    statusBox.classList.add('hidden')
    sendBtn.disabled = false
    if(!d.ok) throw new Error(d.error || 'No se pudo generar el código')
    const raw = String(d.display || d.code || '')
    renderDigits(raw || '------')
    kId.textContent = d.id || d.phone || '—'
    kCode.textContent = raw || '—'
    kStatus.textContent = d.status || '—'
    dlMeta.textContent = d.status === 'already_linked' ? 'Ya vinculado' : 'Código generado'
    notify('Código generado', 'ok')
    openModal(codeModal)
    await loadBots()
  } catch(e) {
    statusBox.classList.add('hidden')
    sendBtn.disabled = false
    notify(e.message || 'Error de conexión', 'err')
  }
}

function createServerElement(bot) {
  const serverDiv = document.createElement('div')
  serverDiv.className = 'server-card'
  serverDiv.dataset.botId = bot.idDigits
  
  const status = (bot.liveStatus || bot.status || 'unknown').toLowerCase()
  const isOnline = status === 'open' || status === 'connected' || status === 'online'
  
  serverDiv.innerHTML = `
    <div class="server-header">
      <div class="server-avatar">
        <i class="bi bi-robot"></i>
      </div>
      <div class="server-info">
        <div class="server-name">${escapeHtml(bot.label || 'Sin nombre')}</div>
        <div class="server-jid">${escapeHtml(bot.jid || '')}</div>
        <div class="server-status">
          <span class="dot ${isOnline ? 'online' : 'offline'}"></span>
          <span>${isOnline ? 'En línea' : 'Desconectado'}</span>
        </div>
      </div>
    </div>
  `
  
  setTimeout(async () => {
    try {
      const botInfo = await getBotInfo(bot.idDigits)
      if (botInfo && botInfo.profilePic) {
        const avatar = serverDiv.querySelector('.server-avatar')
        if (avatar) {
          avatar.innerHTML = ''
          avatar.style.backgroundImage = `url(${botInfo.profilePic})`
          avatar.style.backgroundSize = 'cover'
          avatar.style.backgroundPosition = 'center'
          avatar.style.backgroundRepeat = 'no-repeat'
        }
      }
    } catch (error) {
    }
  }, 100)
  
  serverDiv.addEventListener('click', function(e) {
    e.preventDefault()
    e.stopPropagation()
    showBotDetail(bot)
  })
  
  serverDiv.style.cursor = 'pointer'
  
  return serverDiv
}

async function showBotDetail(bot) {
  botsListView.classList.add('hidden')
  botDetailView.classList.remove('hidden')
  
  const existingAvatar = detailHeader.querySelector('.detail-avatar')
  if (existingAvatar) {
    existingAvatar.remove()
  }
  
  detailBotName.textContent = bot.label || 'Sin nombre'
  detailJid.textContent = bot.jid || '—'
  detailName.textContent = bot.label || '—'
  detailId.textContent = bot.idDigits || '—'
  
  const status = (bot.liveStatus || bot.status || 'unknown').toLowerCase()
  const isOnline = status === 'open' || status === 'connected' || status === 'online'
  detailStatusDot.className = `dot ${isOnline ? 'online' : 'offline'}`
  detailStatusText.textContent = isOnline ? 'En línea' : 'Desconectado'
  
  try {
    const botInfo = await getBotInfo(bot.idDigits)
    if (botInfo) {
      if (botInfo.userInfo?.name) {
        detailBotName.textContent = botInfo.userInfo.name
        detailName.textContent = botInfo.userInfo.name
      }
      if (botInfo.userInfo?.jid) {
        detailJid.textContent = botInfo.userInfo.jid
      }
      
      const uptime = botInfo.uptime?.formatted || '—'
      detailLastSeen.textContent = `Activo: ${uptime}`
      
      if (botInfo.profilePic && detailHeader) {
        const avatarDiv = document.createElement('div')
        avatarDiv.className = 'detail-avatar'
        avatarDiv.style.backgroundImage = `url(${botInfo.profilePic})`
        avatarDiv.style.backgroundSize = 'cover'
        avatarDiv.style.backgroundPosition = 'center'
        detailHeader.insertBefore(avatarDiv, detailHeader.querySelector('.detail-header-content'))
      }
      updateBotDetailInfo(botInfo)
    }
  } catch (error) {
    detailLastSeen.textContent = new Date().toLocaleString()
  }
  
  loadBotLogs(bot.idDigits)
  currentDetailBot = bot
}

function updateBotDetailInfo(botInfo) {
  let extendedInfo = document.querySelector('.detail-extended-info')
  if (!extendedInfo) {
    extendedInfo = document.createElement('div')
    extendedInfo.className = 'detail-extended-info'
    extendedInfo.innerHTML = `
      <h5>Información Extendida</h5>
      <div class="extended-info-grid"></div>
    `
    document.querySelector('.detail-content').insertBefore(extendedInfo, document.querySelector('.detail-actions'))
  }
  
  const grid = extendedInfo.querySelector('.extended-info-grid')
  grid.innerHTML = `
    <div class="info-item">
      <label>Foto de Perfil:</label>
      <span>${botInfo.profilePic ? '✅ Disponible' : '❌ No disponible'}</span>
    </div>
    <div class="info-item">
      <label>Tiempo Activo:</label>
      <span>${botInfo.uptime?.formatted || '—'}</span>
    </div>
    <div class="info-item">
      <label>Usuarios Bloqueados:</label>
      <span>${botInfo.blockedUsers?.count || 0}</span>
    </div>
    <div class="info-item">
      <label>Estado:</label>
      <span>${botInfo.status || '—'}</span>
    </div>
    <div class="info-item">
      <label>Última Conexión:</label>
      <span>${botInfo.lastOpenAt ? new Date(botInfo.lastOpenAt).toLocaleString() : '—'}</span>
    </div>
  `
}

function loadBotLogs(botId) {
  const logs = getBotLogs(botId)
  detailLogsContent.innerHTML = ''
  
  if (logs.length === 0) {
    detailLogsContent.innerHTML = '<div class="log-entry">No hay logs recientes</div>'
    return
  }
  
  const recentLogs = logs.slice(-10)
  recentLogs.forEach(log => {
    const logEntry = document.createElement('div')
    logEntry.className = 'log-entry'
    const ts = new Date(log.ts || Date.now()).toLocaleTimeString()
    logEntry.innerHTML = `
      <div class="log-time">[${escapeHtml(ts)}]</div>
      <div class="log-message ${getLogLevelClass(log.text)}">${escapeHtml(log.text || '')}</div>
    `
    detailLogsContent.appendChild(logEntry)
  })
}

function getBotLogs(botId) {
  try {
    const logs = localStorage.getItem(`bot_logs_${botId}`)
    return logs ? JSON.parse(logs) : []
  } catch {
    return []
  }
}

function saveBotLog(botId, logEntry) {
  const logs = getBotLogs(botId)
  logs.push({
    ts: Date.now(),
    text: logEntry.text,
    level: logEntry.level
  })
  
  if (logs.length > 100) {
    logs.splice(0, logs.length - 100)
  }
  
  localStorage.setItem(`bot_logs_${botId}`, JSON.stringify(logs))
}

function clearBotLogs(botId) {
  localStorage.removeItem(`bot_logs_${botId}`)
}

async function loadBots() {
  try {
    serversGrid.innerHTML = '<div class="skeleton" style="height:100px"></div>'.repeat(4)
    emptyMsg.classList.add('hidden')
    
    const r = await fetch('/bots', {headers: hdr(), credentials: 'include'})
    const j = await r.json()
    
    serversGrid.innerHTML = ''
    if(!j.ok) throw new Error(j.error || 'Error')
    
    const list = (j.bots || [])
    if(!list.length) {
      emptyMsg.classList.remove('hidden')
    } else {
      list.forEach(bot => {
        serversGrid.appendChild(createServerElement(bot))
      })
    }
    
    const online = list.filter(bot => {
      const status = (bot.liveStatus || bot.status || '').toLowerCase()
      return status === 'open' || status === 'connected' || status === 'online'
    }).length
    
    kpiBots.textContent = `Bots Activos: ${list.length}`
    kpiOnline.innerHTML = `<span class="dot ${online > 0 ? 'online' : ''}"></span> En Línea: ${online}`
    kpiUpdated.innerHTML = `<i class="bi bi-arrow-repeat"></i> Última Actualización: ${new Date().toLocaleTimeString()}`
    
  } catch(e) {
    serversGrid.innerHTML = ''
    notify(e.message || 'Error al cargar bots', 'err')
  }
}

function applyFilter() {
  const q = (searchInput?.value || '').toLowerCase().trim()
  const servers = [...serversGrid.querySelectorAll('.server-card')]
  let visible = 0
  
  servers.forEach(server => {
    const name = (server.querySelector('.server-name')?.textContent || '').toLowerCase()
    const jid = (server.querySelector('.server-jid')?.textContent || '').toLowerCase()
    const hit = !q || name.includes(q) || jid.includes(q)
    
    server.style.display = hit ? 'block' : 'none'
    if(hit) visible++
  })
  
  emptyMsg.classList.toggle('hidden', !!visible)
}

async function checkStatus(idDigits) {
  try {
    const r = await fetch('/bots/status?phone=' + encodeURIComponent(idDigits), {
      headers: hdr(), 
      credentials: 'include'
    })
    const j = await r.json()
    if(!j.ok) throw new Error(j.error || 'Error')
    notify('Estado: ' + (j.status || '—'), 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'No se pudo obtener el estado', 'err')
  }
}

async function resetBot(idDigits) {
  try {
    const r = await fetch('/bots/reset', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include',
      body: JSON.stringify({phone: idDigits})
    })
    const j = await r.json()
    if(!j.ok) throw new Error(j.error || 'No se pudo reiniciar')
    notify('Bot reiniciado', 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'Error al reiniciar', 'err')
  }
}

async function apagarBot(idDigits) {
  try {
    const r = await fetch('/api/bot/apagar', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include',
      body: JSON.stringify({phone: idDigits})
    })
    const j = await r.json()
    if(!j.ok) throw new Error(j.error || 'No se pudo apagar')
    notify('Bot apagado', 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'Error al apagar', 'err')
  }
}

async function encenderBot(idDigits) {
  try {
    const r = await fetch('/api/bot/encender', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include',
      body: JSON.stringify({phone: idDigits})
    })
    const j = await r.json()
    if(!j.ok) throw new Error(j.error || 'No se pudo encender')
    notify('Bot encendido', 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'Error al encender', 'err')
  }
}

async function reiniciarBot(idDigits) {
  try {
    const r = await fetch('/api/bot/reiniciar', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include',
      body: JSON.stringify({phone: idDigits})
    })
    const j = await r.json()
    if(!j.ok) throw new Error(j.error || 'No se pudo reiniciar')
    notify('Bot reiniciado', 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'Error al reiniciar', 'err')
  }
}

async function delBot(idDigits) {
  if(!confirm('¿Eliminar este bot de tu cuenta?')) return
  try {
    const r = await fetch('/bots?phone=' + encodeURIComponent(idDigits) + '&reset=true', {
      method: 'DELETE',
      headers: hdr(),
      credentials: 'include'
    })
    const j = await r.json()
    if(!j.ok) throw new Error(j.error || 'No se pudo eliminar')
    notify('Bot eliminado', 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'Error al eliminar', 'err')
  }
}

async function updateGlobalTotal() {
  try {
    const r = await fetch('/bots/total', {headers: hdr()})
    const j = await r.json()
    if(j.ok && j.total >= 0) {
      kpiTotal.innerHTML = `<i class="bi bi-globe2"></i> Total Global: ${j.total.toLocaleString()}`
    } else {
      kpiTotal.innerHTML = `<i class="bi bi-globe2"></i> Total Global: —`
    }
  } catch(e) {
    kpiTotal.innerHTML = `<i class="bi bi-globe2"></i> Total Global: —`
  }
}

async function syncAllBots() {
  try {
    if(syncAllBtn) syncAllBtn.disabled = true
    const r = await fetch('/api/bots/sync-all', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include'
    })
    const j = await r.json()
    if(!j.ok) throw new Error(j.error || 'Error al sincronizar')
    notify(`Sincronizados ${j.updated || 0} bots`, 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'Error al sincronizar', 'err')
  } finally {
    if(syncAllBtn) syncAllBtn.disabled = false
  }
}

async function loadUserInfo() {
  try {
    const r = await fetch('/api/user-info', {headers: hdr(), credentials: 'include'})
    const j = await r.json()

    const hasData = j && (j.username || j.email || j.apiKey || typeof j.coins !== 'undefined')

    if (hasData) {
      if (userName && j.username) userName.textContent = j.username
      if (userEmail && j.email) userEmail.textContent = j.email
      if (userRole) userRole.textContent = j.role || 'user'

      if (profileUsername && j.username) profileUsername.value = j.username
      if (profileEmail && j.email) profileEmail.value = j.email
      if (profileApiKey && j.apiKey) profileApiKey.value = j.apiKey

      if (apiKeyExample) apiKeyExample.textContent = j.apiKey || 'TU_API_KEY_AQUÍ'

      const coins = (typeof j.coins === 'number') ? j.coins : (j.coins || 0)
      const daily = (typeof j.dailyCoins === 'number') ? j.dailyCoins : (j.dailyCoins || 100)

      if (kpiCoins) kpiCoins.textContent = `Coins: ${coins}`
      if (kpiDailyCoins) kpiDailyCoins.textContent = `Coins Diarios: ${daily}`

      if (j.role === 'admin' && adminLink) {
        adminLink.classList.remove('hidden')
      }
    }
  } catch(e) {
  }
}

async function rotateApiKey() {
  if(!confirm('¿Estás seguro de que quieres rotar tu API Key? Esto invalidará la clave actual.')) return
  try {
    const r = await fetch('/key/rotate', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include'
    })
    const j = await r.json()
    if(j.ok && j.apiKey) {
      profileApiKey.value = j.apiKey
      apiKeyExample.textContent = j.apiKey
      localStorage.setItem('apiKey', j.apiKey)
      
      notify('API Key rotada correctamente. Recargando...', 'ok')
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } else {
      throw new Error(j.error || 'Error al rotar la clave')
    }
  } catch(e) {
    notify(e.message || 'Error al rotar la API Key', 'err')
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]))
}

function getLogLevelClass(text) {
  const t = String(text || '').toLowerCase()
  if(t.includes('error') || t.includes('fail')) return 'log-error'
  if(t.includes('warn')) return 'log-warn'
  if(t.includes('info')) return 'log-info'
  if(t.includes('success') || t.includes('done')) return 'log-success'
  if(t.includes('debug')) return 'log-debug'
  return ''
}

let sock = null
let logsOpen = false
let currentLogPhone = null

function ensureSocket(phone) {
  const key = api()
  if(!sock) {
    sock = io({auth: {key, phone}})
    sock.on('open', () => {})
    sock.on('log', (p) => {
      if(!logsOpen || p.id !== currentLogPhone) return
      appendLog(p)
    })
    sock.on('connect_error', (e) => {
      notify(e.message || 'Error de socket', 'err')
    })
  } else {
    if(phone) sock.emit('subscribe', {phone})
  }
}

function openLogsModal() {
  logsModal.classList.add('show')
  logsModal.removeAttribute('aria-hidden')
  logsOpen = true
}

function closeLogsModal() {
  logsModal.classList.remove('show')
  logsModal.setAttribute('aria-hidden', 'true')
  logsOpen = false
}

function appendLog(p) {
  const line = document.createElement('div')
  line.className = 'logline ' + getLogLevelClass(p.text)
  const ts = new Date(p.ts || Date.now()).toLocaleTimeString()
  line.innerHTML = `<b>[${escapeHtml(ts)}]</b> ${escapeHtml(p.text || '')}`
  logBox.appendChild(line)
  logBox.scrollTop = logBox.scrollHeight
  
  if (currentLogPhone) {
    saveBotLog(currentLogPhone, {
      text: p.text,
      level: getLogLevelClass(p.text)
    })
  }
}

function viewLogs(bot) {
  currentLogPhone = bot.idDigits
  logsOpen = true
  logTitle.textContent = 'Logs del Bot'
  logSub.textContent = (bot.jid || '—') + (bot.label ? (' — ' + bot.label) : '')
  logBox.innerHTML = ''
  ensureSocket(bot.idDigits)
  openLogsModal()
}

function switchSection(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  
  document.getElementById(sectionName + 'Section').classList.remove('hidden')
  document.querySelector(`[data-section="${sectionName}"]`).classList.add('active')
  
  const titles = {
    panel: 'Panel Principal',
    connect: 'Conectar Bot',
    bots: 'Gestión de Bots',
    docs: 'Documentación',
    profile: 'Mi Perfil'
  }
  pageTitle.textContent = titles[sectionName] || 'Dashboard'
  
  if(window.innerWidth <= 992) {
    closeMobileMenu()
  }
  
  window.location.hash = sectionName
}

function initHashNavigation() {
  const hash = window.location.hash.substring(1)
  const validSections = ['panel', 'connect', 'bots', 'docs', 'profile']
  
  if (hash && validSections.includes(hash)) {
    switchSection(hash)
  } else {
    switchSection('panel')
  }
}

async function loadBotConfig(idDigits) {
  try {
    const r = await fetch(`/api/bot/config?phone=${encodeURIComponent(idDigits)}`, {
      headers: hdr(),
      credentials: 'include'
    })
    const j = await r.json()
    if (!j.ok) throw new Error(j.error || 'No se pudo cargar la configuración')
    const cfg = j.config
    currentConfigData = cfg
    customName.value = cfg.bot?.name || ''
    customEmoji.value = cfg.bot?.emoji || ''
    customWelcomeText.value = cfg.menu?.welcomeText || ''
    const media = cfg.menu?.mediaUrls || []
    customMediaUrls.value = Array.isArray(media) ? media.join(' | ') : ''
    customMenuText.value = cfg.menu?.menuText || ''
    customMenuPhoto.value = cfg.bot?.menuPhoto || ''
  } catch(e) {
    notify(e.message || 'Error al cargar la configuración', 'err')
  }
}

async function saveBotConfig() {
  if (!currentConfigBot) {
    notify('No hay bot seleccionado', 'warn')
    return
  }
  
  const phone = currentConfigBot.idDigits
  const bot = {
    name: customName.value.trim(),
    emoji: customEmoji.value.trim(),
    menuPhoto: customMenuPhoto.value.trim()
  }
  
  const welcomeText = customWelcomeText.value.trim()
  const urlsRaw = customMediaUrls.value.split('|').map(x => x.trim()).filter(Boolean)
  const menu = {}

  if (welcomeText) menu.welcomeText = welcomeText
  if (urlsRaw.length) menu.mediaUrls = urlsRaw

  const fullMenuText = customMenuText.value.trim()
  if (fullMenuText) menu.menuText = fullMenuText
  
  try {
    const r = await fetch('/api/bot/config/edit', {
      method: 'POST',
      headers: hdr(),
      credentials: 'include',
      body: JSON.stringify({phone, bot, menu})
    })
    const j = await r.json()
    if (!j.ok) throw new Error(j.error || 'No se pudo guardar la configuración')
    notify('Configuración actualizada', 'ok')
    await loadBots()
  } catch(e) {
    notify(e.message || 'Error al guardar la configuración', 'err')
  }
}

function openCustomize(bot) {
  currentConfigBot = bot
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'))
  customSection.classList.remove('hidden')
  pageTitle.textContent = 'Personalizar Bot'
  customBotInfo.textContent = (bot.jid || '—') + (bot.label ? (' — ' + bot.label) : '')
  customActions.style.display = 'flex'
  loadBotConfig(bot.idDigits)
}

document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault()
    const section = item.getAttribute('data-section')
    if(section !== 'admin') {
      switchSection(section)
    }
  })
})

window.addEventListener('hashchange', function() {
  const hash = window.location.hash.substring(1)
  const validSections = ['panel', 'connect', 'bots', 'docs', 'profile']
  
  if (hash && validSections.includes(hash)) {
    switchSection(hash)
  }
})

logsOverlay?.addEventListener('click', closeLogsModal)
logsClose?.addEventListener('click', closeLogsModal)
logsClear?.addEventListener('click', () => { logBox.innerHTML = '' })


backToList?.addEventListener('click', () => {
  botDetailView.classList.add('hidden')
  botsListView.classList.remove('hidden')
  
  const existingAvatar = detailHeader.querySelector('.detail-avatar')
  if (existingAvatar) {
    existingAvatar.remove()
  }
  
  const extendedInfo = document.querySelector('.detail-extended-info')
  if (extendedInfo) {
    extendedInfo.remove()
  }
  
  currentDetailBot = null
})

detailRestart?.addEventListener('click', () => {
  if (currentDetailBot) {
    resetBot(currentDetailBot.idDigits)
  }
})

detailApagar?.addEventListener('click', () => {
  if (currentDetailBot) {
    apagarBot(currentDetailBot.idDigits)
  }
})

detailEncender?.addEventListener('click', () => {
  if (currentDetailBot) {
    encenderBot(currentDetailBot.idDigits)
  }
})

detailReiniciar?.addEventListener('click', () => {
  if (currentDetailBot) {
    reiniciarBot(currentDetailBot.idDigits)
  }
})

detailLogs?.addEventListener('click', () => {
  if (currentDetailBot) {
    viewLogs(currentDetailBot)
  }
})

detailDelete?.addEventListener('click', () => {
  if (currentDetailBot) {
    delBot(currentDetailBot.idDigits)
    botDetailView.classList.add('hidden')
    botsListView.classList.remove('hidden')
  }
})

viewAllLogs?.addEventListener('click', () => {
  if (currentDetailBot) {
    viewLogs(currentDetailBot)
  }
})

detailCustomize?.addEventListener('click', () => {
  if (currentDetailBot) {
    openCustomize(currentDetailBot)
  }
})

customBack?.addEventListener('click', () => {
  currentConfigBot = null
  customActions.style.display = 'none'
  customName.value = ''
  customEmoji.value = ''
  customWelcomeText.value = ''
  customMediaUrls.value = ''
  switchSection('bots')
})

customSave?.addEventListener('click', () => {
  saveBotConfig()
})

customLogs?.addEventListener('click', () => {
  if (currentConfigBot) {
    viewLogs(currentConfigBot)
  }
})

customDelete?.addEventListener('click', () => {
  if (currentConfigBot) {
    delBot(currentConfigBot.idDigits)
    currentConfigBot = null
    switchSection('bots')
  }
})

sendBtn?.addEventListener('click', connect)
refreshBtn?.addEventListener('click', loadBots)
searchInput?.addEventListener('input', applyFilter)
rotateKey?.addEventListener('click', rotateApiKey)
syncAllBtn?.addEventListener('click', syncAllBots)

phoneInput?.addEventListener('keypress', (e) => {
  if(e.key === 'Enter') connect()
})

labelInput?.addEventListener('keypress', (e) => {
  if(e.key === 'Enter') connect()
})

;(async function init() {
  initHashNavigation()
  await loadUserInfo()
  await loadBots()
  updateGlobalTotal()
  setInterval(updateGlobalTotal, 30000)
  setInterval(loadBots, 60000)
})()