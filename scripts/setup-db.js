// Optional: creates the tables up front. (The API also does this automatically.)
// Run with: npm run db:setup   (reads DATABASE_URL from .env.local)
import { ensureSchema } from '../api/_lib.js';
try {
  await ensureSchema();
  console.log('Tables ready.');
} catch (e) {
  console.error('Database setup failed: ' + e.message);
  if (!process.env.DATABASE_URL) console.error('Set DATABASE_URL in .env.local (see .env.example).');
  process.exit(1);
}
