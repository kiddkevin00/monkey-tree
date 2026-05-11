const packageJson = require('./package.json');
const bodyParser = require('body-parser');
const Promise = require('bluebird');
const express = require('express');
const path = require('path');

const enableMongoDb = process.env.ENABLE_MONGODB === 'true';

let mongojs;

if (enableMongoDb) {
  mongojs = require('mongojs'); // eslint-disable-line global-require

  Promise.promisifyAll([
    require('mongojs/lib/collection'), // eslint-disable-line global-require
    require('mongojs/lib/database'), // eslint-disable-line global-require
    require('mongojs/lib/cursor'), // eslint-disable-line global-require
  ]);
}

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.json({
  type: 'application/vnd.api+json', // Parses "application/vnd.api+json" content-type as json.
}));

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(308, `https://${req.headers.host}${req.url}`);
  }

  if (req.headers['host'] && req.headers['host'].includes('herokuapp.com')) {
    return res.redirect(308, `https://monkeytree.io${req.url}`);
  }

  return next();
});

app.post('/subscribe', (req, res) => {
  if (!enableMongoDb) {
    return res.status(503).json({
      error: 'The persistence storage for subscription is disabled. Set the ENABLE_MONGODB env to true and the MONGODB_URL env to enable it.',
    });
  }

  const { name, email, description } = req.body;
  let connectionString;

  if (process.env.NODE_ENV === 'production') {
    connectionString = process.env.MONGODB_URL;
  } else {
    connectionString = 'mongodb://127.0.0.1:27017/MonkeyTreeTech';
  }

  if (!connectionString) {
    return res.status(500).json({
      error: 'The MONGODB_URL env is required when the ENABLE_MONGODB env is true in production.',
    });
  }

  const dbClient = mongojs(connectionString, [], {
    poolSize: 10,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 10000,
  });

  dbClient.collection('subscriber').saveAsync({
      name,
      email,
      description,
      systemData: {
        dateCreated: new Date(),
        createdBy: 'N/A',
        dateLastModified: null,
        lastModifiedBy: 'N/A',
      },
  })
    .then(subscriber => {
      return res.sendStatus(200);
    });
});

app.use(express.static(path.resolve(__dirname, 'public/'), { extensions: ['html'] }));

// All routes should direct to the index.html
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
