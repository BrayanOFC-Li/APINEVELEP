const { GoogleGenAI } = require("@google/genai")

const ai = new GoogleGenAI({
  apiKey: "A DONDE PUTA TU KEY AQUÍ"
})

async function fetch(url) {
  try {
    const response = await global.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    })
    
    const htmlContent = await response.text()

    const prompt = `Eres un analizador especializado en extraer URLs de archivos directos desde código HTML. Tu tarea es:

1. ANALIZAR todo el código HTML proporcionado
2. BUSCAR URLs directas a archivos descargables como:
   - Vídeos: .mp4, .avi, .mov, .mkv, .webm, URLs de reproductores de video
   - Imágenes: .jpg, .jpeg, .png, .gif, .webp
   - Documentos: .pdf, .doc, .docx, .xls, .ppt
   - Archivos: .zip, .rar, .apk, .exe
   - Audios: .mp3, .wav, .ogg

3. PRIORIDAD de búsqueda:
   PRIMERO: Archivos de vídeo
   SEGUNDO: Archivos de documentos
   TERCERO: Archivos comprimidos
   CUARTO: Imágenes
   QUINTO: Audios

4. CRITERIOS:
   - La URL debe ser directa al archivo (no enlaces a páginas)
   - Debe ser una URL completa y válida
   - Si hay múltiples archivos, selecciona el más relevante según la prioridad
   - Verifica que la URL parezca ser un archivo real

5. RESPUESTA:
   - Si encuentras una URL válida: responde SOLO con la URL completa
   - Si NO encuentras nada: responde "NO_ENCONTRADO"
   - NO incluyas explicaciones, texto adicional, formato o comentarios

HTML para analizar:
${htmlContent}`

    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    })

    const foundUrl = aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "NO_ENCONTRADO"

    if (foundUrl === "NO_ENCONTRADO" || !foundUrl || foundUrl.includes("No puedo") || foundUrl.includes("no encontré")) {
      return {
        status: false,
        creador: "Neveloopp",
        url: null
      }
    }

    const cleanUrl = foundUrl.replace(/["']/g, '').trim()

    try {
      new URL(cleanUrl)
      return {
        status: true,
        creador: "Neveloopp",
        url: cleanUrl
      }
    } catch (urlError) {
      return {
        status: false,
        creador: "Neveloopp",
        url: null
      }
    }

  } catch (err) {
    return {
      status: false,
      creador: "Neveloopp",
      url: null
    }
  }
}

module.exports = { fetch }