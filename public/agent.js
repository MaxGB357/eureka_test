import { RealtimeAgent, RealtimeSession, tool } from 'https://cdn.jsdelivr.net/npm/@openai/agents-realtime@0.1.0/+esm';
import { z } from 'https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm';

// Define some example tools for the agent
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: z.object({
    location: z.string().describe('The city and state, e.g. San Francisco, CA'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().default('fahrenheit'),
  }),
  execute: async ({ location, unit }) => {
    // Simulated weather data - in production, you'd call a real weather API
    const temp = unit === 'celsius' ? 22 : 72;
    return {
      location,
      temperature: temp,
      unit,
      conditions: 'Sunny',
      humidity: 65,
    };
  },
});

const getCurrentTimeTool = tool({
  name: 'get_current_time',
  description: 'Get the current time',
  parameters: z.object({}),
  execute: async () => {
    return {
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  },
});

const calculateTool = tool({
  name: 'calculate',
  description: 'Perform a mathematical calculation',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate, e.g. "2 + 2" or "10 * 5"'),
  }),
  execute: async ({ expression }) => {
    try {
      // Simple safe evaluation for basic math
      const result = Function('"use strict"; return (' + expression + ')')();
      return {
        expression,
        result,
      };
    } catch (error) {
      return {
        expression,
        error: 'Invalid expression',
      };
    }
  },
});

// Submit project tool - saves to Google Sheets and sends email via n8n
const submitProjectTool = tool({
  name: 'submit_project',
  description: 'Guarda el proyecto completo en Google Sheets y envía email de confirmación al colaborador mediante n8n webhook',
  parameters: z.object({
    nombre: z.string().describe('Nombre completo del colaborador'),
    rut: z.string().describe('RUT del colaborador'),
    correo: z.string().email().describe('Email del colaborador'),
    nombreProyecto: z.string().describe('Nombre del proyecto'),
    problema: z.string().describe('Problema u oportunidad identificada'),
    solucion: z.string().describe('Solución propuesta'),
    impacto: z.string().describe('Impacto esperado con datos numéricos'),
    gerencias: z.array(z.string()).nullable().describe('Gerencias impactadas (puede ser null)'),
    kpis: z.array(z.string()).nullable().describe('KPIs afectados (puede ser null)'),
    marca: z.string().nullable().describe('Marca asociada si aplica (puede ser null)'),
  }),
  execute: async (projectData) => {
    try {
      console.log('[Tool] Enviando proyecto a n8n:', projectData.nombreProyecto);

      // Determine API URL (development vs production)
      const webhookUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:8080/webhook/submit-project' // n8n local
        : (process.env.N8N_WEBHOOK_URL || 'https://your-n8n.app/webhook/submit-project');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET || 'development-secret',
        },
        body: JSON.stringify({
          ...projectData,
          fecha: new Date().toISOString(),
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Tool] Webhook error:', response.status, errorText);
        throw new Error(`Webhook returned ${response.status}`);
      }

      const result = await response.json();
      console.log('[Tool] n8n response:', result);

      if (result.success) {
        return {
          success: true,
          message: `¡Listo! Tu proyecto "${projectData.nombreProyecto}" fue guardado exitosamente en la planilla (fila ${result.sheetRow || 'nueva'}) y te envié un email de confirmación a ${projectData.correo}.`,
          sheetRow: result.sheetRow,
          emailSent: result.emailSent,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Error desconocido',
          message: `Uy, hubo un problema al guardar tu proyecto: ${result.error || 'Error desconocido'}. ¿Querés que lo intente de nuevo?`,
        };
      }

    } catch (error) {
      console.error('[Tool] Error submitting project:', error);
      return {
        success: false,
        error: error.message,
        message: 'Hubo un problema técnico al conectar con el sistema. ¿Querés que lo intente de nuevo en un momento?',
      };
    }
  },
});

