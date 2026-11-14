// The test helper deletes data, so its safety rules deserve tests of their own.
const { workerUri } = require('../helpers/db');

describe('workerUri', () => {
  test('gives each Jest worker its own database', () => {
    expect(workerUri('mongodb://127.0.0.1:27017/b2b_procurement_test', '1')).toBe('mongodb://127.0.0.1:27017/b2b_procurement_test_w1');
    expect(workerUri('mongodb://127.0.0.1:27017/b2b_procurement_test', '3')).toBe('mongodb://127.0.0.1:27017/b2b_procurement_test_w3');
  });
  test('keeps credentials and options (Atlas style)', () => {
    const out = workerUri('mongodb+srv://user:pass@cluster0.abc12.mongodb.net/b2b_procurement_test?appName=Cluster0', '2');
    expect(out).toBe('mongodb+srv://user:pass@cluster0.abc12.mongodb.net/b2b_procurement_test_w2?appName=Cluster0');
  });
  test('uses worker 1 when Jest gives no worker id (running in band)', () => {
    expect(workerUri('mongodb://127.0.0.1:27017/my_test_db')).toMatch(/my_test_db_w\d+$/);
  });
  test('refuses any database whose name does not contain "test"', () => {
    expect(() => workerUri('mongodb://127.0.0.1:27017/b2b_procurement')).toThrow(/Refusing to run tests/);
    expect(() => workerUri('mongodb://127.0.0.1:27017/')).toThrow(/Refusing to run tests/);
    expect(() => workerUri('mongodb+srv://u:p@c.mongodb.net/production')).toThrow(/Refusing to run tests/);
  });
});
