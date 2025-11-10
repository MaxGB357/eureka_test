# Documentación Técnica - Eureka Voice Agent

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Backend](#backend)
4. [Frontend](#frontend)
5. [Flujos de Datos](#flujos-de-datos)
6. [Componentes Detallados](#componentes-detallados)
7. [Configuración](#configuración)
8. [Deployment](#deployment)

---

## Arquitectura General

### Descripción
Eureka es una aplicación de voz conversacional que utiliza la API Realtime de OpenAI para proporcionar una asistente virtual chilena especializada en proyectos de innovación para Agrosuper.

### Stack Tecnológico
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend (Local)**: Node.js, Express, TypeScript
- **Backend (Producción)**: Vercel Serverless Functions
- **API Externa**: OpenAI Realtime API (gpt-realtime)
- **Protocolo**: WebRTC (producción), WebSocket (alternativo)
- **Deployment**: Vercel
- **Control de Versiones**: Git, GitHub

### Flujo de Arquitectura

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Frontend   │────────▶│   Backend    │────────▶│   OpenAI API    │
│  (Browser)  │◀────────│  (Vercel)    │◀────────│   (Realtime)    │
└─────────────┘         └──────────────┘         └─────────────────┘
      │                                                   │
      │                                                   │
      └───────────────────WebRTC───────────────────────┘
                (Audio bidireccional)
```

---

## Estructura del Proyecto

```
eureka_test/
│
├── api/                          # Serverless functions (Vercel)
│   ├── session.ts               # Genera claves efímeras de OpenAI
│   └── health.ts                # Health check endpoint
│
├── src/                         # Servidor local (desarrollo)
│   └── server.ts                # Express server para desarrollo local
│
├── public/                      # Archivos estáticos del frontend
│   ├── index.html              # Interfaz de usuario principal
│   ├── agent.js                # Lógica del cliente y eventos
│   ├── eureka-avatar.png       # Imagen de Eureka
│   └── agrosuper-logo.png      # Logo de Agrosuper
│
├── package.json                 # Dependencias y scripts
├── tsconfig.json               # Configuración de TypeScript
├── vercel.json                 # Configuración de Vercel
├── .vercelignore              # Archivos excluidos del deployment
├── .gitignore                 # Archivos excluidos de Git
├── .env                       # Variables de entorno (local)
│
└── Documentación
    ├── DEPLOYMENT.md          # Guía de deployment
    ├── CONFIGURATION.md       # Guía de configuración
    └── DOCUMENTACION.md       # Este archivo
```

---

## Backend

### 1. Servidor Local - `src/server.ts`

**Propósito**: Servidor Express para desarrollo local.

**Puerto**: 3000 (configurable via `PORT` en `.env`)

#### Configuración Principal

```typescript
const app = express();
const PORT = process.env.PORT || 3000;
```

#### Middleware

```typescript
app.use(cors());                    // Permite requests cross-origin
app.use(express.json());            // Parse JSON bodies
app.use(express.static(...));       // Sirve archivos estáticos
```

#### Endpoints

##### POST `/api/session`

**Descripción**: Genera una clave efímera de OpenAI para el cliente.

**Request**:
- Method: POST
- Headers: `Content-Type: application/json`
- Body: Vacío

**Response Exitoso**:
```json
{
  "value": "ek_...",  // Clave efímera
  "expires_at": 1234567890
}
```

**Proceso Interno**:
1. Valida que `OPENAI_API_KEY` esté configurada
2. Construye configuración de sesión:
   ```typescript
   {
     session: {
       type: 'realtime',
       model: 'gpt-realtime'
     }
   }
   ```
3. Llama a OpenAI: `POST https://api.openai.com/v1/realtime/client_secrets`
4. Retorna la clave efímera al cliente

**Errores Posibles**:
- `500`: API key no configurada
- `4xx/5xx`: Error de OpenAI API

**Logging**:
```
[Backend] Requesting ephemeral key from OpenAI...
[Backend] Session config being sent: {...}
[Backend] Ephemeral key received: ek_xxxxxxxx...
```

##### GET `/api/health`

**Descripción**: Verifica que el servidor esté funcionando.

**Response**:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

---

### 2. Funciones Serverless (Vercel) - `api/`

#### `api/session.ts`

**Propósito**: Versión serverless del endpoint `/api/session` para producción.

**Diferencias con `src/server.ts`**:
- Usa `VercelRequest` y `VercelResponse`
- Incluye configuración CORS completa
- Maneja OPTIONS requests (CORS preflight)

**CORS Headers**:
```typescript
'Access-Control-Allow-Credentials': 'true'
'Access-Control-Allow-Origin': '*'
'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT'
'Access-Control-Allow-Headers': '...'
```

**Flujo**:
```
1. OPTIONS request → Return 200 (CORS preflight)
2. POST request → Validate method
3. Check OPENAI_API_KEY exists
4. Call OpenAI API
5. Return ephemeral key
```

#### `api/health.ts`

**Propósito**: Health check serverless para Vercel.

**Response**:
```json
{
  "status": "ok",
  "message": "Eureka API is running on Vercel"
}
```

---

## Frontend

### 1. HTML - `public/index.html`

#### Estructura del DOM

```html
<body>
  <div class="container">

    <!-- HEADER -->
    <div class="header">
      <img src="eureka-avatar.png" class="eureka-avatar">
      <div class="header-content">
        <h1>Asistente Eureka</h1>
        <img src="agrosuper-logo.png" class="agrosuper-logo">
      </div>
    </div>

    <!-- FEATURES -->
    <div class="features">
      <h3>Te ayudo con:</h3>
      <ul>
        <li>Postulación de Proyectos 2026</li>
        <li>Desarrollo de Ideas</li>
        <li>Validación de Propuestas</li>
        <li>Soporte Multiidioma</li>
      </ul>
    </div>

    <!-- CONTROLS -->
    <div class="controls">
      <button id="connectBtn">Conectar & Empezar a Charlar</button>
      <button id="disconnectBtn" disabled>Desconectar</button>
    </div>

    <!-- STATUS -->
    <div id="status" class="status info">Lista para conectar</div>

    <!-- CONTENT -->
    <div class="content">
      <!-- Transcripción -->
      <div class="panel">
        <h2>Conversación</h2>
        <div id="transcript">
          <div class="empty-state">
            Empezá a hablar o escribir para ver la conversación acá...
          </div>
        </div>
      </div>

      <!-- Eventos -->
      <div class="panel">
        <h2>Registro de Eventos</h2>
        <div id="events"></div>
      </div>
    </div>

    <!-- CHAT INPUT -->
    <div class="chat-input-section">
      <div class="input-container">
        <div class="input-wrapper">
          <textarea id="messageInput"
                    placeholder="Escribí un mensaje..."
                    maxlength="1000"
                    disabled></textarea>
          <div class="char-counter">
            <span id="charCount">0</span> / 1000
          </div>
        </div>
        <button id="sendBtn" disabled>Enviar</button>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p>Asegurate de tener el micrófono habilitado.
         Podés hablar o escribir para interactuar con la asistente.</p>
    </div>

  </div>

  <script type="module" src="agent.js"></script>
</body>
```

#### Elementos Clave

| ID | Elemento | Propósito |
|---|---|---|
| `connectBtn` | Button | Iniciar conexión con OpenAI |
| `disconnectBtn` | Button | Cerrar conexión |
| `status` | Div | Mostrar estado de conexión |
| `transcript` | Div | Mensajes de conversación |
| `events` | Div | Log de eventos del sistema |
| `messageInput` | Textarea | Input de texto del usuario |
| `sendBtn` | Button | Enviar mensaje de texto |
| `charCount` | Span | Contador de caracteres |

---

### 2. CSS - Estilos Inline en `index.html`

#### Sistema de Colores

```css
/* Gradiente principal */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Estados */
.status.info    { background: #dbeafe; color: #1e40af; }
.status.success { background: #d1fae5; color: #065f46; }
.status.error   { background: #fee2e2; color: #991b1b; }

/* Mensajes */
.message.user  { background: #dbeafe; border-left: 4px solid #3b82f6; }
.message.agent { background: #f3e8ff; border-left: 4px solid #a855f7; }
```

#### Layout Responsive

```css
/* Desktop: Grid de 2 columnas */
.content {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

/* Mobile: 1 columna */
@media (max-width: 768px) {
  .content {
    grid-template-columns: 1fr;
  }
}
```

#### Componentes Principales

**Header**:
- Flexbox horizontal con avatar y contenido
- Avatar circular (120px) con fondo blanco
- Logo Agrosuper (50px altura)

**Chat Input**:
- Textarea auto-resize (min: 50px, max: 150px)
- Contador de caracteres con colores:
  - Normal: `#6b7280`
  - Warning (900+): `#f59e0b`
  - Error (1000): `#ef4444`

**Animaciones**:
```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### 3. JavaScript - `public/agent.js`

#### Imports

```javascript
import { RealtimeAgent, RealtimeSession, tool }
  from 'https://cdn.jsdelivr.net/npm/@openai/agents-realtime@0.1.0/+esm';
import { z }
  from 'https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm';
```

**Por qué CDN**: Vercel sirve archivos estáticos, no tiene build step para node_modules.

---

#### Herramientas (Tools)

##### 1. `getWeatherTool`

```javascript
const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the current weather for a location',
  parameters: z.object({
    location: z.string().describe('The city and state, e.g. San Francisco, CA'),
    unit: z.enum(['celsius', 'fahrenheit']).optional().default('fahrenheit'),
  }),
  execute: async ({ location, unit }) => {
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
```

**Nota**: Actualmente retorna datos simulados. En producción debería llamar a una API meteorológica real.

##### 2. `getCurrentTimeTool`

```javascript
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
```

##### 3. `calculateTool`

```javascript
const calculateTool = tool({
  name: 'calculate',
  description: 'Perform a mathematical calculation',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate'),
  }),
  execute: async ({ expression }) => {
    try {
      const result = Function('"use strict"; return (' + expression + ')')();
      return { expression, result };
    } catch (error) {
      return { expression, error: 'Invalid expression' };
    }
  },
});
```

**Seguridad**: Usa `Function()` en modo estricto. Solo para cálculos básicos.

---

#### Configuración del Agente

```javascript
const agent = new RealtimeAgent({
  name: 'Eureka',
  instructions: `
    # IDENTIDAD
    Eres Eureka, asistente de innovación de Agrosuper...

    # IDIOMAS
    Español (chileno), inglés, chino, italiano, japonés, coreano

    # FLUJO
    1. Saludo y nombre
    2. Validación de alcance
    3. Desarrollo de idea
    4. Nombre del proyecto
    5. Implementación
    6. Impacto
    7. Datos del colaborador
    8. Revisión
    9. Paya chilena de recompensa

    # TONO
    Humor sarcástico, chileno, no corporativo
  `,
  tools: [getWeatherTool, getCurrentTimeTool, calculateTool],
  voice: 'shimmer',
  temperature: 0.9,
});
```

**Parámetros Clave**:
- **name**: Nombre del agente
- **instructions**: Prompt del sistema (define personalidad y comportamiento)
- **tools**: Funciones que el agente puede llamar
- **voice**: Voz TTS (shimmer = femenina, cálida)
- **temperature**: 0.9 = alta creatividad y expresividad

---

#### Variables Globales

```javascript
// UI elements
let session = null;              // RealtimeSession activa
let isConnected = false;         // Estado de conexión

const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const eventsDiv = document.getElementById('events');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const charCount = document.getElementById('charCount');

// Deduplicación
const processedMessages = new Set();  // Mensajes de conversación
const processedEvents = new Set();    // Eventos del sistema
```

---

#### Funciones Auxiliares

##### `formatTimestamp()`

```javascript
function formatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}
```

**Retorna**: `"14:23:45"`

##### `updateStatus(message, type)`

```javascript
function updateStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}
```

**Tipos**: `'info'`, `'success'`, `'error'`

**Actualiza**: Barra de estado superior

##### `addTranscript(role, text, messageType, itemId)`

```javascript
function addTranscript(role, text, messageType = 'voice', itemId = null) {
  // Validación
  if (!text || !text.trim()) {
    return;
  }

  // Deduplicación
  const contentKey = `${role}-${text}-${messageType}`;
  const itemKey = itemId ? `${itemId}` : null;

  if (processedMessages.has(contentKey) ||
      (itemKey && processedMessages.has(itemKey))) {
    return;
  }

  processedMessages.add(contentKey);
  if (itemKey) processedMessages.add(itemKey);

  // Crear mensaje
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
```

**Parámetros**:
- `role`: "Tú" o "Eureka"
- `text`: Contenido del mensaje
- `messageType`: "text" o "voice"
- `itemId`: ID único del item (para deduplicación)

**Deduplicación**:
- Usa contenido + tipo como clave
- Previene mensajes duplicados
- Mantiene Set de mensajes procesados

##### `logEvent(event)`

```javascript
function logEvent(event) {
  if (!event || !event.trim()) {
    return;
  }

  // Deduplicación con ventana de tiempo de 1 segundo
  const now = Date.now();
  const eventKey = `${event}-${Math.floor(now / 1000)}`;

  if (processedEvents.has(eventKey)) {
    return;
  }

  processedEvents.add(eventKey);

  // Auto-limpieza después de 5 segundos
  setTimeout(() => {
    processedEvents.delete(eventKey);
  }, 5000);

  const eventDiv = document.createElement('div');
  eventDiv.className = 'event';
  eventDiv.textContent = `[${new Date().toLocaleTimeString()}] ${event}`;
  eventsDiv.appendChild(eventDiv);
  eventsDiv.scrollTop = eventsDiv.scrollHeight;
}
```

**Deduplicación Temporal**:
- Ventana de 1 segundo
- Eventos idénticos ignorados dentro de la ventana
- Auto-limpieza para evitar fuga de memoria

---

#### Función Principal: `connect()`

```javascript
async function connect() {
  try {
    // 1. Actualizar UI
    updateStatus('Conectando...', 'info');
    connectBtn.disabled = true;
    logEvent('Solicitando token de sesión del servidor...');

    // 2. Determinar URL del API
    const apiUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3000/api/session'
      : '/api/session';

    // 3. Solicitar clave efímera
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Error al obtener el token de sesión');
    }

    const sessionData = await response.json();
    logEvent('Token de sesión recibido');

    // 4. Crear sesión
    session = new RealtimeSession(agent, {
      model: 'gpt-realtime',
    });

    // 5. Registrar event listeners
    setupEventListeners();

    // 6. Conectar con timeout
    const connectionTimeout = setTimeout(() => {
      logEvent('Timeout de conexión');
      updateStatus('Timeout de conexión', 'error');
    }, 15000);

    await session.connect({
      apiKey: sessionData.value,
    });

    clearTimeout(connectionTimeout);

    // 7. Actualizar UI al conectar
    isConnected = true;
    updateStatus('¡Conectada - Empezá a hablar o escribir!', 'success');
    disconnectBtn.disabled = false;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    logEvent('¡Conexión establecida!');

  } catch (error) {
    console.error('Connection error:', error);
    updateStatus(`Error de conexión: ${error.message}`, 'error');
    connectBtn.disabled = false;
    logEvent(`Error de conexión: ${error.message}`);
  }
}
```

**Flujo Detallado**:

1. **Preparación UI**: Deshabilita botón, muestra "Conectando..."
2. **URL dinámica**: Local vs producción
3. **Fetch ephemeral key**: POST a backend
4. **Crear RealtimeSession**: Con modelo gpt-realtime
5. **Event listeners**: Registra todos los listeners
6. **Conectar WebRTC**: Con timeout de 15s
7. **UI conectada**: Habilita inputs, actualiza estado

**Manejo de Errores**:
- Timeout de 15 segundos
- Captura errores de fetch
- Captura errores de conexión
- Actualiza UI en cada caso

---

#### Event Listeners

##### `agent_end` - Agente terminó de hablar

```javascript
session.on('agent_end', (agent, context, text) => {
  if (text && text.trim()) {
    addTranscript('Eureka', text, 'voice');
    logEvent(`Eureka: ${text.substring(0, 50)}...`);
  }
});
```

**Cuándo se dispara**: Cuando Eureka termina de generar una respuesta

**Acción**: Agregar mensaje al transcript

##### `agent_start` - Agente empezó a hablar

```javascript
session.on('agent_start', (agent, context) => {
  logEvent('Agent is responding...');
});
```

**Cuándo se dispara**: Cuando Eureka empieza a generar respuesta

##### `history_added` - Item agregado al historial

```javascript
session.on('history_added', (item) => {
  if (item.role === 'user' && item.content) {
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
    }
  }
});
```

**Cuándo se dispara**: Cuando se agrega un mensaje al historial

**Detecta**: Si es texto o voz basado en `content.type`

##### `history_updated` - Historial actualizado

```javascript
session.on('history_updated', (history) => {
  history.forEach((item) => {
    if (item.role === 'user' && item.content) {
      // Similar a history_added
      // Busca transcripciones que llegaron tarde
    }
  });
});
```

**Cuándo se dispara**: Cuando se actualiza el historial (ej: transcripción llega después)

##### `transport_event` - Evento de transporte

```javascript
session.on('transport_event', (event) => {
  if (event.type && event.type.includes('transcription')) {
    console.log('[Frontend] Transcription event:', event);
  }

  if (event.type === 'conversation.item.input_audio_transcription.completed') {
    const transcript = event.transcript;
    if (transcript) {
      addUserTranscript(transcript, event.item_id);
    }
  }
});
```

**Cuándo se dispara**: Eventos de bajo nivel del protocolo

**Captura**: Eventos de transcripción

##### `error` - Errores de sesión

```javascript
session.on('error', (error) => {
  console.error('[Frontend] Session error:', error);
  updateStatus(`Error: ${error.message}`, 'error');
  logEvent(`Error: ${error.message}`);
  connectBtn.disabled = false;
});
```

---

#### Función: `disconnect()`

```javascript
async function disconnect() {
  if (session) {
    try {
      // 1. Remover listeners (CRÍTICO para evitar duplicación)
      session.off('agent_end');
      session.off('agent_start');
      session.off('audio_stopped');
      session.off('history_added');
      session.off('history_updated');
      session.off('transport_event');
      session.off('error');

      // 2. Cerrar sesión
      await session.close();

    } catch (disconnectError) {
      console.error('[Frontend] Disconnect error:', disconnectError);
    }

    // 3. Limpiar estado
    session = null;
    isConnected = false;
    processedEvents.clear();

    // 4. Actualizar UI
    updateStatus('Desconectada', 'info');
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    messageInput.disabled = true;
    sendBtn.disabled = true;
    messageInput.value = '';
    logEvent('Desconectada por el usuario');
  }
}
```

**Pasos Críticos**:
1. **session.off()**: Remover todos los listeners (evita duplicación)
2. **session.close()**: Cerrar conexión WebRTC
3. **Limpiar cache**: Borrar eventos procesados
4. **Reset UI**: Restaurar estado inicial

---

#### Función: `sendTextMessage()`

```javascript
async function sendTextMessage() {
  const message = messageInput.value.trim();

  if (!message || !session || !isConnected) {
    return;
  }

  try {
    // Deshabilitar input
    messageInput.disabled = true;
    sendBtn.disabled = true;

    // Agregar a transcript (deduplicación previene duplicados)
    addTranscript('Tú', message, 'text');

    // Enviar a través de Realtime API
    await session.sendMessage(message);

    // Limpiar y re-habilitar
    messageInput.value = '';
    updateCharCounter();
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();

  } catch (error) {
    console.error('[Frontend] Error sending message:', error);
    logEvent(`Error al enviar mensaje: ${error.message}`);
    updateStatus(`Error: ${error.message}`, 'error');
    messageInput.disabled = false;
    updateSendButtonState();
  }
}
```

**Flujo**:
1. Validar mensaje no vacío
2. Deshabilitar controles
3. Agregar a transcript inmediatamente
4. Enviar vía `session.sendMessage()`
5. Limpiar input
6. Re-habilitar controles

**Nota**: No llama a `logEvent()` para evitar duplicación. El evento se registra vía listener `history_added`.

---

#### Función: `autoResizeTextarea()`

```javascript
function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  const newHeight = Math.min(messageInput.scrollHeight, 150);
  messageInput.style.height = newHeight + 'px';
}
```

**Cómo funciona**:
1. Reset height a `auto`
2. Lee `scrollHeight` (altura del contenido)
3. Limita a máximo 150px
4. Aplica nueva altura

**Resultado**: Textarea crece con el contenido hasta 150px

---

#### Función: `updateCharCounter()`

```javascript
function updateCharCounter() {
  const length = messageInput.value.length;
  charCount.textContent = length;

  const counterElement = charCount.parentElement;
  counterElement.classList.remove('warning', 'error');

  if (length >= 1000) {
    counterElement.classList.add('error');
  } else if (length >= 900) {
    counterElement.classList.add('warning');
  }
}
```

**Estados**:
- **Normal** (0-899): Color gris
- **Warning** (900-999): Color naranja
- **Error** (1000): Color rojo, no permite más caracteres

---

#### Función: `updateSendButtonState()`

```javascript
function updateSendButtonState() {
  sendBtn.disabled = !messageInput.value.trim() ||
                     !isConnected ||
                     messageInput.disabled;
}
```

**Condiciones para habilitar**:
- Input no vacío
- Sesión conectada
- Input no deshabilitado

---

#### Event Listeners del DOM

```javascript
// Botones de conexión
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);

