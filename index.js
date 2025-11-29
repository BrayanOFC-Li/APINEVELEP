const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const cookieParser = require('cookie-parser')
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const baileys = require('./baileys')
const { getFullBotConfig } = require('./main')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())
const PORT = process.env.PORT || 80

const DATA_DIR = path.join(__dirname, 'data')
const USERS_PATH = path.join(DATA_DIR, 'users.json')
const SYSTEM_PATH = path.join(DATA_DIR, 'system.json')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(USERS_PATH)) fs.writeFileSync(USERS_PATH, JSON.stringify({ users: [] }, null, 2))
if (!fs.existsSync(SYSTEM_PATH)) fs.writeFileSync(SYSTEM_PATH, JSON.stringify({ monthlyCoinsLimit: 500 }, null, 2))

const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_PATH, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return { users: [] }
  }
}

const readSystem = () => {
  try {
    const data = fs.readFileSync(SYSTEM_PATH, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    return { monthlyCoinsLimit: 500 }
  }
}

const writeUsers = (data) => {
  const tmp = USERS_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, USERS_PATH)
}

const writeSystem = (data) => {
  const tmp = SYSTEM_PATH + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, SYSTEM_PATH)
}

const newId = (prefix='u') => `${prefix}_${crypto.randomBytes(6).toString('hex')}`
const newKey = () => `sk_${crypto.randomBytes(24).toString('hex')}`
const normalizePhone = (s='') => String(s).replace(/[^\d]/g, '')
const jidFromDigits = (d='') => `${d}@s.whatsapp.net`

const getCurrentMonth = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const publicUser = (u) => { 
  const system = readSystem()
  return {
    id: u.id, 
    email: u.email, 
    username: u.username, 
    apiKey: u.apiKey, 
    role: u.role || 'user',
    coins: u.coins || system.monthlyCoinsLimit,
    monthlyCoinsLimit: system.monthlyCoinsLimit,
    bots: (u.bots || []).map(b => ({ 
      idDigits: b.idDigits, 
      jid: b.jid, 
      label: b.label || null, 
      status: b.status || 'unknown', 
      createdAt: b.createdAt, 
      updatedAt: b.updatedAt 
    })) 
  }
}

const findUserByEmailOrUsername = (db, id) => { 
  const key = String(id || '').toLowerCase()
  return db.users.find(u => u.email.toLowerCase() === key || u.username.toLowerCase() === key) 
}

const findUserByKey = (db, key) => db.users.find(u => u.apiKey === key)
const findBotIdx = (u, idDigits) => {
  if (!u || !u.bots || !Array.isArray(u.bots)) return -1
  return u.bots.findIndex(b => b && b.idDigits === idDigits)
}

const updateBotStatus = (idDigits, status, label = null) => {
  try {
    const db = readUsers()
    let updated = false
    
    db.users.forEach(user => {
      const botIdx = findBotIdx(user, idDigits)
      if (botIdx !== -1) {
        user.bots[botIdx].status = status
        user.bots[botIdx].updatedAt = new Date().toISOString()
        if (label && !user.bots[botIdx].label) {
          user.bots[botIdx].label = label
        }
        updated = true
      }
    })
    
    if (updated) {
      writeUsers(db)
    }
    
    return updated
  } catch (error) {
    return false
  }
}

const getUserFromCookies = (req, res) => {
  const { email, key } = req.cookies
  if (!email || !key) return null
  
  const db = readUsers()
  const user = db.users.find(u => u.email === email && u.apiKey === key)
  
  if (!user) {
    res.clearCookie("email")
    res.clearCookie("key")
    return null
  }
  
  return user
}

const getUserFromApiKey = (req) => {
  const apiKey = req.get('x-api-key') || req.query.key || req.body.key
  if (!apiKey) return null
  
  const db = readUsers()
  const user = findUserByKey(db, apiKey)
  return user
}

const requireAuth = (req, res, next) => {
  const user = getUserFromCookies(req, res) || getUserFromApiKey(req)
  if (!user) return res.redirect('/login')
  req.user = user
  next()
}

const requireAuthApi = (req, res, next) => {
  const user = getUserFromApiKey(req)
  if (!user) return res.status(401).json({ ok: false, error: 'API key inválida o faltante' })
  req.user = user
  next()
}

const requireAdmin = (req, res, next) => {
  const user = getUserFromCookies(req, res) || getUserFromApiKey(req)
  if (!user) return res.status(401).json({ error: "No autorizado" })
  if (user.role !== "admin") return res.status(403).json({ error: "No autorizado" })
  req.user = user
  next()
}

