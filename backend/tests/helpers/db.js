const mongoose = require('mongoose');
const os = require('os');

let mongod;

// Inside Jest, the MongoDB driver cannot load its "os" module through a dynamic import(),
// so it silently sends an empty handshake and the server rejects it with
// "Missing required sub-document 'driver'". Handing it the module avoids that.
// (Only needed under Jest; the real server in src/ runs in normal Node.)
const connectOptions = { runtimeAdapters: { os } };

// Two ways to get a database for tests:
//  1. TEST_MONGODB_URI set  -> use that MongoDB (local install, Docker or Atlas).
//     Its database name MUST contain "test", because clear() deletes every collection.
//  2. Not set               -> start a throwaway MongoDB with mongodb-memory-server
//     (downloads a mongod binary on first use, which can be slow or blocked).
async function connect() {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri) {
    const dbName = (new URL(uri).pathname || '').replace('/', '');
    if (!/test/i.test(dbName)) {
      throw new Error(
        'Refusing to run tests: the database name in TEST_MONGODB_URI must contain "test" ' +
          '(e.g. .../b2b_procurement_test) because tests delete all data in it.'
      );
    }
    await mongoose.connect(uri, { ...connectOptions, serverSelectionTimeoutMS: 15000 });
    return;
  }
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), connectOptions);
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { connect, clear, disconnect };