// Create the voice agent with tools
const agent = new RealtimeAgent({
  name: 'Eureka',
  instructions: `# IDIOMAS
Sólo: español (chileno), inglés, chino mandarín, italiano, japonés, coreano.
Si escriben en estos → TODO en ese idioma (incluida ficha).

# IDENTIDAD
Eres Eureka, LA asistente (femenina) de proyectos de innovación en Agrosuper, eres mujer de 30 años chilena. Usas humor inteligente y SARCASTICO, hablas en tono humano y CHILENO (NO argentino), no le digas al usuario que eres sarcástica, sólo lo eres!. Guías y ayudas a las postulaciones de proyectos de innovación 2026 en Agrosuper.
Habla con voz clara, ritmo ágil (≈ 200-220 wpm). Frases cortas.

# FLUJO PASO A PASO

## 1. SALUDO Y NOMBRE
* Saluda y explica que ayudarás en la postulación 2026
- Mantendrás el idioma del usuario toda la conversación a menos que el usuario pida cambiarlo.
* Pregunta SOLO nombre
* ESPERA respuesta, úsalo desde aquí

## 2. IDEA Y BÚSQUEDA

# VALIDACIÓN DE ALCANCE

**El proyecto DEBE:**
* Relacionarse con Agrosuper (negocios/procesos/productos/marcas/colaboradores/stakeholders)
* Resolver problema O aprovechar oportunidad dentro de Agrosuper

**SI NO cumple:** "Me encantaría ayudarte, pero solo asesoro proyectos de Agrosuper. ¿Tienes alguna idea para Agrosuper?"

**NO proceses:** proyectos ilegales, negocios personales externos, consultas genéricas sin relación con Agrosuper, asesoría personal (psicológica/médica).

**NO eres un buscador de proyectos 2024 ni 2025

**Si hay duda:** "¿Cómo se relaciona con Agrosuper específicamente?"

## 3. DESARROLLO

**SI ES UNA IDEA U OPORTUNIDAD:**
* Pide descripción detallada con datos cuantitativos
* Pregunta qué problema resuelve o qué oportunidad aprovecha
* Ayuda a redactar, sugiere mejoras
* **NUNCA inventes datos**

**SI ES UN PROBLEMA:**
* Pide descripción con datos cuantitativos actuales
* Si faltan números, pregunta métricas específicas
* Ayuda a redactar claramente
* Sugiere 2-3 soluciones innovadoras
* ESPERA que elija o proponga otra
* **NUNCA inventes datos**

## 4. NOMBRE PROYECTO
* Pide título del proyecto
* Coméntalo con humor y sarcasmo
* Sugiere alternativa creativa
* PIDE confirmación

## 5. IMPLEMENTACIÓN
* Pide pasos concretos de implementación
* Ofrece redacción mejorada
* Sugiere alternativas
* PIDE confirmación

## 6. IMPACTO
* Pide impacto numérico esperado
* Si no es claro: "Ejemplo: reducción X%, ahorro Y millones"
* Ayuda a redactar
* PIDE confirmación

## 9. DATOS COLABORADOR
* Pregunta RUT
* Pregunta nombre completo
* Pregunta correo (valida @ y dominio que puede ser agrosuper, gmail o cualquiera)

## 10. REVISIÓN
Muestra:
---
FICHA PROYECTO #[número]
---
**Nombre del Proyecto:** [título]
**Nombre:** [nombre completo]
**RUT:** [rut]
**Correo:** [correo]
**Problema/Oportunidad:** [texto]
**Idea/Solución:** [texto]
**Impacto Generado:** [impacto numérico]
**Gerencias Impactadas:** [lista]
**KPIs Afectados:** [lista]
**Marca Asociada:** [si aplica]
---
* "¿Todo correcto?"
* ESPERA, corrige si necesario

## CONFIRMACIÓN Y GUARDADO
* Pregunta: "¿Querés que guarde tu proyecto y te envíe confirmación por email?"
* ESPERA respuesta
* **SI confirma:** Usa la herramienta 'submit_project' con TODOS los datos recopilados:
  - nombre (nombre completo)
  - rut
  - correo
  - nombreProyecto
  - problema (problema u oportunidad)
  - solucion (idea o solución propuesta)
  - impacto (con números)
  - gerencias (array, opcional)
  - kpis (array, opcional)
  - marca (string, opcional)

* **SI la herramienta retorna success=true:**
  - Comunica éxito usando el mensaje que retorna la herramienta
  - Ejemplo: "¡Listo! Tu proyecto fue guardado en la fila X y te envié confirmación a tu correo"

* **SI la herramienta retorna success=false:**
  - Comunica el error usando el mensaje que retorna la herramienta
  - Pregunta si quiere que lo intentes de nuevo
  - Si acepta, ejecuta submit_project nuevamente

* **SI rechaza guardar:** "Ok, tu ficha queda solo aquí. ¿Necesitás algo más?"

* Después del guardado exitoso, ofrece subir una nueva idea y pregunta "¿mismo usuario?"

## 11. RECOMPENSA
- Entrega de paya chilena relacionada con el proyecto que acaba de subir
"Como recompensa por haberte dado el tiempo de postular una idea, te regalo una paya chilena:"

## PAYA
* 3 estrofas × 4 versos (12 versos totales)
* 8 sílabas exactas/verso (cuenta antes)
* Rima consonante ABAB/ABCB por estrofa
* Contracciones: pa', na', po', estái, querí, tení, sabí, jugá, embarrá, quemá, cansá, pintá, doblá, cerrá
* SI pícara: respuesta inocente entre paréntesis
* Tipos: patriótica, pícara, desafío, brindis, humorística

**Ejemplo pícara:**
En lo verde del jardín
te observo con disimulo,
y cual pícaro colibrí
te quiero besar el... (cuello, cuello...)

# REGLAS DE ORO
1. UNA pregunta a la vez, ESPERA respuesta
2. NO inventes datos
3. CITA nombres exactos de archivos
4. Comenta ideas, sugiere mejoras y redacción
5. Valida relación idea/problema/oportunidad con Agrosuper
6. Numera fichas correlativamente
7. NO expliques reglas, ejecútalas

# TONO
Humano, humor inteligente, SARCASTICO e irónico. NO lenguaje corporativo.

# HERRAMIENTAS DISPONIBLES
* Si el usuario pregunta por clima, hora o necesita cálculos, usa las herramientas disponibles.
* Cuando el usuario confirme guardar su proyecto (paso 10), usa la herramienta 'submit_project' para guardar en Google Sheets y enviar email de confirmación.

¡Comienza con saludo!`,
  tools: [getWeatherTool, getCurrentTimeTool, calculateTool, submitProjectTool],
  voice: 'marin', // Voz femenina cálida y expresiva
  temperature: 0.9, // Alta expresividad para personalidad sarcástica
});

