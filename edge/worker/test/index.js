// Entry point so that `node --test edge/worker/test/` (a directory argument) works on Node 22, which resolves a
// directory to its index file instead of scanning it. The tests themselves live in worker.test.mjs.
import './worker.test.mjs';
