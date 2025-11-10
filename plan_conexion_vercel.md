# Plan de Implementación - Fix Error de Conexión en Vercel

**Fecha**: 2025-01-10
**Problema**: Error al obtener token de sesión en producción (Vercel)
**Error Reportado**: "Error al obtener el token de sesión"
**Ubicación**: `agent.js:330:13` en función `connect()`

---

## 1. Análisis Profundo del Problema

### 1.1 Síntomas Observados

```
Error de conexión: Error al obtener el token de sesión
Location: agent.js:330:13 (función connect)
```

### 1.2 Código Actual que Falla

```javascript
// agent.js líneas 293-302
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
  throw new Error('Error al obtener el token de sesión');  // ← AQUÍ FALLA
}
```

**Análisis**: El error se lanza cuando `response.ok` es `false`, lo que significa que el servidor retornó un código HTTP 4xx o 5xx.

### 1.3 Posibles Causas (Hipótesis Ordenadas por Probabilidad)

#### Hipótesis 1: Función Serverless No Existe o No Se Compiló ✓ ALTA PROBABILIDAD
**Evidencia**:
- Vercel puede no haber reconocido `api/session.ts`
- TypeScript puede no haberse compilado correctamente
- Error 404 Not Found

**Por qué es probable**:
- Las funciones serverless TypeScript requieren configuración específica
- Vercel necesita `@vercel/node` runtime
- Puede haber problemas con el build

#### Hipótesis 2: Variable de Entorno No Configurada ✓ ALTA PROBABILIDAD
**Evidencia**:
- `OPENAI_API_KEY` no está en Vercel
- Backend retorna 500 con mensaje "OpenAI API key not configured"

**Por qué es probable**:
- Es fácil olvidar configurar env vars en Vercel
- El código backend valida esto y retorna 500

#### Hipótesis 3: Error de CORS ⚠️ PROBABILIDAD MEDIA
**Evidencia**:
- Request OPTIONS falla
- Browser bloquea por política CORS

**Por qué es posible**:
- Aunque tenemos CORS configurado, puede haber casos edge
- Vercel puede manejar CORS diferente

#### Hipótesis 4: Routing Incorrecto en vercel.json ⚠️ PROBABILIDAD MEDIA
**Evidencia**:
- Request a `/api/session` no llega a la función correcta
- Vercel routing está mal configurado

**Revisión**:
```json
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
```

Esto parece correcto pero podría tener problemas.

#### Hipótesis 5: Error en el Código de api/session.ts ⚠️ PROBABILIDAD BAJA
**Evidencia**:
- Syntax error en TypeScript
- Runtime error en la función

**Por qué es menos probable**:
- El código fue testeado localmente
- TypeScript debería capturar errores de syntax

---

## 2. Plan de Diagnóstico (Antes de Hacer Cambios)

### Paso 1: Verificar Deployment de Vercel

**Acciones**:
1. Ir a Vercel Dashboard → Deployments
2. Ver último deployment
3. Buscar en "Build Logs":
   - ¿Se compilaron las funciones TypeScript?
   - ¿Hay errores de build?
   - ¿Se detectaron las funciones en `api/`?

**Buscar**:
```
✓ Detected Next.js, Gatsby, or nuxt...
✓ Building Functions...
✓ api/health.ts
✓ api/session.ts
```

**Si NO aparece**: Hipótesis 1 confirmada (funciones no se compilaron)

---

### Paso 2: Verificar Variables de Entorno

**Acciones**:
1. Vercel Dashboard → Settings → Environment Variables
2. Verificar que existe: `OPENAI_API_KEY`
3. Verificar que está en "Production" environment
4. Verificar que el valor es correcto (empieza con `sk-proj-`)

**Si NO existe**: Hipótesis 2 confirmada

---

### Paso 3: Testing Manual del Endpoint

**Usar Browser DevTools Network Tab**:
1. Abrir DevTools (F12)
2. Ir a Network tab
3. Click "Conectar & Empezar a Charlar"
4. Buscar request a `/api/session`

**Verificar**:
- **Status Code**: ¿Qué código retorna? (404, 500, 502, etc.)
- **Response Body**: ¿Qué mensaje de error retorna?
- **Request Headers**: ¿Se envían correctamente?
- **Response Headers**: ¿CORS está configurado?

**Posibles Status Codes y Significados**:
- `404 Not Found`: Función no existe → Hipótesis 1
- `500 Internal Server Error`: Error en la función → Revisar Function Logs
- `502 Bad Gateway`: Timeout o crash de función
- `403 Forbidden`: Problema de permisos
- `CORS error`: No hay status, bloqueado por browser → Hipótesis 3

