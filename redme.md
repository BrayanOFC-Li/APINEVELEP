<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=00FF00&center=true&vCenter=true&width=435&lines=¡Hola!+👋;Bienvenido+a+Neveloopp+v2" alt="Animación de saludo" />
</p>

<h1 align="center">
  <img src="https://img.shields.io/badge/NEVELOOPP-v2.0-00ff00?style=for-the-badge&logo=ghost&logoColor=white" alt="Neveloopp v2" />
</h1>

<h3 align="center">
  <i>By Dev Neveloopp</i>
</h3>

---

## 📖 Documentación del Proyecto

### 👨‍💻 Desarrollador
**Dev Neveloopp** ha desarrollado este proyecto completamente solo.

### 🎯 Propósito
Este proyecto está diseñado para que puedas vincular **varios bots** a un mismo servidor mediante **multi-sesión**.

### ⚠️ Límites Técnicos
- **Soporte máximo**: 50 sesiones
- **Más de 50 sesiones**: El código puede presentar problemas como:
  - Bajas de ping
  - Respuestas lentas
  - Comportamiento inestable
  - Otros errores

## 🗂️ Estructura del Proyecto

### `index.js` - Servidor Web Principal
Archivo del servidor web que maneja todas las conexiones HTTP, WebSocket y la autenticación de usuarios.

**Funcionalidades principales:**
- Servidor Express con configuración CORS y body-parser
- Sistema de autenticación con cookies y API keys
- Gestión de usuarios y roles (admin/user)
- Sistema de coins para limitar uso mensual
- API REST para gestión de bots
- WebSocket para logs en tiempo real
- Panel de administración completo
- Endpoints para backup y estadísticas
- Middlewares de seguridad y autorización

**Características técnicas:**
- Puerto configurable (default: 80)
- Sesiones persistentes con cookies
- Límite de bots por usuario
- Reset mensual de coins automático
- API documentada

### `baileys.js` - Manejador Multi-Sesión
Archivo más importante que maneja toda la conexión entre los bots y la web.

**Funcionalidades principales:**
- Gestión de múltiples sesiones de WhatsApp
- Sistema de autenticación con pairing codes
- Reconexión automática
- Limpieza de sesiones abandonadas
- Logs en tiempo real
- Ejecución de métodos del socket
- Información de bots en tiempo real

**Características técnicas:**
- Uso de Baileys library
- Sessions en directorio separado
- Timeouts configurables
- Keep-alive automático
- Bootstrap de sesiones al iniciar
- Manejo de errores y reconexiones

### `main.js` - Manejador de Comandos y Funciones
Archivo que maneja los comandos y funciones principales del bot.

## ⚙️ Edición y Configuración

Para personalizar este bot, busca las variables `DEFAULT_BOT_CONFIG` en el archivo `main.js`.

---

## 🚀 Instalación y Uso

1. **Instalar dependencias:**
```bash
npm install
```

1. Configurar variables de entorno:

```bash
cp .env.example .env
```

1. Ejecutar el proyecto:

```bash
node index.js
```

1. Acceder al panel web:

```
http://localhost:80
```

📊 Características del Sistema

Para Usuarios Normales

· Límite de 2 bots por usuario
· Sistema de coins mensuales
· Panel de control personal
· API key para integraciones

Para Administradores

· Panel de administración completo
· Gestión de todos los usuarios
· Estadísticas globales
· Backup del sistema
· Logs en tiempo real

🔧 API Endpoints Principales

Autenticación

· POST /signup - Registrar usuario
· POST /login - Iniciar sesión
· GET /me - Información del usuario

Gestión de Bots

· POST /bots/connect - Conectar nuevo bot
· GET /bots/status - Estado del bot
· POST /bots/reset - Resetear sesión
· DELETE /bots - Eliminar bot

Administración

· GET /api/admin/users - Listar usuarios
· POST /api/admin/add-coins - Agregar coins
· GET /api/admin/stats - Estadísticas

🛠️ Tecnologías Utilizadas

· Backend: Node.js, Express.js
· WhatsApp: Baileys library
· Base de datos: JSON files
· WebSocket: Socket.io
· Autenticación: bcryptjs, cookies
· Logs: EventEmitter, SSE

⚠️ Notas Importantes

· El proyecto está optimizado para hasta 50 sesiones simultáneas
· Los coins se reseteban mensualmente
· Las sesiones se almacenan en la carpeta sessions/
· Los datos de usuarios en la carpeta data/

---

📜 Créditos

Proyecto desarrollado por DevNeveloopp

⚠️ Nota: Por favor, mantén los créditos del desarrollador original.

<br>

<p align="center">
  <img src="https://komarev.com/ghpvc/?username=neveloopp&label=Visitas&color=00ff00&style=flat" alt="Contador de visitas" />
</p>