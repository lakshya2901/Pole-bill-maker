// Optional: creates the tables up front. (The API also does this automatically.)
import { ensureSchema } from '../api/_lib.js';
await ensureSchema();
console.log('Tables ready.');