const requireApiKey = (req, res, next) => { 
  const apiKey = req.get('x-api-key') || req.query.key || req.body.key
  if (!apiKey) return res.status(401).json({ ok: false, error: 'Falta API key' }) 
  
  const db = readUsers()
  const user = findUserByKey(db, apiKey)
  if (!user) return res.status(401).json({ ok: false, error: 'API key inválida' }) 
  
  if (user.role !== 'admin') {
    const system = readSystem()
    const currentMonth = getCurrentMonth()
    
    if (user.lastCoinReset !== currentMonth) {
      user.coins = system.monthlyCoinsLimit
      user.lastCoinReset = currentMonth
      writeUsers(db)
    }
    
    if (user.coins <= 0) {
      return res.status(429).json({ ok: false, error: 'Coins mensuales agotados' })
    }
    
    user.coins--
    writeUsers(db)
  }
  
  req.db = db
  req.user = user
  next()
}

const getMaxBotsForUser = (user) => {
  return user.role === 'admin' ? Infinity : 2
}

const syncUserBotsStatus = async (user) => {
  try {
    if (!user.bots || user.bots.length === 0) return user;
    
    const updatedBots = await Promise.all(user.bots.map(async (bot) => {
      try {
        const currentStatus = await baileys.getStatus(bot.idDigits);
        if (currentStatus && currentStatus !== bot.status) {
          return {
            ...bot,
            status: currentStatus,
            updatedAt: new Date().toISOString()
          };
        }
        return bot;
      } catch (error) {
        return bot;
      }
    }));
    
    const hasChanges = updatedBots.some((bot, index) => bot.status !== user.bots[index].status);
    if (hasChanges) {
      const db = readUsers();
      const dbUser = db.users.find(u => u.id === user.id);
      if (dbUser) {
        dbUser.bots = updatedBots;
        writeUsers(db);
      }
    }
    
    return { ...user, bots: updatedBots };
  } catch (error) {
    return user;
  }
};

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')))
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')))
app.get('/login', (req, res) => {
  const user = getUserFromCookies(req, res) || getUserFromApiKey(req)
  if (user) return res.redirect('/dash')
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
})
app.get('/signup', (req, res) => {
  const user = getUserFromCookies(req, res) || getUserFromApiKey(req)
  if (user) return res.redirect('/dash')
  res.sendFile(path.join(__dirname, 'public', 'signup.html'))
})
app.get('/dash', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dash.html'))
})
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'))
})