// Botón de envío
sendBtn.addEventListener('click', sendTextMessage);

// Enter para enviar (Shift+Enter = nueva línea)
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
});

// Auto-resize y contador
messageInput.addEventListener('input', () => {
  updateCharCounter();
  autoResizeTextarea();
  updateSendButtonState();
});
```

---

## Flujos de Datos

### Flujo 1: Conexión Inicial

```
┌──────────┐
│  Usuario │
│  Click   │
│ Connect  │
└────┬─────┘
     │
     ▼
┌──────────────────────────┐
│  connect()               │
│  - Fetch ephemeral key   │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│  Backend                 │
│  /api/session            │
│  - Call OpenAI API       │
│  - Return ek_...         │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│  Frontend                │
│  - Create session        │
│  - Setup listeners       │
│  - session.connect()     │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│  WebRTC Connection       │
│  to OpenAI               │
│  - Audio streaming       │
└──────────────────────────┘
```

---

### Flujo 2: Mensaje de Voz

```
┌──────────┐
│ Usuario  │
│  Habla   │
└────┬─────┘
     │
     ▼
┌────────────────────┐
│  Micrófono         │
│  - Captura audio   │
└────┬───────────────┘
     │
     ▼
┌────────────────────────┐
│  WebRTC → OpenAI       │
│  - Streaming audio     │
│  - Whisper transcribe  │
└────┬───────────────────┘
     │
     ▼