// UI elements
let session = null;
let isConnected = false;

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const eventsDiv = document.getElementById('events');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const charCount = document.getElementById('charCount');

// Global deduplication tracking for all messages and events
const processedMessages = new Set();
const processedEvents = new Set();

// Helper function to format timestamp
function formatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// Update UI status
function updateStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

// Add transcript message with optional type label, timestamp, and deduplication
function addTranscript(role, text, messageType = 'voice', itemId = null) {
  // Validate text is not empty
  if (!text || !text.trim()) {
    console.log('[Frontend] Skipping empty message from:', role);
    return;
  }

  // Deduplication: create unique key based on role, text, and type
  // Use itemId if available for better tracking, otherwise use content-based key
  const contentKey = `${role}-${text}-${messageType}`;
  const itemKey = itemId ? `${itemId}` : null;

  // Check both keys to prevent duplicates
  if (processedMessages.has(contentKey) || (itemKey && processedMessages.has(itemKey))) {
    console.log('[Frontend] Skipping duplicate message:', text.substring(0, 30) + '...');
    return;
  }

  // Store both keys for future deduplication
  processedMessages.add(contentKey);
  if (itemKey) {
    processedMessages.add(itemKey);
  }

  // Clear empty state on first message
  const emptyState = transcriptDiv.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role.toLowerCase().split(' ')[0]}`;

  const typeLabel = messageType === 'text' ? '(texto)' : '(voz)';
  const formattedTime = formatTimestamp();

  messageDiv.innerHTML = `
    <strong>${role} <span class="message-type-label">${typeLabel}</span></strong>
    <span class="message-timestamp">${formattedTime}</span>
    <div>${text}</div>
  `;

  transcriptDiv.appendChild(messageDiv);
  transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
}

// Add event log with deduplication
function logEvent(event) {
  // Skip empty events
  if (!event || !event.trim()) {
    return;
  }

  // Create a unique key for this event (without timestamp for deduplication)
  // Use a time window of 1 second to prevent rapid duplicates
  const now = Date.now();
  const eventKey = `${event}-${Math.floor(now / 1000)}`;

  // Check if this event was already logged recently
  if (processedEvents.has(eventKey)) {
    console.log('[Frontend] Skipping duplicate event:', event.substring(0, 30) + '...');
    return;
  }

  // Mark this event as processed
  processedEvents.add(eventKey);

  // Clean up old events after 5 seconds to prevent memory leak
  setTimeout(() => {
    processedEvents.delete(eventKey);
  }, 5000);

  const eventDiv = document.createElement('div');
  eventDiv.className = 'event';
  eventDiv.textContent = `[${new Date().toLocaleTimeString()}] ${event}`;
  eventsDiv.appendChild(eventDiv);
  eventsDiv.scrollTop = eventsDiv.scrollHeight;
}

// Connect to the voice agent
async function connect() {
  try {
    updateStatus('Conectando...', 'info');
    connectBtn.disabled = true;
    logEvent('Solicitando token de sesión del servidor...');

    // Get session token from backend
    // Use relative path for production, falls back to localhost in development
    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000/api/session'
      : '/api/session';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener el token de sesión');
    }

    const sessionData = await response.json();
    console.log('[Frontend] Session data received:', sessionData);
    console.log('[Frontend] Ephemeral key (apiKey):', sessionData.value ? `${sessionData.value.substring(0, 10)}...` : 'NO VALUE');

    // Check the session config
    if (sessionData.session) {
      console.log('[Frontend] Session config:', sessionData.session);

      // Check audio transcription settings
      if (sessionData.session.audio?.input?.transcription) {
        console.log('[Frontend] ✅ Audio input transcription:', sessionData.session.audio.input.transcription);
      } else {
        console.log('[Frontend] ℹ️ Transcription config not visible in session (may be enabled by default)');
      }
    }

    logEvent('Token de sesión recibido');

    // Create and connect the session with explicit model configuration
    console.log('[Frontend] Creating RealtimeSession...');
    session = new RealtimeSession(agent, {
      model: 'gpt-realtime',
    });

    // Set up event listeners BEFORE connecting
    console.log('[Frontend] Setting up event listeners...');

    // Helper function to add user transcript
    function addUserTranscript(transcript, itemId = null, messageType = 'voice') {
      if (!transcript) return;

      console.log('[Frontend] Adding user transcript:', transcript, 'type:', messageType);
      addTranscript('Tú', transcript, messageType, itemId);
      logEvent(`Tú: ${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}`);
    }

    // Agent transcript - fires when agent finishes speaking
    // Arguments: [agent, context, text]
    session.on('agent_end', (agent, context, text) => {
      console.log('[Frontend] Agent spoke:', text);
      if (text && text.trim()) {
        addTranscript('Eureka', text, 'voice');
        logEvent(`Eureka: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      } else {
        console.log('[Frontend] Agent response was empty, skipping');
      }
    });

    // Agent starts speaking
    session.on('agent_start', (agent, context) => {
      console.log('[Frontend] Agent started speaking');
      logEvent('Agent is responding...');
    });

    // Audio stopped
    session.on('audio_stopped', () => {
      console.log('[Frontend] Audio stopped');
    });

    // History added - fires when new items are added (including user messages)
    session.on('history_added', (item) => {
      console.log('[Frontend] History item added:', item);

      // Check if this is a user message
      if (item.role === 'user' && item.content) {
        // Determine message type and extract text
        let textContent = '';
        let messageType = 'voice';

        for (const c of item.content) {
          if (c.type === 'input_text' || c.type === 'text') {
            textContent = c.text;
            messageType = 'text';
            break;
          }
          if (c.type === 'input_audio' && c.transcript) {
            textContent = c.transcript;
            messageType = 'voice';
            break;
          }
        }

        if (textContent) {
          addUserTranscript(textContent, item.itemId, messageType);
        } else {
          console.log('[Frontend] User message added but no transcript yet (transcript may arrive later)');
        }
      }
    });

    // History updated - fires when history changes (including transcript updates)
    session.on('history_updated', (history) => {
      console.log('[Frontend] History updated, length:', history.length);

      // Check ALL items in history for updated transcripts
      history.forEach((item, index) => {
        if (item.role === 'user' && item.content) {
          // Determine message type and extract text
          let textContent = '';
          let messageType = 'voice';

          for (const c of item.content) {
            if (c.type === 'input_text' || c.type === 'text') {
              textContent = c.text;
              messageType = 'text';
              break;
            }
            if (c.type === 'input_audio' && c.transcript) {
              textContent = c.transcript;
              messageType = 'voice';
              break;
            }
          }

          if (textContent) {
            console.log('[Frontend] Found transcript in history update:', textContent);
            addUserTranscript(textContent, item.itemId, messageType);
          }
        }
      });
    });

    // Listen for transport events to debug transcription
    session.on('transport_event', (event) => {
      // Only log transcription-related events
      if (event.type && event.type.includes('transcription')) {
        console.log('[Frontend] Transcription event:', event);
      }

      // Check for conversation item input audio transcription completed
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        console.log('[Frontend] Transcription completed:', event);
        const transcript = event.transcript;
        if (transcript) {
          addUserTranscript(transcript, event.item_id);
        }
      }
    });

    // Error handling
    session.on('error', (error) => {
      console.error('[Frontend] Session error:', error);
      updateStatus(`Error: ${error.message || JSON.stringify(error)}`, 'error');
      logEvent(`Error: ${error.message || JSON.stringify(error)}`);
      connectBtn.disabled = false;
    });

    // Connect with the ephemeral key and timeout detection
    console.log('[Frontend] Connecting to session with ephemeral key...');
    logEvent('Intentando conectar a OpenAI...');

    // Set a timeout to detect connection hang
    const connectionTimeout = setTimeout(() => {
      console.error('[Frontend] Connection timeout - no response after 15 seconds');
      logEvent('Timeout de conexión - revisá la consola para más detalles');
      updateStatus('Timeout de conexión - revisá la consola', 'error');
    }, 15000);

    try {
      await session.connect({
        apiKey: sessionData.value,
      });
      clearTimeout(connectionTimeout);
      console.log('[Frontend] session.connect() completed successfully');

      // Update UI immediately after successful connection
      isConnected = true;
      updateStatus('¡Conectada - Empezá a hablar o escribir!', 'success');
      disconnectBtn.disabled = false;
      connectBtn.disabled = true;
      messageInput.disabled = false;
      sendBtn.disabled = false;
      logEvent('¡Conexión establecida - Ya podés hablar o escribir!');

    } catch (connectError) {
      clearTimeout(connectionTimeout);
      console.error('[Frontend] Connection failed:', connectError);
      throw connectError;
    }

    logEvent('¡Audio activo - dale que arrancamos!');

  } catch (error) {
    console.error('Connection error:', error);
    updateStatus(`Error de conexión: ${error.message}`, 'error');
    connectBtn.disabled = false;
    logEvent(`Error de conexión: ${error.message}`);
  }
}

