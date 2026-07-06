import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true faz o Vite escutar em todas as interfaces (0.0.0.0), o que
    // permite acessar pelo IP da rede local OU pelo IP da Tailscale (100.x.x.x)
    // — necessário pra o sócio acessar de outra máquina. Sem isso, só localhost.
    host: true,
    // O front fala com /api e o Vite repassa para o Node — sem CORS no dev.
    // O proxy do http-proxy lida com SSE (text/event-stream) sem config extra.
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