---

### Paso 4: Revisar Function Logs de Vercel

**Acciones**:
1. Vercel Dashboard → Deployments → Latest
2. Click en "Functions"
3. Buscar logs de `/api/session`

**Buscar**:
```
[Backend] Requesting ephemeral key from OpenAI...
[Backend] Session config being sent: {...}
[Backend] Ephemeral key received: ek_...
```

**O errores**:
```
Error: OpenAI API key not configured
Error: fetch failed
TypeError: ...
```

---

### Paso 5: Testing con cURL

**Comando**:
```bash
curl -X POST https://TU-URL.vercel.app/api/session \
  -H "Content-Type: application/json" \
  -v
```

**Analizar**:
- Status code retornado
- Headers (especialmente CORS)
- Body de la respuesta

---

## 3. Posibles Soluciones (Basadas en Diagnóstico)

### Solución 1: Si las Funciones No Se Compilaron

#### Causa Root
Vercel no detecta o no compila las funciones TypeScript en `api/`

#### Fix A: Verificar package.json
**Problema**: Falta `@vercel/node` en dependencies

**Solución**:
```json
{
  "dependencies": {
    "@vercel/node": "^3.2.29",  // ← Verificar esto existe
    ...
  }
}
```

**Acción**: Si falta, agregar y redeploy.

#### Fix B: Simplificar vercel.json
**Problema**: La configuración de `builds` puede estar causando problemas

**Solución**: Remover sección `builds` (Vercel auto-detecta)

**Archivo**: `vercel.json`
```json
{
  "version": 2,
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

**Razón**: Vercel 2.0+ auto-detecta funciones en `api/` folder

#### Fix C: Convertir TypeScript a JavaScript
**Problema**: Vercel tiene problemas compilando TypeScript

**Solución**: Convertir `api/session.ts` → `api/session.js`

**Ventaja**: JavaScript es más compatible
**Desventaja**: Perdemos type safety

---

### Solución 2: Si la Variable de Entorno No Está

#### Pasos para Configurar

1. **Ir a Vercel Dashboard**:
   ```
   Project → Settings → Environment Variables
   ```

2. **Click "Add New"**:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: `sk-proj-...` (tu API key completa de OpenAI)
   - **Environments**: ✓ Production, ✓ Preview, ✓ Development

3. **Click "Save"**

4. **Redeploy**:
   ```
   Deployments → Latest → ⋯ → Redeploy
   ```

**IMPORTANTE**: Después de agregar env vars, SIEMPRE hay que redeploy.

---

### Solución 3: Si Hay Problemas de CORS

#### Fix A: Agregar CORS Explícito en vercel.json

**Archivo**: `vercel.json`
```json
{
  "version": 2,
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" }
      ]
    }
  ],
  "routes": [...]
}
```

#### Fix B: Verificar CORS en api/session.ts

Ya tenemos CORS configurado, pero verificar que esté correcto.

---

### Solución 4: Si el Routing Está Mal

#### Fix: Simplificar Routing

**Actual**:
```json
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
```

**Simplificado**:
```json
"routes": [
  {
    "src": "/(.*)",
    "dest": "/$1"
  }
]
```

**O remover completamente**: Vercel maneja routing automáticamente

---

### Solución 5: Mejorar Error Handling en Frontend

#### Problema
El error actual no da información útil:
```javascript
if (!response.ok) {
  throw new Error('Error al obtener el token de sesión');
}
```

#### Solución: Agregar Detalles del Error

**Archivo**: `public/agent.js`

```javascript
const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
});

