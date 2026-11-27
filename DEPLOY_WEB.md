# Despliegue web de VeriNews AI

## Despliegue en Render (Blueprint)

1. En Render, elige **New → Blueprint** y conecta este repositorio.
2. Render leerá el archivo `render.yaml` y creará el servicio web Node.
3. En el servicio, configura las variables secretas que realmente uses:
   - `GEMINI_API_KEY` (si el flujo requiere Gemini).
   - `GITHUB_CLIENT_ID` y `GITHUB_CLIENT_SECRET` (solo para OAuth / exportación GitHub).
4. Si activas GitHub OAuth, registra esta URL de callback en la OAuth App:
   `https://verinews-ai.onrender.com/auth/callback`
5. Espera a que el build y deploy terminen. La URL esperada del servicio será:
   `https://verinews-ai.onrender.com`

## Comandos

- Build: `npm install && npm run build`
- Start: `npm start` (ejecuta el servidor Express con TSX)
- Desarrollo: `npm run dev`

## Notas

- No se modifica ningún componente ni estilo de interfaz.
- La inferencia de los modelos clásicos se ejecuta en el runtime del proyecto.
- El historial y preferencias se almacenan en el navegador mediante LocalStorage; no son sincronizados entre dispositivos.
- El plan gratuito de Render puede suspender servicios por inactividad y el primer arranque puede tardar.
- El archivo `render.yaml` declara variables secretas como `sync: false`; Render solicitará que las configures en el panel.
