const packageJson = require('./package.json');
const express = require('express');
const path = require('path');

const app = express();

app.set('views', path.resolve(__dirname, 'views/'));
app.set('view engine', 'pug');

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(308, `https://${req.headers.host}${req.url}`);
  }
  return next();
});

app.use(express.static(path.resolve(__dirname, 'public/')));

// All routes should direct to the index.pug
app.route('/*')
  .get((req, res) => {
    return res.sendFile(path.resolve(__dirname, './public/', 'home.html'));
  });

const ip = process.env.IP || packageJson.config.ip;
const port = process.env.PORT || packageJson.config.port;

const server = app.listen(port, ip, () => {
  console.log('Express server listening on port: %d at IP: %s.',
    server.address().port, server.address().address);
});

module.exports = exports = app;
