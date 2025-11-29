const fs = require('fs')
const path = require('path')
const { jidNormalizedUser } = require('@whiskeysockets/baileys')

const DATA_FILE = path.join(__dirname, 'config', 'data.json')

function ensureDataFile(){const d=path.dirname(DATA_FILE);if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true});if(!fs.existsSync(DATA_FILE))fs.writeFileSync(DATA_FILE,JSON.stringify({}),'utf8')}
function readData(){ensureDataFile();try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}')}catch{return{}}}
function writeData(o){ensureDataFile();fs.writeFileSync(DATA_FILE,JSON.stringify(o,null,2))}
function defaultPrefixes(){return ['.','!','/','#']}
function getPrefixes(cfg){if(cfg?.noPrefix)return[];if(Array.isArray(cfg?.prefixes)&&cfg.prefixes.length)return cfg.prefixes.map(String);return defaultPrefixes()}
function setPrefixes(cfg,list){const clean=[...new Set(list.map(String))].slice(0,16);if(clean.length===0){cfg.noPrefix=true;cfg.prefixes=[]}else{cfg.noPrefix=false;cfg.prefixes=clean}}
function normCmd(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,'')}

function detectPrefixAndCmd(text,cfg){
  const t=String(text||'').trim()
  const m=t.match(/^([^\p{L}\p{N}\s]+)?\s*(.*)$/u)
  const maybePrefix=(m&&m[1])?m[1]:''
  const body=(m&&m[2])?m[2].trim():''
  const hasCustom=Array.isArray(cfg?.prefixes)&&cfg.prefixes.length>0

  const allowed = cfg?.noPrefix
    ? (maybePrefix==='') 
    : (hasCustom ? cfg.prefixes.includes(maybePrefix) : defaultPrefixes().includes(maybePrefix))

  if(!allowed){
    return { usedPrefix:'', cmdRaw:'', cmd:'', args:'', accepts:false }
  }

  const firstRaw=(body.split(/\s+/)[0]||'').replace(/,+$/g,'')
  const cmd=normCmd(firstRaw)
  const args=body.slice(firstRaw.length).trim()
  return { usedPrefix: maybePrefix, cmdRaw:firstRaw, cmd, args, accepts:true }
}

async function parseIncoming(conn,m,text){
  const me=jidNormalizedUser(conn.user?.id||'')||'bot'
  const data=readData()
  const cfg=Object.assign({prefixes:[],noPrefix:false},data[me]||{})
  const parsed=detectPrefixAndCmd(text,cfg)
  return { cfg, parsed, accepts: parsed.accepts }
}

module.exports.parseIncoming=parseIncoming
module.exports.getPrefixes=getPrefixes
module.exports.setPrefixes=setPrefixes
module.exports.defaultPrefixes=defaultPrefixes
module.exports.readData=readData
module.exports.writeData=writeData