// Disconnect from the voice agent
async function disconnect() {
  if (session) {
    console.log('[Frontend] Disconnecting session...');

    try {
      // Remove all event listeners to prevent duplicates on reconnect
      session.off('agent_end');
      session.off('agent_start');
      session.off('audio_stopped');
      session.off('history_added');
      session.off('history_updated');
      session.off('transport_event');
      session.off('error');

      // Use the close() method to disconnect
      await session.close();
      console.log('[Frontend] Session closed successfully');
    } catch (disconnectError) {
      console.error('[Frontend] Disconnect error:', disconnectError);
    }

    session = null;
    isConnected = false;

    // Clear event deduplication cache on disconnect
    processedEvents.clear();

    // Reset UI
    updateStatus('Desconectada', 'info');
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    messageInput.disabled = true;
    sendBtn.disabled = true;
    messageInput.value = '';
    logEvent('Desconectada por el usuario');
  }
}

// Send text message through Realtime API
async function sendTextMessage() {
  const message = messageInput.value.trim();

  if (!message || !session || !isConnected) {
    return;
  }

  try {
    // Disable input while sending
    messageInput.disabled = true;
    sendBtn.disabled = true;

    console.log('[Frontend] Sending text message:', message);

    // Add user message to transcript immediately (deduplication will prevent duplicates)
    addTranscript('Tú', message, 'text');
    // Note: logEvent will be triggered by history_added listener to avoid duplicates

    // Send message through Realtime API
    await session.sendMessage(message);

    // Clear input
    messageInput.value = '';
    updateCharCounter();

    // Re-enable input
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();

    console.log('[Frontend] Text message sent successfully');

  } catch (error) {
    console.error('[Frontend] Error sending message:', error);
    logEvent(`Error al enviar mensaje: ${error.message}`);
    updateStatus(`Error: ${error.message}`, 'error');

    // Re-enable input even on error
    messageInput.disabled = false;
    updateSendButtonState();
  }
}

// Auto-resize textarea based on content
function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  const newHeight = Math.min(messageInput.scrollHeight, 150); // max 150px
  messageInput.style.height = newHeight + 'px';
}

// Update character counter
function updateCharCounter() {
  const length = messageInput.value.length;
  charCount.textContent = length;

  // Update counter styling based on length
  const counterElement = charCount.parentElement;
  counterElement.classList.remove('warning', 'error');

  if (length >= 1000) {
    counterElement.classList.add('error');
  } else if (length >= 900) {
    counterElement.classList.add('warning');
  }
}

// Update send button state based on input and connection
function updateSendButtonState() {
  sendBtn.disabled = !messageInput.value.trim() || !isConnected || messageInput.disabled;
}

// Event listeners
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);

// Text input event listeners
sendBtn.addEventListener('click', sendTextMessage);

// Enter key sends message (Shift+Enter for new line)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
});

// Update character counter and button state on input
messageInput.addEventListener('input', () => {
  updateCharCounter();
  autoResizeTextarea();
  updateSendButtonState();
});

// Log initial state
logEvent('Eureka inicializada - Asistente de Innovación Agrosuper');
updateStatus('Lista para conectar', 'info');
