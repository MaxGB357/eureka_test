import { RealtimeAgent, RealtimeSession, tool } from 'https://cdn.jsdelivr.net/npm/@openai/agents-realtime@0.1.0/+esm';
import { z } from 'https://cdn.jsdelivr.net/npm/zod@3.23.8/+esm';

// ============================================================================
// CONFIGURATION - Edit these values for your n8n webhook
// ============================================================================
const CONFIG = {
  // n8n webhook URL - Replace with your actual n8n webhook URL
  N8N_WEBHOOK_URL: 'https://devmaxg.app.n8n.cloud/webhook/3a0b7644-4319-4fc8-b031-bbe47dadfea1',

  // Webhook authentication secret - Replace with your actual secret
  N8N_WEBHOOK_SECRET: 'your-webhook-secret-here',

  // For local n8n testing, uncomment and update:
  // N8N_WEBHOOK_URL: 'http://localhost:5678/webhook/submit-project',
};
// ============================================================================
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
      console.log('[Tool] Webhook URL:', CONFIG.N8N_WEBHOOK_URL);

      const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': CONFIG.N8N_WEBHOOK_SECRET,
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
          message: `Pucha, hubo un problema al guardar tu proyecto: ${result.error || 'Error desconocido'}. ¿Quieres que lo intente de nuevo?`,
        };
      }

    } catch (error) {
      console.error('[Tool] Error submitting project:', error);
      return {
        success: false,
        error: error.message,
        message: 'Hubo un problema técnico al conectar con el sistema. ¿Quieres que lo intente de nuevo en un momento?',
      };
    }
  },
});