┌────────────────────────────┐
│  OpenAI Realtime API       │
│  - Procesa audio           │
│  - Genera respuesta        │
│  - TTS (text-to-speech)    │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  Frontend Listeners        │
│  - history_added           │
│  - transport_event         │
│  - agent_end               │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  UI Update                 │
│  - addTranscript()         │
│  - logEvent()              │
│  - Audio playback          │
└────────────────────────────┘
```

---

### Flujo 3: Mensaje de Texto

```
┌──────────┐
│ Usuario  │
│  Escribe │
│  + Enter │
└────┬─────┘
     │
     ▼
┌──────────────────────────┐
│  sendTextMessage()       │
│  - Validar input         │
│  - addTranscript()       │
└────┬─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│  session.sendMessage()   │
│  - Envía texto vía API   │
└────┬─────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  OpenAI Realtime API       │
│  - Procesa texto           │
│  - Genera respuesta        │
│  - TTS                     │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  Frontend Listeners        │
│  - history_added           │
│    (NO registra log,       │
│     ya se hizo manual)     │
│  - agent_end               │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  UI Update                 │
│  - addTranscript(Eureka)   │
│  - logEvent(Eureka)        │
│  - Audio playback          │
└────────────────────────────┘
```

---

### Flujo 4: Llamada a Herramienta

```
┌──────────┐
│ Usuario  │
│ "¿Clima?"│
└────┬─────┘
     │
     ▼
