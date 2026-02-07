const connectionManager = require('../utils/sqliteConnectionManager');

// Export connection manager methods for backward compatibility
module.exports = {
  query: (text, params) => connectionManager.query(text, params),
  run: (text, params) => connectionManager.run(text, params),
  getConnection: () => connectionManager.getConnection(),
  getStatus: () => connectionManager.getStatus(),
  shutdown: () => connectionManager.shutdown(),
};
