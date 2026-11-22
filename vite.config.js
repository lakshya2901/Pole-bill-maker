import { defineConfig, loadEnv } from 'vite';

// Dev only: serves the /api/*.js functions inside `vite` so saving works with `npm run dev:ui`.
export default defineConfig(({ mode }) => ({
  plugins: [{
    name: 'local-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://x');
        const m = url.pathname.match(/^\/api\/([\w-]+)$/);
        if (!m) return next();
        try {
          const chunks = []; for await (const c of req) chunks.push(c);
          const raw = Buffer.concat(chunks).toString();
          req.body = raw ? JSON.parse(raw) : undefined;
          req.query = Object.fromEntries(url.searchParams);
          res.status = c => { res.statusCode = c; return res; };
          res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`);
          await mod.default(req, res);
        } catch (e) {
          console.error(e);
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Server error' }));
        }
      });
    }
  }]
}));