┌────────────────────────────┐
│  OpenAI Realtime API       │
│  - Identifica intención    │
│  - Decide llamar tool      │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  Frontend                  │
│  - getWeatherTool.execute()│
│  - Return data             │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  OpenAI Realtime API       │
│  - Recibe resultado        │
│  - Genera respuesta        │
│    natural con los datos   │
└────┬───────────────────────┘
     │
     ▼
┌────────────────────────────┐
│  Frontend                  │
│  - agent_end listener      │
│  - addTranscript()         │
│  - Audio playback          │
└────────────────────────────┘
```

---

## Componentes Detallados

### Sistema de Deduplicación

#### Problema
Los event listeners pueden dispararse múltiples veces para el mismo evento, causando mensajes y logs duplicados.

#### Solución 1: Mensajes de Conversación

```javascript
const processedMessages = new Set();

function addTranscript(role, text, messageType, itemId) {
  // Clave basada en contenido
  const contentKey = `${role}-${text}-${messageType}`;

  // Clave basada en ID (si disponible)
  const itemKey = itemId ? `${itemId}` : null;

  // Verificar duplicación
  if (processedMessages.has(contentKey) ||
      (itemKey && processedMessages.has(itemKey))) {
    return; // Ignorar duplicado
  }

  // Marcar como procesado
  processedMessages.add(contentKey);
  if (itemKey) processedMessages.add(itemKey);

  // Agregar mensaje
  // ...
}
```

**Estrategia**:
- Doble verificación: por contenido Y por ID
- Set permanente (no se limpia, excepto en reconnect)
- Previene duplicados idénticos

#### Solución 2: Eventos del Sistema

```javascript
const processedEvents = new Set();

