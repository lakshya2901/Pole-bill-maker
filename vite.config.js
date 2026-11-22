import { defineConfig, loadEnv } from 'vite';
import { existsSync } from 'node:fs';

// Dev only: serves the /api/*.js functions inside `vite` so saving works with `npm run dev:ui`.
export default defineConfig(({ mode }) => ({
  plugins: [{
    name: 'local-api',
    configureServer(server) {
      Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
      if (!process.env.DATABASE_URL) console.warn('[local-api] DATABASE_URL is not set — saving to the cloud will fail (see .env.example).');
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://x');
        const m = url.pathname.match(/^\/api\/([a-zA-Z][\w-]*)$/);   // no leading "_" → private helpers aren't routable
        if (!m) return next();
        res.status = c => { res.statusCode = c; return res; };
        res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res; };
        if (!existsSync(new URL(`./api/${m[1]}.js`, import.meta.url))) return res.status(404).json({ error: 'Unknown API route' });
        try {
          const chunks = []; for await (const c of req) chunks.push(c);
          const raw = Buffer.concat(chunks).toString();
          try { req.body = raw ? JSON.parse(raw) : undefined; }
          catch { return res.status(400).json({ error: 'Invalid JSON body' }); }
          req.query = Object.fromEntries(url.searchParams);
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`);
          await mod.default(req, res);
        } catch (e) {
          console.error(e);
          res.status(500).json({ error: 'Server error' });
        }
      });
    }
  }]
}));