if (!response.ok) {
  // Intentar leer el body del error
  let errorMessage = 'Error al obtener el token de sesión';
  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorData.message || errorMessage;
    console.error('[Frontend] API Error:', errorData);
  } catch (e) {
    // Si el body no es JSON, usar el status
    errorMessage = `${errorMessage} (HTTP ${response.status})`;
  }

  throw new Error(errorMessage);
}
```

**Beneficio**: Vemos el error real del backend

---

## 4. Plan de Implementación Paso a Paso

### FASE 1: Diagnóstico (NO HACE CAMBIOS)

1. ✅ Revisar Vercel Build Logs
2. ✅ Revisar Environment Variables
3. ✅ Revisar Network Tab en DevTools
4. ✅ Revisar Function Logs
5. ✅ Testing con cURL

**Output**: Identificar cuál hipótesis es correcta

---

### FASE 2: Fix Basado en Diagnóstico

#### Si es Hipótesis 1 (Funciones no compiladas):
1. Verificar `@vercel/node` en package.json
2. Simplificar vercel.json (remover builds)
3. Commit y push
4. Verificar redeploy
5. Testing

#### Si es Hipótesis 2 (Env var faltante):
1. Agregar `OPENAI_API_KEY` en Vercel
2. Redeploy
3. Testing

#### Si es Hipótesis 3 (CORS):
1. Agregar headers CORS en vercel.json
2. Commit y push
3. Testing

#### Si es Hipótesis 4 (Routing):
1. Simplificar routes en vercel.json
2. Commit y push
3. Testing

---

### FASE 3: Mejoras de Error Handling (SIEMPRE)

Independiente del fix, mejorar error handling:

1. **Actualizar agent.js**:
   - Agregar logging detallado del error
   - Mostrar status code
   - Mostrar body del error

2. **Commit y push**

3. **Testing final**

---

## 5. Testing Post-Fix

### Test 1: Conexión Básica
1. Ir a URL de Vercel
2. Abrir DevTools
3. Click "Conectar & Empezar a Charlar"
4. Verificar:
   - ✅ Status 200 en `/api/session`
   - ✅ Response tiene `value` con clave `ek_...`
   - ✅ Conexión exitosa
   - ✅ Status cambia a "Conectada"

### Test 2: Voz
1. Después de conectar
2. Hablar al micrófono
3. Verificar:
   - ✅ Transcript aparece
   - ✅ Eureka responde
   - ✅ Audio se escucha

### Test 3: Texto
1. Escribir mensaje
2. Click "Enviar"
3. Verificar:
   - ✅ Mensaje aparece en transcript
   - ✅ Eureka responde
   - ✅ No duplicados en eventos

---

## 6. Verificaciones de Seguridad

Después del fix, verificar:

1. **API Key Segura**:
   - ✅ `.env` en `.gitignore`
   - ✅ API key solo en Vercel env vars
   - ✅ No expuesta en código frontend

2. **CORS Correcto**:
   - ✅ No permite todos los orígenes en producción (si es posible)
   - ✅ Solo permite métodos necesarios

3. **Rate Limiting**:
   - ⚠️ Considerar agregar rate limiting
   - ⚠️ OpenAI tiene sus propios límites

---

## 7. Documentación Post-Fix

Después de resolver, actualizar:

1. **DEPLOYMENT.md**:
   - Agregar sección "Troubleshooting Common Errors"
   - Documentar este error específico

2. **DOCUMENTACION.md**:
   - Agregar en Troubleshooting
   - Incluir solución

3. **README.md** (si existe):
   - Quick start con nota sobre env vars

---

## 8. Checklist Final

- [ ] Diagnóstico completado
- [ ] Hipótesis correcta identificada
- [ ] Fix implementado
- [ ] Código pusheado a GitHub
- [ ] Vercel redeployed
- [ ] Build logs verificados (sin errores)
- [ ] Function logs verificados (sin errores)
- [ ] Test 1: Conexión básica ✅
- [ ] Test 2: Voz ✅
- [ ] Test 3: Texto ✅
- [ ] No duplicados en eventos ✅
- [ ] Error handling mejorado ✅
- [ ] Documentación actualizada ✅

---

## 9. Puntos Críticos a Recordar

1. **SIEMPRE verificar env vars después de deployment**
2. **SIEMPRE revisar build logs en Vercel**
3. **NUNCA asumir que TypeScript se compila automáticamente**
4. **SIEMPRE mejorar error messages para debugging futuro**
5. **Las funciones en `api/` necesitan runtime correcto (@vercel/node)**

---

## 10. Plan de Rollback

Si el fix no funciona:

1. **Revertir último commit**:
   ```bash
   git revert HEAD
   git push
   ```

2. **O hacer rollback en Vercel**:
   - Deployments → Deployment anterior → Promote to Production

3. **Investigar más con logs detallados**

---

## 11. Próximos Pasos (Después del Fix)

1. Monitorear logs de producción por 24 horas
2. Agregar analytics/monitoring (opcional)
3. Documentar incidente en changelog
4. Considerar agregar health check endpoint visible
5. Considerar agregar status page

---

## Resumen Ejecutivo

**Problema**: Error al obtener token de sesión en producción
**Causa Más Probable**: Funciones serverless no compiladas O env var faltante
**Fix Estimado**: 10-30 minutos
**Riesgo**: Bajo (cambios mínimos)

**Acción Inmediata**: Ejecutar Fase 1 (Diagnóstico) antes de cualquier cambio de código.

---

**Autor**: Claude
**Fecha**: 2025-01-10
**Versión**: 1.0