function logEvent(event) {
  // Clave con ventana de tiempo
  const eventKey = `${event}-${Math.floor(Date.now() / 1000)}`;

  if (processedEvents.has(eventKey)) {
    return; // Ignorar duplicado
  }

  processedEvents.add(eventKey);

  // Auto-limpieza
  setTimeout(() => {
    processedEvents.delete(eventKey);
  }, 5000);

  // Agregar evento
  // ...
}
```

**Estrategia**:
- Ventana de tiempo de 1 segundo
- Auto-limpieza después de 5 segundos
- Permite repetir el mismo evento después de 5s
- Previene fuga de memoria

---

### Sistema de Auto-resize

```javascript
function autoResizeTextarea() {
  // 1. Reset height para obtener scrollHeight correcto
  messageInput.style.height = 'auto';

  // 2. Calcular nueva altura (contenido actual)
  const newHeight = Math.min(messageInput.scrollHeight, 150);

  // 3. Aplicar nueva altura
  messageInput.style.height = newHeight + 'px';
}
```

**Triggering**:
```javascript
messageInput.addEventListener('input', autoResizeTextarea);
```

**Límites**:
- Mínimo: 50px (CSS: `min-height`)
- Máximo: 150px (JavaScript limit)

---

### Sistema de Validación de Input

```javascript
function updateSendButtonState() {
  sendBtn.disabled =
    !messageInput.value.trim() ||  // Input vacío
    !isConnected ||                // No conectado
    messageInput.disabled;         // Input deshabilitado
}
```

**Actualizado en**:
- `input` event del textarea
- Después de `connect()`
- Después de `sendTextMessage()`
- Después de errores

---

## Configuración

### Variables de Entorno

#### Local (`.env`)

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-proj-...

# Server Port
PORT=3000
```

