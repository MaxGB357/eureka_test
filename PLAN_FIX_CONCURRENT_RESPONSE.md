# Plan: Solución para Error "Conversation already has an active response"

## 📋 Problema

**Error**: `"Conversation already has an active response in progress"`

**Causa raíz**: El código permite enviar mensajes mientras el agente todavía está generando/hablando una respuesta, lo que causa conflictos con la API de OpenAI Realtime.

---

## 🎯 Objetivos

1. ✅ Prevenir envío de mensajes mientras el agente está respondiendo
2. ✅ Dar feedback visual al usuario cuando no puede enviar mensajes
3. ✅ Manejar el error gracefully si ocurre
4. ✅ Permitir interrupciones intencionales (opcional/avanzado)

---

## 🔧 Solución Implementada

### **Paso 1: Agregar Variable de Estado**

Agregar nueva variable global para rastrear si el agente está hablando:

```javascript
// UI elements
let session = null;
let isConnected = false;
let isMuted = false;
let isAgentSpeaking = false; // ← NUEVA VARIABLE
```

---

### **Paso 2: Actualizar Estado en Eventos**

Actualizar la variable cuando el agente empieza y termina de hablar:

```javascript
// Agent starts speaking
session.on('agent_start', (agent, context) => {
  console.log('[Frontend] Agent started speaking');
  isAgentSpeaking = true; // ← Marcar como hablando
  updateInputState(); // ← Actualizar UI
});

// Agent transcript - fires when agent finishes speaking
session.on('agent_end', (agent, context, text) => {
  console.log('[Frontend] Agent spoke:', text);
  if (text && text.trim()) {
    addTranscript('Eureka', text, 'voice');
  }
  isAgentSpeaking = false; // ← Marcar como terminado
  updateInputState(); // ← Actualizar UI
});
```

---

### **Paso 3: Crear Función Helper para Actualizar Estado de Inputs**

Nueva función que habilita/deshabilita controles basándose en el estado:

```javascript
// Helper function to update input controls state
function updateInputState() {
  const canSendMessage = isConnected && !isAgentSpeaking && messageInput.value.trim().length > 0;

  // Disable/enable send button
  sendBtn.disabled = !canSendMessage;

  // Disable/enable input (opcional - podría ser molesto)
  // messageInput.disabled = isAgentSpeaking;

  // Add visual feedback when agent is speaking
  if (isAgentSpeaking) {
    sendBtn.classList.add('agent-speaking');
    sendBtn.textContent = 'Eureka está hablando...';
  } else {
    sendBtn.classList.remove('agent-speaking');
    sendBtn.textContent = 'Enviar';
  }
}
```

---

### **Paso 4: Validar Antes de Enviar Mensaje**

Agregar validación en `sendTextMessage()`:

```javascript
async function sendTextMessage() {
  const message = messageInput.value.trim();

  if (!message || !session || !isConnected) {
    return;
  }

  // ✅ NUEVA VALIDACIÓN: Verificar si el agente está hablando
  if (isAgentSpeaking) {
    console.warn('[Frontend] Cannot send message: agent is currently speaking');
    // Mostrar mensaje al usuario (opcional)
    updateStatus('Espera a que Eureka termine de hablar', 'warning');
    setTimeout(() => updateStatus('¡Conectada!', 'success'), 2000);
    return;
  }

  try {
    // Disable input while sending
    messageInput.disabled = true;
    sendBtn.disabled = true;

    console.log('[Frontend] Sending text message:', message);

    // Add user message to transcript immediately
    addTranscript('Tú', message, 'text');

    // Send message through Realtime API
    await session.sendMessage(message);

    // Clear input
    messageInput.value = '';
    updateCharCounter();

    // Re-enable input
    messageInput.disabled = false;
    updateInputState(); // ← Usar la nueva función

    console.log('[Frontend] Text message sent successfully');

  } catch (error) {
    console.error('[Frontend] Error sending message:', error);

    // ✅ NUEVO: Manejo específico del error de respuesta activa
    if (error.message && error.message.includes('already has an active response')) {
      updateStatus('Eureka todavía está respondiendo. Espera un momento.', 'warning');
      setTimeout(() => updateStatus('¡Conectada!', 'success'), 3000);
    } else {
      updateStatus(`Error: ${error.message}`, 'error');
    }

    // Re-enable input even on error
    messageInput.disabled = false;
    updateInputState();
  }
}
```

---

### **Paso 5: Actualizar Event Listener de Input**

Modificar el listener de input para usar la nueva función:

```javascript
// Update character counter and button state on input
messageInput.addEventListener('input', () => {
  updateCharCounter();
  autoResizeTextarea();
  updateInputState(); // ← Cambiar de updateSendButtonState()
});
```

---

### **Paso 6: Eliminar Función Obsoleta**

Eliminar la función `updateSendButtonState()` ya que es reemplazada por `updateInputState()`.

---

### **Paso 7: Reset en Disconnect**

Agregar reset del estado en la función `disconnect()`:

```javascript
async function disconnect() {
  if (session) {
    // ... código existente ...

    session = null;
    isConnected = false;

    // Reset mute state
    isMuted = false;
    updateMuteButtonUI();
    muteBtn.disabled = true;

    // ✅ NUEVO: Reset agent speaking state
    isAgentSpeaking = false;

    // ... resto del código ...
  }
}
```

---

### **Paso 8: CSS para Feedback Visual (Opcional)**

Agregar estilos CSS para el estado "agent speaking":

