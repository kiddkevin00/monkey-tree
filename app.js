const packageJson = require('./package.json');
const queryString = require('query-string');
const express = require('express');
const fs = require('fs');
const path = require('path');


const app = express();

app.set('views', path.resolve(__dirname, 'views/'));
app.set('view engine', 'pug');

const ip = process.env.IP || packageJson.config.ip;
const port = process.env.PORT || packageJson.config.port;

app.use(express.static(path.resolve(__dirname, 'public/')));

// All routes should direct to the index.pug
app.route('/*')
  .get((req, res) => {
    return res.sendFile(path.resolve(__dirname, './public/', 'home.html'));
  });

const server = app.listen(port, ip, () => {
  console.log('Express server listening on port: %d at IP: %s.',
    server.address().port, server.address().address);
});

module.exports = exports = app;
