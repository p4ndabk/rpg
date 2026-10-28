import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// base relativa: o app abre em qualquer endereço, inclusive num subcaminho do GitHub Pages (usuario.github.io/rpg/).
export default defineConfig({
  base: './',
  // Aceita conexões da rede local (outro computador ou celular), não só do localhost.
  server: { host: true },
  preview: { host: true },
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
  },
})
