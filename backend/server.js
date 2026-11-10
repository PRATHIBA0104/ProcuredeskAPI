const env = require('./src/config/env');
const connectDB = require('./src/config/db');
const app = require('./src/app');

async function start() {
  await connectDB(env.mongoUri);
  console.log('MongoDB connected');
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}/api/v1`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
