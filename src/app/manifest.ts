import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Modena Mecánico de Turno',
    short_name: 'Mecánico Modena',
    description: 'Inspecciones diarias y reportes de aeronaves e instalaciones',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#cc0000',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
