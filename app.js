import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { graphqlHTTP } from 'express-graphql';
import graphqlSchema from './graphql/schema.js';
import * as graphqlResolvers from './graphql/resolvers.js';
import { clearImage } from './util/file.js';

import playground from 'graphql-playground-middleware-express';
import auth from './middleware/auth.js';

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const app = express();

// app.use(bodyParser.urlencoded()); // x-www-form-url-encoded <form>إ

app.use(bodyParser.json()); // application/json
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));
app.use('/images', express.static(path.join(process.cwd(), '/images')));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('Not Authenticated.');
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided!' });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: 'File Stored.', filePath: req.file.path });
});

app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolvers,
    graphiql: true,
    customFormatErrorFn: (err) => {
      if (!err.originalError) {
        return err;
      }
      const {
        data,
        code = 500,
        message = 'An error occurred',
      } = err.originalError;
      return {
        message,
        status: code,
        data,
      };
    },
  })
);

app.get('/playground', playground.default({ endpoint: '/graphql' }));

app.use((error, req, res, next) => {
  console.log(error);
  const { statusCode = 500, message, data } = error;
  res.status(statusCode).json({
    message,
    data,
  });
});

try {
  await mongoose.connect('mongodb://127.0.0.1:27017/social');
  console.log('Connected to mongodb');
  app.listen(8080);
  console.log('Server started at port 8080');
} catch (err) {
  console.log(err);
}