```css
#sendBtn.agent-speaking {
    background: var(--color-warning);
    cursor: not-allowed;
    opacity: 0.7;
}

#sendBtn.agent-speaking:hover {
    background: var(--color-warning);
    transform: none;
}
```

---

## 🧪 Tests

### **Test 1: Prevención de Envío Durante Respuesta**

**Pasos**:
1. Conectar a la sesión
2. Enviar un mensaje de texto
3. Mientras el agente responde, intentar enviar otro mensaje

**Resultado esperado**:
- ✅ Botón "Enviar" se deshabilita y muestra "Eureka está hablando..."
- ✅ No se envía el segundo mensaje
- ✅ No hay error en consola
- ✅ Después de que el agente termina, el botón se habilita de nuevo

---

### **Test 2: Múltiples Mensajes Rápidos**

**Pasos**:
1. Conectar a la sesión
2. Escribir mensaje y hacer clic rápidamente en Enviar 3 veces

**Resultado esperado**:
- ✅ Solo se envía un mensaje
- ✅ No hay error de "already has active response"
- ✅ El botón se deshabilita después del primer clic

---

### **Test 3: Entrada por Voz Durante Respuesta**

**Pasos**:
1. Conectar a la sesión
2. Hablar con el agente
3. Mientras el agente responde, hablar de nuevo

**Resultado esperado**:
- ⚠️ **Comportamiento actual**: Puede causar el error (esto requiere una solución más avanzada con VAD)
- ✅ **Solución básica**: Al menos el envío de texto está protegido

---

### **Test 4: Error Handling**

**Pasos**:
1. Simular el error manualmente (modificar código temporalmente)
2. Verificar que se muestra mensaje apropiado

**Resultado esperado**:
- ✅ Se muestra mensaje: "Eureka todavía está respondiendo. Espera un momento."
- ✅ El mensaje desaparece después de 3 segundos
- ✅ Los controles se vuelven a habilitar

---

### **Test 5: Reconexión**

**Pasos**:
1. Conectar y hablar con el agente
2. Desconectar mientras el agente habla
3. Reconectar

**Resultado esperado**:
- ✅ `isAgentSpeaking` se resetea a `false`
- ✅ Los controles funcionan normalmente después de reconectar

---

## 🎯 Mejoras Futuras (Opcionales)

### **Opción A: Sistema de Cola de Mensajes**

Para casos donde el usuario quiere enviar múltiples mensajes:

```javascript
let messageQueue = [];

async function sendTextMessage() {
  const message = messageInput.value.trim();

  if (!message || !session || !isConnected) return;

  // Si el agente está hablando, agregar a la cola
  if (isAgentSpeaking) {
    messageQueue.push(message);
    console.log('[Frontend] Message queued:', message);
    updateStatus('Mensaje en cola. Se enviará cuando Eureka termine.', 'info');
    messageInput.value = '';
    return;
  }

  // Enviar mensaje...
}

// En agent_end, procesar cola
session.on('agent_end', (agent, context, text) => {
  // ... código existente ...
  isAgentSpeaking = false;
  updateInputState();

  // Procesar cola si hay mensajes
  if (messageQueue.length > 0) {
    const nextMessage = messageQueue.shift();
    messageInput.value = nextMessage;
    sendTextMessage();
  }
});
```

---

### **Opción B: Permitir Interrupciones Intencionales**

Para usuarios que quieren interrumpir al agente:

```javascript
// Agregar botón de interrupción
<button id="interruptBtn" disabled>Interrumpir</button>

// Habilitar durante agent_start
session.on('agent_start', () => {
  isAgentSpeaking = true;
  interruptBtn.disabled = false;
});

// Manejar interrupción
interruptBtn.addEventListener('click', () => {
  if (isAgentSpeaking) {
    // Cancelar la respuesta actual
    session.cancelResponse(); // Si la API lo soporta
    isAgentSpeaking = false;
    updateInputState();
  }
});
```

---

### **Opción C: Debouncing para VAD**

Para prevenir que el ruido de fondo cause múltiples triggers:

```javascript
let audioDebounceTimer = null;

// En el manejo de audio input
function handleAudioInput() {
  // Cancelar timer anterior
  clearTimeout(audioDebounceTimer);

  // Crear nuevo timer
  audioDebounceTimer = setTimeout(() => {
    // Enviar audio solo después de 500ms de silencio
    sendAudio();
  }, 500);
}
```

---

## 📊 Criterios de Éxito

1. ✅ **Cero errores** de "already has active response" en uso normal
2. ✅ **Feedback visual claro** cuando el usuario no puede enviar mensajes
3. ✅ **UX mejorada**: El usuario sabe por qué no puede enviar
4. ✅ **Robustez**: Manejo graceful de errores si aún ocurren
5. ✅ **Performance**: Sin impacto negativo en la fluidez de la conversación

---

## 🚀 Orden de Implementación

1. ✅ Agregar variable `isAgentSpeaking`
2. ✅ Actualizar eventos `agent_start` y `agent_end`
3. ✅ Crear función `updateInputState()`
4. ✅ Agregar validación en `sendTextMessage()`
5. ✅ Actualizar event listeners
6. ✅ Agregar reset en `disconnect()`
7. ⚠️ Probar exhaustivamente
8. 🔮 (Opcional) Implementar mejoras futuras según necesidad

---

## 📚 Referencias

- **Error API**: `invalid_request_error: conversation_already_has_active_response`
- **Eventos**: `agent_start`, `agent_end`
- **Archivo**: `public/agent.js`
