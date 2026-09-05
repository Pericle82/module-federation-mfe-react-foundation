// Fake REST backend for the whole system: json-server over db.json on :4000,
// exposing /items and /users. It is the single source of truth every MFE reads
// through service_mfe (COMPREHENSIVE_GUIDE.md § 1).
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const delay = require('./delay');

// Order matters: defaults (logger, static, CORS) -> artificial delay -> router.
// jsonServer.defaults() already sets the permissive CORS headers the browser
// needs, so no CORS middleware of our own.
server.use(middlewares);
server.use(delay);
server.use(router);

server.listen(4000, () => {
  console.log('JSON Server is running with delay');
});
