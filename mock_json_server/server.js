const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const delay = require('./delay');

server.use(middlewares);
server.use(delay); // Add artificial delay to all responses
server.use(router);

server.listen(4000, () => {
  console.log('JSON Server is running with delay');
});