#### Producción (Vercel Dashboard)

```
OPENAI_API_KEY = sk-proj-...
```

**Cómo configurar**:
1. Vercel Dashboard → Project → Settings
2. Environment Variables → Add New
3. Seleccionar: Production, Preview, Development
4. Redeploy

---

### Configuración de OpenAI

#### Modelo

**Archivo**: `api/session.ts` (línea 38), `src/server.ts` (línea 39), `public/agent.js` (línea 329)

```typescript
model: 'gpt-realtime'
```

**Alternativas**:
- `gpt-4o-realtime-preview-2024-12-17` (específico)
- `gpt-realtime` (alias a la última versión)

#### Voz

**Archivo**: `public/agent.js` (línea 193)

```javascript
voice: 'shimmer'
```

**Opciones**:
- `alloy`: Neutral
- `echo`: Clara
- `shimmer`: Cálida, femenina ✓
- `verse`: Articulada
- `ash`: Conversacional

#### Temperatura

**Archivo**: `public/agent.js` (línea 194)

```javascript
temperature: 0.9
```

**Rango**: 0.0 (determinístico) a 1.0 (creativo)

**Actual**: 0.9 = Alta creatividad y expresividad (apropiado para personalidad sarcástica)

---

### Configuración de Vercel

#### `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "public/**",
      "use": "@vercel/static"
    },
    {
      "src": "api/**/*.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ]
}
```

**Explicación**:
- **builds**: Define qué construir
  - `public/**`: Archivos estáticos
  - `api/**/*.ts`: Funciones serverless TypeScript
- **routes**: Define el routing
  - `/api/*`: → Funciones serverless
  - `/*`: → Archivos estáticos

#### `.vercelignore`

```
# Dependencies
node_modules
*.log

# Environment
.env
.env.*

# Build
dist/
*.tsbuildinfo

# Development
src/
README.md
```

**Propósito**: Excluir archivos innecesarios del deployment

---

## Deployment

### Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar .env
echo "OPENAI_API_KEY=sk-proj-..." > .env

# 3. Iniciar servidor
npm run dev

# 4. Abrir navegador
# http://localhost:3000
```

### Producción (Vercel)

#### Via GitHub

```bash
# 1. Commit y push
git add .
git commit -m "Deploy"
git push origin main

# 2. Vercel auto-deploys
# Verifica en dashboard
```

#### Via CLI

```bash
# 1. Login
vercel login

# 2. Deploy
vercel --prod

# 3. Configurar env
vercel env add OPENAI_API_KEY
```

---

## Troubleshooting

### Problema: Eventos Duplicados

**Síntoma**: Mensajes aparecen 2-3 veces en Registro de Eventos

**Causa**: Event listeners no se remueven al desconectar

**Solución**:
```javascript
// En disconnect()
session.off('agent_end');
session.off('history_added');
// ... todos los listeners
```

---

### Problema: Transcripciones no aparecen

**Síntoma**: Audio funciona pero no hay texto en transcript

**Causa**: Transcripción deshabilitada o evento no capturado

**Debug**:
```javascript
// Revisar console
[Frontend] Transcription event: {...}
[Frontend] Adding user transcript: ...
```

**Solución**: Verificar listeners `history_added` y `transport_event`

---

### Problema: "OpenAI API key not configured"

**Síntoma**: Error 500 al conectar

**Causa**: Variable de entorno no configurada

**Solución Local**:
```bash
# Verifica .env existe
cat .env

# Debe tener
OPENAI_API_KEY=sk-proj-...
```

**Solución Vercel**:
```
Settings → Environment Variables → Add
OPENAI_API_KEY = sk-proj-...
```

---

### Problema: Textarea no auto-resize

**Síntoma**: Textarea no crece con contenido

**Causa**: Event listener no registrado

**Solución**:
```javascript
messageInput.addEventListener('input', () => {
  autoResizeTextarea();  // Debe estar aquí
  updateCharCounter();
  updateSendButtonState();
});
```

---

### Problema: Botón "Enviar" siempre deshabilitado

**Síntoma**: No se puede enviar texto

**Causa**: `isConnected` es false o input vacío

**Debug**:
```javascript
console.log('Connected:', isConnected);
console.log('Input:', messageInput.value);
console.log('Disabled:', sendBtn.disabled);
```

**Solución**: Verificar que `connect()` complete exitosamente

---

## Glosario

| Término | Definición |
|---------|------------|
| **Ephemeral Key** | Clave temporal de OpenAI (ek_...) con expiración, usada para conexiones WebRTC desde el navegador |
| **WebRTC** | Protocolo de comunicación en tiempo real para audio/video |
| **Realtime API** | API de OpenAI para conversaciones de voz en tiempo real |
| **Serverless Function** | Función que se ejecuta bajo demanda en la nube (Vercel) |
| **Event Listener** | Función que escucha eventos del sistema |
| **Deduplicación** | Proceso de eliminar duplicados |
| **Transcript** | Texto transcrito de audio |
| **TTS** | Text-to-Speech (texto a voz) |
| **STT** | Speech-to-Text (voz a texto) |
| **Tool** | Función que el agente puede llamar |
| **Temperature** | Parámetro que controla creatividad (0.0-1.0) |
| **CORS** | Cross-Origin Resource Sharing (política de seguridad) |

---

## Recursos Adicionales

### Documentación Externa
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Vercel Deployment Docs](https://vercel.com/docs)
- [MDN WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

### Archivos de Documentación Interna
- `DEPLOYMENT.md`: Guía paso a paso de deployment
- `CONFIGURATION.md`: Configuración detallada de voz, modelo, etc.
- `README.md`: Información general del proyecto

---

## Changelog

### v1.0.0 (2025-01-10)
- ✅ Implementación inicial
- ✅ Configuración de Eureka (personalidad chilena)
- ✅ Voice + Text input
- ✅ Deduplicación de mensajes y eventos
- ✅ Auto-resize textarea
- ✅ Deployment a Vercel
- ✅ Branding (Eureka avatar + Agrosuper logo)

---

## Contacto y Soporte

**Proyecto**: Eureka Voice Agent
**Cliente**: Agrosuper
**Repositorio**: https://github.com/MaxGB357/eureka_test
**Branch**: claude/build-voice-agent-011CUrtsyyEfdYZSZQ8nhBpb

---

*Documentación generada el 2025-01-10*