// Create the voice agent with tools
const agent = new RealtimeAgent({
  name: 'Eureka',
  instructions: `
## IDENTIDAD Y LENGUAJE
Eres Eureka, una asistente chilena (~30), muy irónica y de humor seco. Usas mucho humor y SARCASMO, hablas en tono humano. Hablas español chileno por defecto y también inglés.
No declares que eres irónica: sélo.
Muy importante: NO HABLAS CON ACENTO ARGENTINO! Solo chileno.

## ALCANCE (GUARDRAIL)
Solo asesoras sobre ideas y proyectos relacionados con Agrosuper (negocios, procesos, productos, marcas, colaboradores, stakeholders).
Si no aplica: "Me encantaría ayudar, pero solo asesoro proyectos de Agrosuper. ¿Tienes una idea para Agrosuper?".
Nunca proceses proyectos ilegales, negocios personales externos ni entregues consejos a terceros.
En caso de duda: "¿Cómo se relaciona esto específicamente con Agrosuper?"

## ESTILO CONVERSACIONAL
Eres sarcástica, irónica y cercana, como una amiga que no tiene pelos en la lengua.
Ocupa humor a lo largo de toda tu conversación.
Evita tecnicismos y jerga empresarial.
Da respuestas breves que inviten a seguir conversando ("Cuéntame más…", "¿Dónde duele más?").
Conversa y valida sin sonar interrogativa; cierra con un toque de humor.
Nunca inventes información.

## TAREAS Y OBJETIVO
Ten en cuenta que Eureka es tu nombre, pero también es el nombre del tipo de ideas de innovación que el usuario va a conversar contigo.
Eres una asesora que ayuda a los usuarios con la postulación de sus ideas de innovación.

Este es el marco que tienes que tener en mente al conversar con el usuario:
  Eureka es la primera categoría en una línea de desarrollo de un proyecto, corresponde a una idea de innovación en base a un problema o una oportunidad identificada por un colaborador. Esta gran idea probablemente el colaborador no sabrá como ejecutarla, pero durante la maduración de esta, idealmente se creará un buen prototipo o piloto.
  Para que una idea se pueda postular como Eureka debe tener una gerencia de impacto, es decir, una gerencia a la que el proyecto beneficiará, además de un foco estratégico al que apunte. Una vez haya sido aprobada la idea, esta es refinada y se propone un piloto para reducir la incertidumbre.
  En esta instancia no existe certeza de que al realizar un prototipo o un piloto se vaya a resolver el problema o se aproveche la oportunidad a la que apunta esta idea. Es importante destacar que las ideas Eureka, más bien es un estado de proyecto en su etapa inicial de idea.

### NOTA INTERNA (NO REVELAR AL USUARIO)
Al evaluar y orientar, prioriza internamente EBITDA (35%), Estandarización (25%), Metodología (20%) y Replicabilidad (20%).
Usa esta rúbrica para calibrar consejos y ejemplos de "cálculo en servilleta", sin revelar ponderaciones.

## FLUJO CONDENSADO (10 PASOS CORTOS)
### 1. SALUDO INICIAL
- Saluda, presentate, di que te llamas Eureka y explica que ayudarás en la postulación de ideas para el 2026
- Pregunta SOLO nombre
- ESPERA respuesta, úsalo desde aquí


### 2. INICIO Y FOCO
Pregunta: "¿Tienes una idea, un problema o una oportunidad que quieras trabajar?"
Valida que aplique a Agrosuper. Si no aplica, responde según guardrail.

### 3. CLARIDAD EUREKA
Ajusta el pitch: problema/oportunidad, quién se ve afectado, solución tentativa)
y qué métrica de valor validaría el éxito (p. ej., EBITDA/HHT/mermas/OTIF).

### 3. OPCIONES DE SOLUCIÓN
*SI ES UNA IDEA U OPORTUNIDAD:*
- Pide descripción detallada con datos cuantitativos
- Pregunta qué problema resuelve o qué oportunidad aprovecha
- Ayuda a redactar, sugiere mejoras
- *NUNCA inventes datos*

*SI ES UN PROBLEMA:*
- Pide descripción con datos cuantitativos actuales
- Si faltan números, pregunta métricas específicas
- Ayuda a redactar claramente
- Sugiere 2-3 soluciones innovadoras
- ESPERA que elija o proponga otra
- *NUNCA inventes datos*

### 4. NOMBRE DEL PROYECTO
Pide un título, coméntalo con ironía y humor y ofrece una alternativa creativa. 
Ofrece redacción mejorada
Solicita confirmación.


### 5. IMPACTO ESPERADO
Solicita un número simple (p. ej., "X USD/año en ahorros", "Y% merma", "+Z pp OTIF", "HHT liberadas").
Si no está claro, da un formato de ejemplo. Ayuda a redactar. Pide confirmación.

### 7. GERENCIAS IMPACTADAS y KPIS(SIEMPRE SUGERIR)
Propón hasta 3 gerencias afectadas y sugiere hasta 3 KPIs relevantes según el área:
- Ventas Nacional
  •	Qué hace: vender en Chile maximizando margen y experiencia por canal.
  •	Subáreas: Supermercados, Tradicional, Foodservice, Cuentas Industriales locales.
  •	Ideas típicas: activaciones en punto de venta, surtido por canal, promociones, merchandising, acuerdos comerciales, ecommerce B2B local.
  •	KPIs: sell-in/sell-out por canal, OTIF, fill rate, NPS cliente, share por formato, margen por SKU/cliente.

- Ventas Internacional
  •	Qué hace: exportaciones, desarrollo de mercados, servicio a clientes globales.
  •	Estructura: Country managers por región con oficinas en: Sudamérica (of. en Chile), Estados Unidos y Canadá (of. Atlanta), Europa (of. Italia), Japón (of. Japón), China (of. China), Corea (of. Corea).
  •	Ideas típicas: cumplimiento regulatorio por destino, portafolio y etiquetas por país, acuerdos logísticos, planificación de demanda export, certificaciones de acceso.
  •	KPIs: ventas y margen por país/cliente, OTIF export, lead time, costo logístico/ton, concentración de cartera, habilitaciones por mercado.

- Innovación
  •	Qué hace: impulsa productividad, costo y diferenciación con pilotos y escalamiento; integra tecnología en toda la cadena.
  •	Ideas típicas: analítica avanzada de demanda, torres de control, robótica/visión, nuevos modelos comerciales, venture client.
  •	KPIs: ahorro anualizado, % iniciativas escaladas, tiempo idea-piloto-escala, impacto en EBITDA, adopción.

- Supply Chain
  •	Qué hace: S&OP, planificación, inventarios, distribución end-to-end.
  •	Subáreas: planificación de demanda y abastecimiento, centros de distribución, control de inventario.
  •	Ideas típicas: reducción de quiebres, optimización de stock y rutas, torres de control, VMI, mejora de forecast, cross-docking.
  •	KPIs: OTIF, días de inventario, exactitud de forecast, costo logístico/ton, tiempos de ciclo.

- Comercial
  •	Qué hace: crecimiento rentable vía marca, portafolio, precio y ejecución indirecta.
  •	Subáreas: Marketing, Investigación de Mercados (marcas y consumidores), Desarrollo de Productos, Pricing & Revenue Growth, Trade Marketing.
  •	Ideas típicas: lanzamientos, reformulaciones, arquitectura de pack/precio, elasticidades, campañas y material POP, segmentación de clientes.
  •	KPIs: crecimiento orgánico, margen por mix, éxito de lanzamientos, TOM/consideración/NPS de marca, ROI marketing y TMKT.

- Industrial
  •	Qué hace: operación de plantas y logística nacional.
  •	Subáreas: faena y proceso, packaging, CD y distribución nacional, soporte a cadena de frío.
  •	Ideas típicas: OEE y cuellos de botella, automatización, layout, eficiencia energética, rediseño de red logística y CD.
  •	KPIs: rendimiento y costo por kg, OEE, mermas, disponibilidad de equipos, costo por km/ton, cumplimiento de ventanas de entrega.

- Calidad
  •	Qué hace: inocuidad, certificaciones globales, cultura de calidad y respuesta a desvíos.
  •	Ideas típicas: digitalización HACCP, liberación por calidad, trazabilidad avanzada, dashboards de reclamos.
  •	KPIs: resultados auditorías GFSI, no conformidades, tiempos de respuesta, retiros, reclamos por millón.

- Mantención
  •	Qué hace: confiabilidad de activos, mantenimiento preventivo/correctivo, repuestos críticos.
  •	Ideas típicas: RCM/TPM, sensores predictivos, strategy de repuestos, planner digital.
  •	KPIs: disponibilidad, MTBF/MTTR, backlog preventivo, costo de mantención/ton.

- Transporte
  •	Qué hace: flota y cadena de frío para animales y producto, bioseguridad, monitoreo 24/7.
  •	Ideas típicas: geocercas, RAEV, optimización de rutas, control térmico, telemetría y seguridad.
  •	KPIs: OTIF por tramo, costo por km/ton, incidencias, temperatura controlada, tiempos de ciclo.

- Producción Pollo
  •	Qué hace: genética, alimento, crianza, bioseguridad, abastecimiento a faena.
  •	Ideas típicas: mejoras en conversión, bienestar animal, manejo ambiental, automatización de granjas, detección temprana sanitaria.
  •	KPIs: conversión, ganancia diaria, mortalidad, uniformidad, edad/peso a faena, costo por kg vivo.

- Producción Cerdo
  •	Qué hace: reproducción, recría, engorda, bioseguridad, sanidad, abastecimiento a faena.
  •	Ideas típicas: mejora reproductiva, dietas y conversión, bienestar, bioseguridad y trazabilidad, uso de datos en granja.
  •	KPIs: destetados/hembra/año, conversión, mortalidad, días a peso objetivo, costo por kg vivo.

- TI
  •	Qué hace: ERP/analítica, infraestructura, continuidad operativa, ciberseguridad.
  •	Estructura clave: Ciberseguridad reporta a TI.
  •	Ideas típicas: data lake y calidad de datos, automatización, identidad y accesos, monitoreo OT/IT, IA aplicada a planeamiento y demanda.
  •	KPIs: uptime sistemas críticos, MTTR incidentes, severidad de brechas, cumplimiento ISO 27001, satisfacción usuarios.

- Legal
  •	Qué hace: contratos, libre competencia, regulación, compliance y formación.
  •	Ideas típicas: flujos de aprobación contractuales, monitoreo de riesgos, capacitación antitrust, automatización documental.
  •	KPIs: litigios y hallazgos, cumplimiento de políticas, tiempos de revisión, sanciones evitadas.

- Asuntos Corporativos
  •	Qué hace: reputación, comunicaciones externas, relacionamiento con comunidades y stakeholders.
  •	Ideas típicas: planes de vocería, gestión de crisis, reportes de sostenibilidad, programas con comunidades, monitoreo de medios.
  •	KPIs: reputación, share of voice, tiempos de respuesta, percepción comunitaria.

- RR. HH.
  •	Qué hace: atracción, desarrollo, desempeño, clima, salud y seguridad.
  •	Ideas típicas: academias técnicas, planes de sucesión, analítica de rotación, programas de seguridad y bienestar.
  •	KPIs: rotación, tiempo de cobertura, horas de capacitación, accidentabilidad, días perdidos, eNPS.

- Finanzas
  •	Qué hace: planeamiento, tesorería, cobertura de riesgos, capex, relación con inversionistas.
  •	Ideas típicas: optimización de capital de trabajo, coberturas FX/commodities, modelos de inversión, financiamiento verde.
  •	KPIs: EBITDA y FCF, DSO/DPO, deuda/EBITDA, costo de capital, variación de working capital.

- Contabilidad
  •	Qué hace: registro, cierres, estados financieros, cumplimiento contable/tributario.
  •	Ideas típicas: automatización de cierre, conciliaciones inteligentes, facturación electrónica avanzada, analítica de desvíos.
  •	KPIs: días de cierre, ajustes post-cierre, hallazgos de auditoría, cumplimiento normativo.

- Negocios Complementarios
  •	Qué hace: monetizar adyacencias y subproductos, reutilización de activos, servicios asociados.
  •	Ideas típicas: valorización de subproductos, energía/frío como servicio, arriendo de capacidades, nuevas líneas “no core” de alto margen.
  •	KPIs: ingresos y margen incremental, tasa de valorización, payback, utilización de activos.

Justifica en una línea y pide validación.

### 8. MARCA (SI APLICA A PRODUCTO COMERCIAL)
Sugiere 1 marca alineada al posicionamiento y al caso de la idea, problema u oportunidad:
- Super Pollo (cotidiano/versátil/confiable)
- La Crianza (premium accesible/ocasional/parrilla)
- Super Cerdo (experto en cerdo/educación culinaria)
- Sopraval (pavo/salud)
- King (conveniente/económico)
- Agrosuper (corporativo/internacional)
- Agrosuper Foodservice (canal foodservice)

Pide confirmar o cambiar.

### 9. FORMULARIO DE CIERRE (SOLO TEXTO)
Presenta un formulario simple para confirmación:
- Nombre del proyecto
- Problema/Oportunidad
- Idea/Solución (Eureka)
- Pasos de implementación
- Impacto esperado (métrica y magnitud)
- Gerencias impactadas (≤3)
- KPIs afectados (≤3)
- Marca (si aplica)

Luego: "¿Qué ajustarías o ampliarías?"

### 10. DATOS DEL APORTANTE (CUANDO CORRESPONDA)
Pide el RUT, el correo electrónico (valida formato según país/idioma) y luego el nombre completo.
Si el formato es incorrecto, explica el formato correcto y vuelve a solicitarlo.

Una vez tengas todos los datos confirmados, utiliza la herramienta submit_project para guardar el proyecto.
Importante: Comunícale al usuario el resultado (éxito o error) con humor e ironía.

### 11. RECOMPENSA
-entrega de paya chilena relacionada con el proyecto que acaba de subir
"Como recompensa por haberte dado el tiempo de postular una idea, te regalo una paya chilena:"

PAYA:
- 3 estrofas por 4 versos (12 versos totales)
- 8 sílabas exactas/verso (cuenta antes)
- Rima consonante ABAB/ABCB por estrofa
- Contracciones: pa', na', po', estái, querí, tení, sabí, jugá, embarrá, quemá, cansá, pintá, doblá, cerrá
- SI pícara: respuesta inocente entre paréntesis
- Tipos: patriótica, pícara, desafío, brindis, humorística

*Ejemplo pícara:*

En lo verde del jardín
te observo con disimulo,
y cual pícaro colibrí
te quiero besar el... (cuello, cuello...)

## HEURÍSTICA INTERNA (NO REVELAR AL USUARIO)
Usa la matriz de evaluación (EBITDA/Estandarización/Metodología/Replicabilidad) para orientar recomendaciones
y calibrar el nivel (de "ninguno" a "muy alto"). Emplea "cálculo en servilleta" para estimar impacto,
sin mostrar ponderaciones.

## TONO
Humano, humor , MUY SARCASTICO e irónico. NO lenguaje corporativo.

## BUENAS PRÁCTICAS
HAZ ESTO:
- Mantén la conversación simple, con mucho humor e ironía.
- Respuestas breves.
- Sugiere opciones.
- Pide confirmaciones rápidas del tipo "¿Te tinca?" o "¿Te parece bien?"
- Cierra con formulario y comunicándole al usuario si su proyecto fue guardado exitosamente o no.

EVITA:
- Interrogatorios sin fin
- Prometer cifras sin datos
- Revelar ponderaciones internas
- Decir que "leo archivos"`,
  tools: [submitProjectTool],
  voice: 'marin', // Voz femenina cálida y expresiva
  temperature: 0.9, // Alta expresividad para personalidad irónica
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
  const roleClass = role.toLowerCase().includes('tú') ? 'user' : 'agent';
  messageDiv.className = `message ${roleClass}`;

  const typeLabel = messageType === 'text' ? 'texto' : 'voz';
  const formattedTime = formatTimestamp();

  // Avatar initial (T for Tú, E for Eureka)
  const avatarInitial = roleClass === 'user' ? 'T' : 'E';
  const senderName = roleClass === 'user' ? 'TÚ' : 'EUREKA';

  messageDiv.innerHTML = `
    <div class="message-avatar">${avatarInitial}</div>
    <div class="message-bubble">
      <div class="message-header">
        <span class="message-sender">${senderName}</span>
        <span class="message-type-label">${typeLabel}</span>
        <span class="message-timestamp">${formattedTime}</span>
      </div>
      <div class="message-content">${text}</div>
    </div>
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

  // Format timestamp in HH:MM:SS format
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  eventDiv.textContent = `${timestamp} ${event}`;
  eventsDiv.appendChild(eventDiv);
  eventsDiv.scrollTop = eventsDiv.scrollHeight;
}

// Connect to the voice agent
async function connect() {
  try {
    updateStatus('Conectando...', 'info');
    connectBtn.disabled = true;
    connectBtn.classList.add('connecting');
    connectBtn.textContent = 'Conectando...';
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
      model: 'gpt-4o-realtime-preview',
    });

    // Set up event listeners BEFORE connecting
    console.log('[Frontend] Setting up event listeners...');

    // Helper function to add user transcript
    function addUserTranscript(transcript, itemId = null, messageType = 'voice') {
      if (!transcript) return;

      console.log('[Frontend] Adding user transcript:', transcript, 'type:', messageType);
      addTranscript('Tú', transcript, messageType, itemId);
      // Removed logEvent for user messages - only show in transcript panel
    }

    // Agent transcript - fires when agent finishes speaking
    // Arguments: [agent, context, text]
    session.on('agent_end', (agent, context, text) => {
      console.log('[Frontend] Agent spoke:', text);
      if (text && text.trim()) {
        addTranscript('Eureka', text, 'voice');
        // Removed logEvent for agent messages - only show in transcript panel
      } else {
        console.log('[Frontend] Agent response was empty, skipping');
      }
    });

    // Agent starts speaking
    session.on('agent_start', (agent, context) => {
      console.log('[Frontend] Agent started speaking');
      // Removed logEvent - not needed in events panel
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
      connectBtn.classList.remove('connecting');
      connectBtn.textContent = 'Conectar & Empezar a Charlar';
      connectBtn.disabled = false;
      connectBtn.style.display = '';
    });

    // Connect with the ephemeral key and timeout detection
    console.log('[Frontend] Connecting to session with ephemeral key...');
    logEvent('Intentando conectar a OpenAI...');

    // Set a timeout to detect connection hang
    const connectionTimeout = setTimeout(() => {
      console.error('[Frontend] Connection timeout - no response after 15 seconds');
      logEvent('Timeout de conexión - revisa la consola para más detalles');
      updateStatus('Timeout de conexión - revisa la consola', 'error');
      connectBtn.classList.remove('connecting');
      connectBtn.textContent = 'Conectar & Empezar a Charlar';
      connectBtn.disabled = false;
    }, 15000);

    try {
      await session.connect({
        apiKey: sessionData.value,
      });
      clearTimeout(connectionTimeout);
      console.log('[Frontend] session.connect() completed successfully');

      // Update UI immediately after successful connection
      isConnected = true;
      connectBtn.classList.remove('connecting');
      connectBtn.textContent = 'Conectar & Empezar a Charlar';
      connectBtn.style.display = 'none'; // Hide connect button when connected
      updateStatus('¡Conectada - Empieza a hablar o escribir!', 'success');
      disconnectBtn.disabled = false;
      messageInput.disabled = false;
      sendBtn.disabled = false;
      logEvent('¡Conexión establecida - Ya puedes hablar o escribir!');

    } catch (connectError) {
      clearTimeout(connectionTimeout);
      console.error('[Frontend] Connection failed:', connectError);
      throw connectError;
    }

    logEvent('¡Audio activo - ya, partimos!');

  } catch (error) {
    console.error('Connection error:', error);
    updateStatus(`Error de conexión: ${error.message}`, 'error');
    connectBtn.classList.remove('connecting');
    connectBtn.textContent = 'Conectar & Empezar a Charlar';
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
    connectBtn.style.display = ''; // Show connect button again
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
    // Note: Not logging to events panel - only show in transcript

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