app.get('/api/system/config', requireAdmin, (req, res) => {
  try {
    const system = readSystem()
    res.json({ ok: true, config: system })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/all-logs', requireAdmin, async (req, res) => {
  try {
    res.set({ 
      'Content-Type': 'text/event-stream', 
      'Cache-Control': 'no-cache', 
      'Connection': 'keep-alive', 
      'Access-Control-Allow-Origin': '*' 
    })
    res.flushHeaders()
    
    const send = (evt) => {
      const payload = { 
        ts: evt.ts, 
        at: new Date(evt.ts).toISOString(), 
        id: evt.id, 
        text: evt.text, 
        type: evt.type 
      }
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }
    
    const off = baileys.subscribeAllLogs(send)
    
    res.write(`event: open\ndata: ${JSON.stringify({ message: 'Conectado a todos los logs del sistema' })}\n\n`)
    
    const keep = setInterval(() => res.write(': ping\n\n'), 15000)
    
    req.on('close', () => {
      clearInterval(keep)
      off()
      res.end()
    })
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.post('/api/system/config/monthly-coins', requireAdmin, (req, res) => {
  try {
    const { monthlyCoinsLimit } = req.body || {}
    if (!monthlyCoinsLimit || monthlyCoinsLimit < 0) {
      return res.status(400).json({ ok: false, error: 'Límite mensual de coins inválido' })
    }

    const system = readSystem()
    system.monthlyCoinsLimit = Number(monthlyCoinsLimit)
    writeSystem(system)

    const db = readUsers()
    const currentMonth = getCurrentMonth()
    
    db.users.forEach(user => {
      if (user.role !== 'admin') {
        if (user.lastCoinReset !== currentMonth) {
          user.coins = system.monthlyCoinsLimit
          user.lastCoinReset = currentMonth
        }
      }
    })
    
    writeUsers(db)

    res.json({ 
      ok: true, 
      message: `Límite mensual de coins actualizado a ${monthlyCoinsLimit} para todos los usuarios`,
      config: system 
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/user-info', requireAuthApi, async (req, res) => {
  let user = req.user;
  const system = readSystem()
  const currentMonth = getCurrentMonth();
  
  if (user.lastCoinReset !== currentMonth && user.role !== 'admin') {
    user.coins = system.monthlyCoinsLimit;
    user.lastCoinReset = currentMonth;
    
    const db = readUsers();
    const dbUser = db.users.find(u => u.id === user.id);
    if (dbUser) {
      dbUser.coins = user.coins;
      dbUser.lastCoinReset = user.lastCoinReset;
      writeUsers(db);
    }
  }
  
  user = await syncUserBotsStatus(user);
  
  res.json({
    username: user.username,
    email: user.email,
    role: user.role || 'user',
    apiKey: user.apiKey,
    coins: user.coins || system.monthlyCoinsLimit,
    monthlyCoinsLimit: system.monthlyCoinsLimit,
    bots: user.bots || []
  });
})

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const db = readUsers()
  const system = readSystem()
  const users = db.users.map(u => ({
    username: u.username,
    email: u.email,
    role: u.role || 'user',
    coins: u.coins || system.monthlyCoinsLimit,
    monthlyCoinsLimit: system.monthlyCoinsLimit,
    bots: u.bots || [],
    lastCoinReset: u.lastCoinReset
  }))
  
  res.json({ users })
})

app.post('/api/admin/add-coins', requireAdmin, (req, res) => {
  const { email, amount } = req.body
  if (!email || !amount) return res.status(400).json({ error: 'Faltan parámetros' })
  
  const db = readUsers()
  const user = db.users.find(u => u.email === email)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  
  user.coins = (user.coins || 0) + Number(amount)
  writeUsers(db)
  
  res.json({ message: `Se agregaron ${amount} coins a ${email}`, coins: user.coins })
})

app.post('/api/admin/remove-coins', requireAdmin, (req, res) => {
  const { email, amount } = req.body
  if (!email || !amount) return res.status(400).json({ error: 'Faltan parámetros' })
  
  const db = readUsers()
  const user = db.users.find(u => u.email === email)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  
  user.coins = Math.max(0, (user.coins || 0) - Number(amount))
  writeUsers(db)
  
  res.json({ message: `Se removieron ${amount} coins de ${email}`, coins: user.coins })
})

app.post('/api/admin/set-monthly-coins', requireAdmin, (req, res) => {
  const { email, amount } = req.body
  if (!email || !amount) return res.status(400).json({ error: 'Faltan parámetros' })
  
  const db = readUsers()
  const user = db.users.find(u => u.email === email)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  
  const system = readSystem()
  user.coins = Math.min(Number(amount), system.monthlyCoinsLimit)
  writeUsers(db)
  
  res.json({ message: `Coins establecidos en ${amount} para ${email}`, coins: user.coins })
})

app.post('/api/admin/make-admin', requireAdmin, (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Falta email' })
  
  const db = readUsers()
  const user = db.users.find(u => u.email === email)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  
  user.role = 'admin'
  writeUsers(db)
  
  res.json({ message: `${email} ahora es admin` })
})

app.post('/api/admin/remove-admin', requireAdmin, (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Falta email' })
  
  const db = readUsers()
  const user = db.users.find(u => u.email === email)
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  
  user.role = 'user'
  writeUsers(db)
  
  res.json({ message: `${email} ya no es admin` })
})

app.post('/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body || {}
    if (!email || !username || !password) return res.status(400).json({ ok: false, error: 'email, username y password requeridos' })
    
    const db = readUsers()
    const system = readSystem()
    
    if (db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase())) return res.status(409).json({ ok: false, error: 'email ya registrado' })
    if (db.users.find(u => u.username.toLowerCase() === String(username).toLowerCase())) return res.status(409).json({ ok: false, error: 'username no disponible' })
    
    const hash = await bcrypt.hash(String(password), 10)
    const user = { 
      id: newId('u'), 
      email: String(email).toLowerCase(), 
      username: String(username).toLowerCase(), 
      passwordHash: hash, 
      apiKey: newKey(), 
      role: 'user',
      coins: system.monthlyCoinsLimit,
      lastCoinReset: getCurrentMonth(),
      bots: [] 
    }
    
    db.users.push(user)
    writeUsers(db)

    const ONE_YEAR = 1000 * 60 * 60 * 24 * 365
    res.cookie("email", user.email, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR
    })
    res.cookie("key", user.apiKey, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR
    })

    res.json({ ok: true, user: publicUser(user) })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ ok: false, error: 'email y password requeridos' })
    
    const db = readUsers()
    const system = readSystem()
    const user = findUserByEmailOrUsername(db, email)
    if (!user) return res.status(401).json({ ok: false, error: 'credenciales inválidas' })
    
    const ok = await bcrypt.compare(String(password), user.passwordHash)
    if (!ok) return res.status(401).json({ ok: false, error: 'credenciales inválidas' })

    const currentMonth = getCurrentMonth()
    if (user.lastCoinReset !== currentMonth && user.role !== 'admin') {
      user.coins = system.monthlyCoinsLimit
      user.lastCoinReset = currentMonth
      writeUsers(db)
    }

    const ONE_YEAR = 1000 * 60 * 60 * 24 * 365
    res.cookie("email", user.email, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR
    })
    res.cookie("key", user.apiKey, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR
    })

    res.json({ ok: true, user: publicUser(user) })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/logout', (req, res) => {
  res.clearCookie('email')
  res.clearCookie('key')
  res.redirect('/login')
})

