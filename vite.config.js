import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Se actualiza sola cuando haces cambios
      devOptions: {
        enabled: true // Permite probar la PWA localmente
      },
      manifest: {
        name: 'Gestor de Publicaciones UC - IEEE',
        short_name: 'PubliTracker',
        description: 'Trazabilidad de publicaciones universitarias e IEEE',
        theme_color: '#4f46e5', // El color índigo de tu barra superior
        background_color: '#f8fafc', // El color de fondo gris claro
        display: 'standalone', // ¡ESTO ES LO QUE LO HACE FULL SCREEN!
        orientation: 'portrait', // Para que se vea vertical en móviles
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})