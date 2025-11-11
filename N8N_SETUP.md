# n8n Webhook Integration Setup Guide

Esta guía te llevará paso a paso por la configuración del workflow de n8n para guardar proyectos en Google Sheets y enviar emails de confirmación.

---

## Tabla de Contenidos

1. [Resumen del Sistema](#resumen-del-sistema)
2. [Prerequisitos](#prerequisitos)
3. [Paso 1: Crear Cuenta n8n Cloud](#paso-1-crear-cuenta-n8n-cloud)
4. [Paso 2: Configurar Google OAuth](#paso-2-configurar-google-oauth)
5. [Paso 3: Preparar Google Sheet](#paso-3-preparar-google-sheet)
6. [Paso 4: Crear el Workflow](#paso-4-crear-el-workflow)
7. [Paso 5: Configurar Variables de Entorno](#paso-5-configurar-variables-de-entorno)
8. [Paso 6: Testing](#paso-6-testing)
9. [Troubleshooting](#troubleshooting)

---

## Resumen del Sistema

### Flujo Completo

```
Eureka Agent (frontend)
    ↓
    POST /webhook/submit-project
    ↓
n8n Workflow
    ↓
    ├── Webhook Node (recibe datos)
    ├── Google Sheets Node (guarda proyecto)
    ├── IF Node (verifica éxito)
    ├── Gmail Node (envía confirmación)
    └── Response Node (retorna resultado)
```

### Datos que se Envían

El agent envía un objeto JSON con:

```json
{
  "nombre": "Juan Pérez",
  "rut": "12345678-9",
  "correo": "juan.perez@agrosuper.com",
  "nombreProyecto": "Automatización de Procesos",
  "problema": "Los procesos manuales toman 5 horas diarias",
  "solucion": "Implementar RPA para automatizar tareas repetitivas",
  "impacto": "Reducción de 80% en tiempo de procesamiento",
  "gerencias": ["Operaciones", "TI"],
  "kpis": ["Eficiencia Operacional", "Reducción de Costos"],
  "marca": "Super Pollo",
  "fecha": "2025-01-11T12:34:56.789Z",
  "timestamp": 1705063496789
}
```

### Headers de Autenticación

```
Content-Type: application/json
X-Webhook-Secret: your-secret-here
```

---

## Prerequisitos

Antes de comenzar, necesitas:

- ✅ Cuenta de Gmail (para enviar emails)
- ✅ Cuenta de Google con acceso a Google Sheets
- ✅ Hoja de cálculo de Google Sheets creada
- ✅ Navegador web

**NO necesitas:**
- ❌ Tarjeta de crédito (n8n Cloud tiene plan gratuito)
- ❌ Servidor propio (usarás n8n Cloud)
- ❌ Conocimientos de programación

---

## Paso 1: Crear Cuenta n8n Cloud

### 1.1 Registro

1. Ve a [https://n8n.io/cloud](https://n8n.io/cloud)
2. Click en **"Start for free"**
3. Regístrate con:
   - Email personal o de trabajo
   - O usando Google Sign-In (recomendado)
4. Verifica tu email
5. Completa el onboarding:
   - Nombre
   - Tipo de uso: "Work" o "Personal"
   - Rol: "Developer" o el que corresponda

### 1.2 Crear Workspace

1. Después del registro, n8n te creará automáticamente un workspace
2. Nombre sugerido: `"Eureka Agrosuper"` o `"Voice Agent Workflows"`
3. Click en **"Continue"**

**Límites del Plan Gratuito:**
- 5,000 workflow executions/mes
- 20 workflows activos
- ✅ Suficiente para desarrollo y testing

---

## Paso 2: Configurar Google OAuth

Para que n8n pueda acceder a Google Sheets y Gmail, necesitas configurar OAuth.

### 2.1 Crear Credenciales de Google

1. **En n8n Dashboard**, click en tu avatar (esquina superior derecha)
2. Click en **"Settings"** → **"Credentials"**
3. Click en **"Add Credential"**
4. Busca y selecciona: **"Google OAuth2 API"**

### 2.2 Configurar Google Cloud Console

**Opción A: Usar OAuth de n8n (Recomendado para Testing)**

n8n te ofrece usar sus credenciales OAuth para empezar rápido:

1. En la pantalla de configuración, verás: **"Connect my account"**
2. Click en **"Connect my account"**
3. Elige tu cuenta de Google
4. Autoriza los siguientes permisos:
   - Gmail API (enviar emails)
   - Google Sheets API (leer/escribir sheets)
5. Click en **"Allow"**
6. n8n guardará las credenciales automáticamente
7. Dale un nombre: `"Gmail & Sheets - Eureka"`
8. Click en **"Save"**

**Opción B: Usar tus Propias Credenciales OAuth (Producción)**

Para producción, es mejor crear tus propias credenciales:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto: **"Eureka Voice Agent"**
3. Habilita las APIs:
   - Gmail API
   - Google Sheets API
4. Ve a **"Credentials"** → **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Tipo: **"Web application"**
6. **Authorized redirect URIs**: `https://YOUR-N8N-INSTANCE.app.n8n.cloud/rest/oauth2-credential/callback`
   - Encuentra tu URL en n8n Settings → OAuth Callback URL
7. Click **"Create"**
8. Copia el **Client ID** y **Client Secret**
9. Vuelve a n8n y pega estos valores
10. Click en **"Connect my account"** y autoriza

### 2.3 Verificar Credenciales

1. Deberías ver: ✅ **"Connected"**
2. Si aparece error, verifica:
   - Las APIs están habilitadas en Google Cloud
   - El redirect URI está correcto
   - La cuenta tiene acceso a Gmail y Sheets

---

## Paso 3: Preparar Google Sheet

### 3.1 Crear/Usar Hoja de Cálculo

**Opción A: Crear Nueva Hoja**

1. Ve a [Google Sheets](https://sheets.google.com)
2. Click en **"Blank"** para crear nueva hoja
3. Nómbrala: `"Proyectos Innovación 2026 - Eureka"`

**Opción B: Usar Hoja Existente**

Si ya tienes una hoja de proyectos, asegúrate de conocer:
- El ID de la hoja (en la URL)
- El nombre de la pestaña/sheet

### 3.2 Configurar Columnas

En la **primera fila** (fila de headers), agrega estas columnas **en este orden**:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Fecha | Timestamp | Nombre | RUT | Correo | Nombre Proyecto | Problema/Oportunidad | Solución | Impacto | Gerencias | KPIs | Marca |

**Formato sugerido:**
- **Fila 1**: Negrita, fondo gris claro
- **Columnas**: Ajusta ancho para legibilidad
- **Fecha**: Formato de fecha (Formato → Número → Fecha)

### 3.3 Obtener ID de la Hoja

1. Abre tu Google Sheet
2. Copia la URL, se ve así:
   ```
   https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit#gid=0
                                              ^^^^^^^^
                                              Este es el ID
   ```
3. Guarda este ID, lo necesitarás en el workflow

### 3.4 Nombre de la Pestaña

Por defecto la pestaña se llama `"Sheet1"` o `"Hoja 1"`. Si la renombraste, anota el nombre exacto (case-sensitive).

---

## Paso 4: Crear el Workflow

### 4.1 Crear Nuevo Workflow

1. En n8n Dashboard, click en **"Workflows"**
2. Click en **"Add Workflow"** (botón **+**)
3. Nómbralo: `"Submit Project - Eureka"`
4. Click en **"Save"**

### 4.2 Agregar Nodos

Ahora vamos a construir el workflow. Click en **"+ Add node"** para cada uno:

---

#### **Nodo 1: Webhook**

1. Busca: **"Webhook"**
2. Configura:
   - **HTTP Method**: `POST`
   - **Path**: `submit-project`
   - **Authentication**: `Header Auth`
     - **Header Name**: `X-Webhook-Secret`
     - **Header Value**: Ingresa un secret fuerte, ej: `eureka-webhook-2026-ABC123`
       - **⚠️ IMPORTANTE**: Guarda este secret, lo necesitarás en las variables de entorno
   - **Response Mode**: `When Last Node Finishes`
   - **Response Data**: `Last Node`

3. **Copiar URL del Webhook**:
   - Después de guardar, verás: `Webhook URL: https://your-instance.app.n8n.cloud/webhook/submit-project`
   - **Copia esta URL completa** (la necesitarás para `N8N_WEBHOOK_URL`)

---

#### **Nodo 2: Google Sheets - Append Row**

1. Busca: **"Google Sheets"**
2. Selecciona: **"Append"** (agregar fila)
3. Configura:
   - **Credential**: Selecciona la credencial que creaste antes
   - **Resource**: `Sheet`
   - **Operation**: `Append or Update Row`
   - **Document**:
     - Modo: `By URL` o `By ID`
     - Pega el ID de tu Google Sheet
   - **Sheet**: Nombre de la pestaña (ej: `Sheet1`)
   - **Data Mode**: `Auto-Map Input Data`
   - **Columns**: Mapear manualmente:

   | Column Name | Expression |
   |-------------|------------|
   | Fecha | `{{ $json.fecha }}` |
   | Timestamp | `{{ $json.timestamp }}` |
   | Nombre | `{{ $json.nombre }}` |
   | RUT | `{{ $json.rut }}` |
   | Correo | `{{ $json.correo }}` |
   | Nombre Proyecto | `{{ $json.nombreProyecto }}` |
   | Problema/Oportunidad | `{{ $json.problema }}` |
   | Solución | `{{ $json.solucion }}` |
   | Impacto | `{{ $json.impacto }}` |
   | Gerencias | `{{ $json.gerencias.join(', ') }}` |
   | KPIs | `{{ $json.kpis.join(', ') }}` |
   | Marca | `{{ $json.marca }}` |

**Tip**: Usa el Expression Editor (icono `fx`) para escribir las expresiones.

---

#### **Nodo 3: IF - Check Success**

1. Busca: **"IF"**
2. Configura:
   - **Condition**: `Boolean`
   - **Value 1**: `{{ $json.success }}`
   - **Operation**: `Equal`
   - **Value 2**: `true`

Esto dividirá el flujo en dos caminos: éxito y error.

---

#### **Nodo 4a: Gmail - Send Email (Success Path)**

Conecta este nodo al output **"true"** del IF.

1. Busca: **"Gmail"**
2. Selecciona: **"Send Email"**
3. Configura:
   - **Credential**: Usa la misma credencial de Google OAuth
   - **Resource**: `Message`
   - **Operation**: `Send`
   - **To**: `{{ $('Webhook').item.json.correo }}`
   - **Subject**: `✅ Tu proyecto "{{ $('Webhook').item.json.nombreProyecto }}" fue recibido`
   - **Email Type**: `HTML`
   - **Message**: (copia el template HTML de abajo)

**Template de Email:**

```html
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
    <h2 style="color: #2c5aa0;">¡Gracias por tu proyecto, {{ $('Webhook').item.json.nombre }}! 🎉</h2>

    <p>Tu proyecto de innovación ha sido recibido exitosamente.</p>

    <div style="background-color: #f0f7ff; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0;">
      <h3 style="margin-top: 0;">{{ $('Webhook').item.json.nombreProyecto }}</h3>
      <p><strong>Problema/Oportunidad:</strong> {{ $('Webhook').item.json.problema }}</p>
      <p><strong>Solución:</strong> {{ $('Webhook').item.json.solucion }}</p>
      <p><strong>Impacto Esperado:</strong> {{ $('Webhook').item.json.impacto }}</p>
    </div>

    <p>Tu proyecto ha sido guardado en la planilla de innovación 2026 y será revisado por el equipo.</p>

    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Este es un mensaje automático generado por Eureka, tu asistente de proyectos de innovación.
    </p>
  </div>
</body>
</html>
```

---

#### **Nodo 4b: Set - Error Response (Error Path)**

Conecta este nodo al output **"false"** del IF.

1. Busca: **"Set"**
2. Configura:
   - **Mode**: `Manual`
   - **Fields**:
     - `success`: `false` (Boolean)
     - `error`: `Failed to save to Google Sheets` (String)
     - `emailSent`: `false` (Boolean)

---

#### **Nodo 5a: Set - Success Response**

Conecta después del nodo Gmail (success path).

1. Busca: **"Set"**
2. Configura:
   - **Mode**: `Manual`
   - **Fields**:
     - `success`: `true` (Boolean)
     - `message`: `Proyecto guardado exitosamente` (String)
     - `sheetRow`: `{{ $('Google Sheets').item.json.rowNumber }}` (Number)
     - `emailSent`: `true` (Boolean)

---

#### **Nodo 6: Merge**

1. Busca: **"Merge"**
2. Conecta ambos paths (success y error) a este nodo
3. Configura:
   - **Mode**: `Combine`
   - **Output Data**: `Input 1 + Input 2`

---

#### **Nodo 7: Respond to Webhook**

1. Busca: **"Respond to Webhook"**
2. Conecta desde el Merge
3. Configura:
   - **Response Data**: `First Matching Item`
   - **Response Code**: `200`

---

### 4.3 Conexiones Finales

Tu workflow debería verse así:

```
Webhook
  ↓
Google Sheets
  ↓
IF
  ├── True → Gmail → Set (Success) → Merge
  └── False → Set (Error) ──────────→ Merge
                                       ↓
                                 Respond to Webhook
```

### 4.4 Activar Workflow

1. Click en **"Active"** (toggle en la esquina superior derecha)
2. Verás: ✅ **"Workflow is active"**
3. Click en **"Save"**

---

## Paso 5: Configurar Variables de Entorno

### 5.1 En tu `.env` Local

Crea o edita el archivo `.env` en la raíz del proyecto:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-...

# Server Configuration
PORT=3000

# n8n Webhook Integration
N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/submit-project
N8N_WEBHOOK_SECRET=eureka-webhook-2026-ABC123
```

**⚠️ IMPORTANTE**:
- Reemplaza `N8N_WEBHOOK_URL` con la URL que copiaste del nodo Webhook
- Reemplaza `N8N_WEBHOOK_SECRET` con el secret que configuraste en el nodo Webhook
- **NUNCA** comitees el archivo `.env` a Git (ya está en `.gitignore`)

### 5.2 En Vercel (Producción)

1. Ve a [Vercel Dashboard](https://vercel.com/)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega cada variable:

   **Variable 1:**
   - **Name**: `N8N_WEBHOOK_URL`
   - **Value**: `https://your-instance.app.n8n.cloud/webhook/submit-project`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

   **Variable 2:**
   - **Name**: `N8N_WEBHOOK_SECRET`
   - **Value**: `eureka-webhook-2026-ABC123`
   - **Environments**: ✅ Production, ✅ Preview, ✅ Development

5. Click **"Save"**
6. **Redeploy** el proyecto:
   - Ve a **Deployments**
   - Click en el último deployment → **⋯** → **"Redeploy"**

---

## Paso 6: Testing

### 6.1 Test con cURL

Primero, prueba el webhook directamente:

```bash
curl -X POST https://your-instance.app.n8n.cloud/webhook/submit-project \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: eureka-webhook-2026-ABC123" \
  -d '{
    "nombre": "Test User",
    "rut": "11111111-1",
    "correo": "tu-email@gmail.com",
    "nombreProyecto": "Test Project",
    "problema": "Testing webhook integration",
    "solucion": "Verify all components work",
    "impacto": "100% confidence in system",
    "gerencias": ["IT", "Operations"],
    "kpis": ["Efficiency"],
    "marca": "Test Brand",
    "fecha": "2025-01-11T12:00:00Z",
    "timestamp": 1705063200000
  }'
```

**Resultado esperado:**

```json
{
  "success": true,
  "message": "Proyecto guardado exitosamente",
  "sheetRow": 2,
  "emailSent": true
}
```

**Verifica:**
- ✅ Status code 200
- ✅ Response tiene `success: true`
- ✅ Nueva fila en Google Sheet
- ✅ Email recibido en tu bandeja

### 6.2 Test con la Webapp (Local)

1. **Inicia el servidor local**:
   ```bash
   npm run build
   npm start
   ```

2. **Abre el navegador**:
   - Ve a `http://localhost:3000`

3. **Inicia conversación con Eureka**:
   - Click en **"Conectar & Empezar a Charlar"**
   - Permite acceso al micrófono
   - Sigue el flujo completo de postulación de un proyecto

4. **Llega a la confirmación**:
   - Eureka preguntará: "¿Querés que guarde tu proyecto y te envíe confirmación por email?"
   - Responde: "Sí" o "Si, por favor"

5. **Verifica el resultado**:
   - Eureka debería decir: "¡Listo! Tu proyecto fue guardado en la fila X y te envié confirmación a tu correo"
   - Verifica Google Sheet: nueva fila con todos los datos
   - Verifica tu email: confirmación recibida

### 6.3 Test en Vercel (Producción)

1. **Deploy a Vercel**:
   ```bash
   git add .
   git commit -m "Add n8n integration"
   git push
   ```

2. **Verifica las env vars en Vercel** (paso 5.2)

3. **Abre la URL de Vercel**:
   - `https://your-app.vercel.app`

4. **Repite el test del paso 6.2**

### 6.4 Debugging

Si algo falla, revisa:

**En n8n:**
- Ve a **Executions** (sidebar izquierdo)
- Click en la última ejecución
- Verás cada nodo con su output
- Nodos en rojo = error (click para ver detalles)

**En el navegador (DevTools):**
- F12 → Console
- Busca logs de `[Tool]`
- Ejemplo: `[Tool] Enviando proyecto a n8n: Test Project`

**En Vercel:**
- Ve a **Deployments** → Click en el deployment → **Functions**
- Busca logs de errores

---

## Troubleshooting

### Error: "404 Not Found" en webhook

**Causa**: URL del webhook incorrecta o workflow no activado

**Solución**:
1. Verifica que el workflow está **Active** en n8n
2. Copia de nuevo la URL del webhook desde n8n
3. Actualiza `N8N_WEBHOOK_URL` en `.env` y Vercel
4. Redeploy

---

### Error: "401 Unauthorized" o "403 Forbidden"

**Causa**: Webhook secret incorrecto

**Solución**:
1. En n8n, abre el nodo Webhook → verifica el secret
2. Actualiza `N8N_WEBHOOK_SECRET` en `.env` y Vercel con el mismo valor
3. Asegúrate de que ambos sean exactamente iguales (case-sensitive)
4. Redeploy

---

### Error: "Google Sheets: Insufficient Permission"

**Causa**: La cuenta de Google no tiene acceso a la hoja

**Solución**:
1. Abre tu Google Sheet
2. Click en **"Share"**
3. Agrega la cuenta de Google que usaste en n8n OAuth
4. Dale permisos de **"Editor"**
5. Guarda y prueba de nuevo

---

### Email no se envía

**Causa**: Gmail API no autorizado o credenciales caducadas

**Solución**:
1. En n8n → **Settings** → **Credentials**
2. Edita la credencial de Google OAuth
3. Click en **"Reconnect"**
4. Autoriza de nuevo los permisos
5. Guarda

---

### Datos no se guardan en Sheet correctamente

**Causa**: Mapeo de columnas incorrecto

**Solución**:
1. Verifica que las columnas en Google Sheet coincidan con los nombres en n8n
2. En n8n, abre el nodo Google Sheets
3. Revisa que cada campo mapea correctamente:
   - `{{ $json.nombre }}` → columna "Nombre"
   - `{{ $json.correo }}` → columna "Correo"
   - etc.
4. Para arrays (gerencias, kpis), usa: `{{ $json.gerencias.join(', ') }}`

---

### Workflow ejecuta pero retorna error genérico

**Causa**: Error en algún nodo intermedio

**Solución**:
1. En n8n → **Executions**
2. Click en la ejecución fallida
3. Revisa cada nodo:
   - Verde = éxito
   - Rojo = error
4. Click en el nodo rojo para ver el error específico
5. Ejemplos comunes:
   - Google Sheets: "Spreadsheet not found" → verifica ID
   - Gmail: "Invalid recipient" → verifica formato de email
   - IF: No output → verifica que Google Sheets retorne `success: true`

---

### Frontend dice "Error al conectar con el sistema"

**Causa**: Variable `N8N_WEBHOOK_URL` no configurada o incorrecta

**Solución**:
1. Verifica que `N8N_WEBHOOK_URL` existe en `.env` (local) o Vercel (producción)
2. Verifica que la URL es exactamente la del webhook de n8n
3. Prueba la URL con cURL (paso 6.1) para confirmar que funciona
4. Si estás en Vercel, verifica que redeployaste después de agregar env vars

---

## Próximos Pasos

Una vez que todo funciona:

1. **Seguridad**:
   - Cambia el webhook secret a algo más fuerte
   - Considera agregar rate limiting en n8n
   - Revisa los permisos de la Google Sheet

2. **Monitoring**:
   - Revisa periódicamente las **Executions** en n8n
   - Configura notificaciones de error en n8n (Settings → Error Workflow)

3. **Escalabilidad**:
   - Si superas 5,000 ejecuciones/mes, considera upgrade a plan pagado de n8n
   - Monitorea el uso de la cuota de Gmail API

4. **Mejoras**:
   - Agrega más validaciones en n8n (ej: verificar formato de RUT)
   - Personaliza el template de email con branding de Agrosuper
   - Agrega notificaciones a un canal de Slack/Teams

---

## Recursos Adicionales

- [n8n Documentation](https://docs.n8n.io/)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Gmail API](https://developers.google.com/gmail/api)
- [n8n Community Forum](https://community.n8n.io/)

---

**Versión**: 1.0
**Fecha**: 2025-01-11
**Autor**: Claude
**Proyecto**: Eureka Voice Agent - Agrosuper