app.post('/key/rotate', requireAuthApi, (req, res) => {
  try {
    const db = readUsers()
    const user = req.user
    user.apiKey = newKey()
    writeUsers(db)
    res.json({ ok: true, apiKey: user.apiKey })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/me', requireAuthApi, (req, res) => {
  res.json({ ok: true, user: publicUser(req.user) })
})

app.get('/bots', requireAuthApi, async (req, res) => {
  try {
    let user = req.user;
    
    user = await syncUserBotsStatus(user);
    let bots = user.bots || [];
    
    if (user.role === 'admin') {
      const db = readUsers();
      const allBots = db.users.flatMap(u => (u.bots || []).map(b => ({ ...b, owner: u.email })));
      bots = allBots;
    } else {
      bots = bots.map(b => ({ ...b, liveStatus: b.status }));
    }
    
    res.json({ ok: true, bots })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/bot/config', requireAuthApi, async (req, res) => {
  try {
    const { phone } = req.query || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })

    const idDigits = normalizePhone(phone)
    const user = req.user

    if (user.role !== 'admin') {
      if (findBotIdx(user, idDigits) === -1) {
        return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
      }
    }

    const config = getFullBotConfig(idDigits)

    res.json({ ok: true, config })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.post('/api/bot/config/edit', requireAuthApi, async (req, res) => {
  try {
    const { phone, data, bot, menu } = req.body || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })

    const idDigits = normalizePhone(phone)
    const user = req.user

    if (user.role !== 'admin') {
      if (findBotIdx(user, idDigits) === -1) {
        return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
      }
    }

    const result = getFullBotConfig(idDigits, { data, bot, menu })

    res.json({ ok: true, updated: true, config: result })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.post('/api/bot/execute', requireApiKey, async (req, res) => {
  try {
    const { phone, method, args } = req.body || {}
    if (!phone || !method) return res.status(400).json({ ok: false, error: 'phone y method requeridos' })
    
    const idDigits = normalizePhone(phone)
    const user = req.user
    
    if (user.role !== 'admin') {
      const idx = findBotIdx(user, idDigits)
      if (idx === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
    }

    const result = await baileys.executeSocketMethod(idDigits, method, ...(args || []))
    
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/bot/info', requireAuthApi, async (req, res) => {
  try {
    const { phone } = req.query || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    
    const idDigits = normalizePhone(phone)
    const user = req.user
    
    if (user.role !== 'admin') {
      const idx = findBotIdx(user, idDigits)
      if (idx === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
    }

    const botInfo = await baileys.botinfo(idDigits)
    
    if (!botInfo.ok) {
      return res.status(404).json(botInfo)
    }
    
    res.json({ ok: true, bot: botInfo })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.post('/bots/connect', requireAuthApi, async (req, res) => {
  try {
    const { phone, label } = req.body || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    if (!idDigits) return res.status(400).json({ ok: false, error: 'phone inválido' })
    
    const db = readUsers()
    const user = db.users.find(u => u.id === req.user.id)
    if (!user) return res.status(404).json({ ok: false, error: 'usuario no encontrado' })
    
    user.bots = user.bots || []
    const existingIdx = findBotIdx(user, idDigits)
    const maxBots = getMaxBotsForUser(user)
    
    if (existingIdx === -1 && user.bots.length >= maxBots) return res.status(403).json({ ok: false, error: `límite de ${maxBots} bots alcanzado` })
    
    const r = await baileys.requestCode(idDigits, phone)
    if (r.status === 'error') return res.status(500).json({ ok: false, error: r.error })
    
    const now = new Date().toISOString()
    const botRecord = { 
      idDigits, 
      jid: jidFromDigits(idDigits), 
      label: label || (existingIdx >= 0 ? user.bots[existingIdx].label : null), 
      status: 'pending', 
      createdAt: existingIdx >= 0 ? user.bots[existingIdx].createdAt : now, 
      updatedAt: now 
    }
    
    if (existingIdx >= 0) user.bots[existingIdx] = botRecord
    else user.bots.push(botRecord)
    
    writeUsers(db)
    
    setTimeout(async () => {
      try {
        const currentStatus = await baileys.getStatus(idDigits)
        updateBotStatus(idDigits, currentStatus || 'pending', label)
      } catch (e) {}
    }, 1000)
    
    const display = baileys.formatCode(r.code)
    res.json({ ok: true, id: botRecord.jid, code: r.code, display, status: r.status, bot: botRecord })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/bots/status', requireAuthApi, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    const user = req.user
    
    if (user.role !== 'admin') {
      const idx = findBotIdx(user, idDigits)
      if (idx === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
    }
    
    const s = await baileys.getStatus(idDigits)
    
    let updated = false
    const db = readUsers()
    db.users.forEach(u => {
      const botIdx = findBotIdx(u, idDigits)
      if (botIdx !== -1) {
        u.bots[botIdx].status = s || u.bots[botIdx].status
        u.bots[botIdx].updatedAt = new Date().toISOString()
        updated = true
      }
    })
    
    if (updated) {
      writeUsers(db)
    }
    
    res.json({ ok: true, id: jidFromDigits(idDigits), status: s })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.post('/bots/reset', requireAuthApi, async (req, res) => {
  try {
    const { phone } = req.body || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    const db = readUsers()
    const user = req.user
    
    if (user.role !== 'admin') {
      const idx = findBotIdx(user, idDigits)
      if (idx === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
      user.bots[idx].status = 'disconnected'
      user.bots[idx].updatedAt = new Date().toISOString()
    }
    
    const r = await baileys.resetSession(idDigits)
    writeUsers(db)
    res.json({ ok: true, result: r })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.delete('/bots', requireAuthApi, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    const alsoReset = String(req.query.reset || 'false').toLowerCase() === 'true'
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    const db = readUsers()
    const user = req.user
    
    if (user.role !== 'admin') {
      const idx = findBotIdx(user, idDigits)
      if (idx === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
      if (alsoReset) { try { await baileys.resetSession(idDigits) } catch {} }
      const removed = user.bots.splice(idx, 1)[0]
      writeUsers(db)
      res.json({ ok: true, removed })
    } else {
      let removed = []
      db.users.forEach(u => {
        const idx = findBotIdx(u, idDigits)
        if (idx !== -1) {
          removed.push({ ...u.bots[idx], owner: u.email })
          u.bots.splice(idx, 1)
        }
      })
      writeUsers(db)
      res.json({ ok: true, removed })
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/code', requireAuthApi, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    
    const db = readUsers()
    const user = db.users.find(u => u.id === req.user.id)
    if (!user) return res.status(404).json({ ok: false, error: 'usuario no encontrado' })
    
    user.bots = user.bots || []
    const existingIdx = findBotIdx(user, idDigits)
    const maxBots = getMaxBotsForUser(user)
    
    if (existingIdx === -1 && user.bots.length >= maxBots) return res.status(403).json({ ok: false, error: `límite de ${maxBots} bots alcanzado` })
    
    const r = await baileys.requestCode(idDigits, phone)
    if (r.status === 'error') return res.status(500).json({ ok: false, error: r.error })
    
    const now = new Date().toISOString()
    const botRecord = { 
      idDigits, 
      jid: jidFromDigits(idDigits), 
      label: existingIdx >= 0 ? user.bots[existingIdx].label : null, 
      status: 'pending', 
      createdAt: existingIdx >= 0 ? user.bots[existingIdx].createdAt : now, 
      updatedAt: now 
    }
    
    if (existingIdx >= 0) user.bots[existingIdx] = botRecord
    else user.bots.push(botRecord)
    
    writeUsers(db)
    
    setTimeout(async () => {
      try {
        const currentStatus = await baileys.getStatus(idDigits)
        updateBotStatus(idDigits, currentStatus || 'pending')
      } catch (e) {}
    }, 1000)
    
    const display = baileys.formatCode(r.code)
    res.json({ ok: true, id: botRecord.jid, code: r.code, display, status: r.status, bot: botRecord })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/status', requireAuthApi, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    const user = req.user
    
    if (user.role !== 'admin') {
      if (findBotIdx(user, idDigits) === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
    }
    
    const s = await baileys.getStatus(idDigits)
    res.json({ ok: true, id: jidFromDigits(idDigits), status: s })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/logs', requireAuthApi, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    const user = req.user
    
    if (user.role !== 'admin') {
      if (findBotIdx(user, idDigits) === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
    }
    
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' })
    res.flushHeaders?.()
    const send = (evt) => { if (evt.id !== idDigits) return; const payload = { ts: evt.ts, at: new Date(evt.ts).toISOString(), id: evt.id, text: evt.text, type: evt.type }; res.write(`data: ${JSON.stringify(payload)}\n\n`) }
    const off = baileys.subscribeLogs(idDigits, send)
    res.write(`event: open\ndata: ${JSON.stringify({ id: idDigits })}\n\n`)
    const keep = setInterval(() => res.write(': ping\n\n'), 15000)
    req.on('close', () => { clearInterval(keep); off(); res.end() })
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/bots/total', requireAuthApi, async (req, res) => {
  try {
    const info = baileys.getActiveBots()
    res.json({ ok: true, total: info.total })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.delete('/bots/delete', requireAuthApi, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const result = await baileys.deleteBotByNumber(phone)
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/reset', requireAuthApi, async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim()
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })
    const idDigits = normalizePhone(phone)
    const db = readUsers()
    const user = req.user
    
    if (user.role !== 'admin') {
      const idx = findBotIdx(user, idDigits)
      if (idx === -1) return res.status(404).json({ ok: false, error: 'bot no pertenece al usuario' })
      user.bots[idx].status = 'disconnected'
      user.bots[idx].updatedAt = new Date().toISOString()
    }
    
    const r = await baileys.resetSession(idDigits)
    writeUsers(db)
    res.json({ ok: true, ...r })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/bot/config', requireAdmin, async (req, res) => {
  try {
    const { phone } = req.query || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })

    const idDigits = normalizePhone(phone)
    const config = getFullBotConfig(idDigits)

    res.json({ ok: true, config })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.post('/api/admin/bot/config/edit', requireAdmin, async (req, res) => {
  try {
    const { phone, data, bot, menu } = req.body || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })

    const idDigits = normalizePhone(phone)
    const result = getFullBotConfig(idDigits, { data, bot, menu })

    res.json({ ok: true, updated: true, config: result })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.delete('/api/admin/user', requireAdmin, async (req, res) => {
  try {
    const { email } = req.query || {}
    if (!email) return res.status(400).json({ ok: false, error: 'email requerido' })

    const db = readUsers()
    const userIndex = db.users.findIndex(u => u.email === email)
    
    if (userIndex === -1) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    }

    const deletedUser = db.users.splice(userIndex, 1)[0]
    
    if (deletedUser.bots && deletedUser.bots.length > 0) {
      for (const bot of deletedUser.bots) {
        try {
          await baileys.deleteBotByNumber(bot.idDigits)
        } catch (error) {
          console.error(`Error eliminando bot ${bot.idDigits}:`, error)
        }
      }
    }

    writeUsers(db)
    
    res.json({ 
      ok: true, 
      message: `Usuario ${email} eliminado correctamente`,
      deletedUser: {
        email: deletedUser.email,
        username: deletedUser.username,
        botsCount: deletedUser.bots?.length || 0
      }
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.delete('/api/admin/bot', requireAdmin, async (req, res) => {
  try {
    const { phone } = req.query || {}
    if (!phone) return res.status(400).json({ ok: false, error: 'phone requerido' })

    const idDigits = normalizePhone(phone)
    const db = readUsers()
    
    let removedFromUsers = []
    let totalRemoved = 0

    db.users.forEach(user => {
      const botIndex = findBotIdx(user, idDigits)
      if (botIndex !== -1) {
        const removedBot = user.bots.splice(botIndex, 1)[0]
        removedFromUsers.push({
          user: user.email,
          bot: removedBot
        })
        totalRemoved++
      }
    })

    const deleteResult = await baileys.deleteBotByNumber(idDigits)

    if (totalRemoved > 0) {
      writeUsers(db)
    }

    res.json({ 
      ok: true, 
      message: `Bot ${idDigits} eliminado correctamente`,
      deleteResult,
      removedFrom: removedFromUsers,
      totalRemoved
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/backup', requireAdmin, async (req, res) => {
  try {
    const db = readUsers()
    const system = readSystem()
    const backupData = {
      users: db.users,
      system: system,
      exportedAt: new Date().toISOString()
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.json`
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    
    res.send(JSON.stringify(backupData, null, 2))
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/server-logs', requireAdmin, async (req, res) => {
  try {
    res.set({ 
      'Content-Type': 'text/event-stream', 
      'Cache-Control': 'no-cache', 
      'Connection': 'keep-alive', 
      'Access-Control-Allow-Origin': '*' 
    })
    res.flushHeaders?.()
    
    const send = (evt) => {
      const payload = { 
        ts: evt.ts, 
        at: new Date(evt.ts).toISOString(), 
        id: evt.id, 
        text: evt.text, 
        type: evt.type 
      }
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }
    
    const allLogsListener = (evt) => send(evt)
    baileys.logBus.on('log', allLogsListener)
    
    res.write(`event: open\ndata: ${JSON.stringify({ message: 'Conectado a logs del servidor' })}\n\n`)
    
    const keep = setInterval(() => res.write(': ping\n\n'), 15000)
    
    req.on('close', () => {
      clearInterval(keep)
      baileys.logBus.off('log', allLogsListener)
      res.end()
    })
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/user-coins-usage', requireAdmin, async (req, res) => {
  try {
    const { email } = req.query || {}
    if (!email) return res.status(400).json({ ok: false, error: 'email requerido' })

    const db = readUsers()
    const system = readSystem()
    const user = db.users.find(u => u.email === email)
    
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    }

    const monthlyCoinsLimit = system.monthlyCoinsLimit
    const currentCoins = user.coins || monthlyCoinsLimit
    const coinsUsed = monthlyCoinsLimit - currentCoins
    const usagePercentage = ((coinsUsed / monthlyCoinsLimit) * 100).toFixed(1)

    res.json({
      ok: true,
      user: {
        email: user.email,
        username: user.username
      },
      coins: {
        monthly: monthlyCoinsLimit,
        current: currentCoins,
        used: coinsUsed,
        usagePercentage: usagePercentage + '%'
      },
      lastReset: user.lastCoinReset
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/global-coins-usage', requireAdmin, async (req, res) => {
  try {
    const db = readUsers()
    const system = readSystem()
    const regularUsers = db.users.filter(u => u.role !== 'admin')
    
    let totalMonthlyCoins = 0
    let totalCurrentCoins = 0
    let totalCoinsUsed = 0
    let usersWithUsage = []

    regularUsers.forEach(user => {
      const monthlyCoinsLimit = system.monthlyCoinsLimit
      const currentCoins = user.coins || monthlyCoinsLimit
      const coinsUsed = monthlyCoinsLimit - currentCoins
      
      totalMonthlyCoins += monthlyCoinsLimit
      totalCurrentCoins += currentCoins
      totalCoinsUsed += coinsUsed
      
      usersWithUsage.push({
        email: user.email,
        username: user.username,
        monthlyCoins: monthlyCoinsLimit,
        currentCoins: currentCoins,
        coinsUsed: coinsUsed,
        usagePercentage: ((coinsUsed / monthlyCoinsLimit) * 100).toFixed(1) + '%'
      })
    })

    const globalUsagePercentage = totalMonthlyCoins > 0 ? 
      ((totalCoinsUsed / totalMonthlyCoins) * 100).toFixed(1) : 0

    res.json({
      ok: true,
      summary: {
        totalUsers: regularUsers.length,
        totalMonthlyCoins,
        totalCurrentCoins,
        totalCoinsUsed,
        globalUsagePercentage: globalUsagePercentage + '%',
        monthlyLimit: system.monthlyCoinsLimit
      },
      users: usersWithUsage
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/active-bots', requireAdmin, async (req, res) => {
  try {
    const activeBots = baileys.getActiveBots()
    const db = readUsers()
    
    const botsWithOwners = activeBots.bots.map(bot => {
      const owner = db.users.find(u => 
        u.bots && u.bots.find(b => b.idDigits === bot.id)
      )
      return {
        ...bot,
        owner: owner ? owner.email : 'Desconocido',
        ownerUsername: owner ? owner.username : 'Desconocido'
      }
    })

    res.json({
      ok: true,
      total: activeBots.total,
      bots: botsWithOwners,
      stats: {
        byStatus: {
          open: botsWithOwners.filter(b => b.status === 'open').length,
          connecting: botsWithOwners.filter(b => b.status === 'connecting').length,
          closed: botsWithOwners.filter(b => b.status === 'closed').length
        }
      }
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.delete('/api/admin/user-bot', requireAdmin, async (req, res) => {
  try {
    const { email, phone } = req.query || {}
    if (!email || !phone) return res.status(400).json({ 
      ok: false, 
      error: 'email y phone requeridos' 
    })

    const idDigits = normalizePhone(phone)
    const db = readUsers()
    
    const user = db.users.find(u => u.email === email)
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' })
    }

    const botIndex = findBotIdx(user, idDigits)
    if (botIndex === -1) {
      return res.status(404).json({ ok: false, error: 'Bot no encontrado en la cuenta del usuario' })
    }

    const removedBot = user.bots.splice(botIndex, 1)[0]
    
    const otherUsersWithBot = db.users.filter(u => 
      u.email !== email && findBotIdx(u, idDigits) !== -1
    )

    if (otherUsersWithBot.length === 0) {
      await baileys.deleteBotByNumber(idDigits)
    }

    writeUsers(db)

    res.json({ 
      ok: true, 
      message: `Bot ${idDigits} eliminado de la cuenta de ${email}`,
      removedBot,
      sessionDeleted: otherUsersWithBot.length === 0
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const db = readUsers()
    const system = readSystem()
    const activeBots = baileys.getActiveBots()
    
    const totalUsers = db.users.length
    const adminUsers = db.users.filter(u => u.role === 'admin').length
    const regularUsers = totalUsers - adminUsers
    
    const totalBots = db.users.reduce((sum, user) => sum + (user.bots?.length || 0), 0)
    const totalActiveBots = activeBots.total
    
    const totalCoins = db.users.reduce((sum, user) => sum + (user.coins || system.monthlyCoinsLimit), 0)
    const totalMonthlyCoins = db.users.reduce((sum, user) => sum + system.monthlyCoinsLimit, 0)
    const coinsUsed = totalMonthlyCoins - totalCoins

    res.json({
      ok: true,
      stats: {
        users: {
          total: totalUsers,
          admins: adminUsers,
          regular: regularUsers
        },
        bots: {
          total: totalBots,
          active: totalActiveBots,
          inactive: totalBots - totalActiveBots
        },
        coins: {
          total: totalCoins,
          monthlyLimit: system.monthlyCoinsLimit,
          used: coinsUsed,
          usagePercentage: totalMonthlyCoins > 0 ? 
            ((coinsUsed / totalMonthlyCoins) * 100).toFixed(1) + '%' : '0%'
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Error interno' })
  }
})

const syncAllBotsOnStartup = async () => {
  try {
    const db = readUsers();
    let updatedCount = 0;
    
    for (const user of db.users) {
      if (user.bots && user.bots.length > 0) {
        for (const bot of user.bots) {
          try {
            const currentStatus = await baileys.getStatus(bot.idDigits);
            if (currentStatus && currentStatus !== bot.status) {
              bot.status = currentStatus;
              bot.updatedAt = new Date().toISOString();
              updatedCount++;
            }
          } catch (error) {
            if (bot.status !== 'disconnected') {
              bot.status = 'disconnected';
              bot.updatedAt = new Date().toISOString();
              updatedCount++;
            }
          }
        }
      }
    }
    
    if (updatedCount > 0) {
      writeUsers(db);
    }
  } catch (error) {
  }
};

const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } })

const roomOf = (idDigits) => `bot:${idDigits}`
const roomCounts = new Map()
const forwarders = new Map()

function ensureForwarder(idDigits) {
  if (forwarders.has(idDigits)) return
  const off = baileys.subscribeLogs(idDigits, (evt) => {
    const payload = { ts: evt.ts, at: new Date(evt.ts).toISOString(), id: evt.id, text: evt.text, type: evt.type }
    io.to(roomOf(idDigits)).emit('log', payload)
  })
  forwarders.set(idDigits, off)
}

function incRoom(idDigits) {
  const c = roomCounts.get(idDigits) || 0
  roomCounts.set(idDigits, c + 1)
  ensureForwarder(idDigits)
}

function decRoom(idDigits) {
  const c = roomCounts.get(idDigits) || 0
  if (c <= 1) {
    roomCounts.delete(idDigits)
    const off = forwarders.get(idDigits)
    if (off) { off(); forwarders.delete(idDigits) }
  } else {
    roomCounts.set(idDigits, c - 1)
  }
}

io.use((socket, next) => {
  try {
    const auth = socket.handshake.auth || {}
    const query = socket.handshake.query || {}
    const key = auth.key || auth.token || query.key
    const phone = auth.phone || query.phone
    if (!key || !phone) return next(new Error('auth requerida'))
    const db = readUsers()
    const user = findUserByKey(db, String(key))
    if (!user) return next(new Error('api key inválida'))
    const idDigits = normalizePhone(String(phone))
    if (!idDigits) return next(new Error('phone inválido'))
    if (user.role !== 'admin' && findBotIdx(user, idDigits) === -1) return next(new Error('bot no pertenece al usuario'))
    socket.data.userId = user.id
    socket.data.idDigits = idDigits
    next()
  } catch (e) {
    next(new Error('error de autenticación'))
  }
})

io.on('connection', (socket) => {
  const idDigits = socket.data.idDigits
  socket.join(roomOf(idDigits))
  incRoom(idDigits)
  socket.emit('open', { id: idDigits })
  socket.on('subscribe', (payload) => {
    try {
      const phone = String((payload && payload.phone) || '').trim()
      if (!phone) return
      const nextId = normalizePhone(phone)
      const db = readUsers()
      const user = db.users.find(u => u.id === socket.data.userId)
      if (!user) return
      if (user.role !== 'admin' && findBotIdx(user, nextId) === -1) return
      const prev = socket.data.idDigits
      if (prev === nextId) return
      socket.leave(roomOf(prev))
      decRoom(prev)
      socket.data.idDigits = nextId
      socket.join(roomOf(nextId))
      incRoom(nextId)
      socket.emit('open', { id: nextId })
    } catch {}
  })
  socket.on('disconnect', () => {
    const cur = socket.data.idDigits
    if (cur) decRoom(cur)
  })
})

baileys.bootstrapAll()
  .then(async (list) => {
    console.log(`sesiones detectadas: ${list.length}`)
    await syncAllBotsOnStartup()
  })
  .catch(err => console.error('error:', err))
  .finally(() => { server.listen(PORT, () => console.log(`http://localhost:${PORT}`)) }) 