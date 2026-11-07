'use strict';

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};
exports.up = function (db) {
  return db.createTable('departments', {
    id: { type: type.SMALLINT, primaryKey: true, autoIncrement: true },
    name: { type: type.STRING, length: 100, notNull: true, unique: true },
    created_at: {
      type: type.TIMESTAMP,
      notNull: true,
      defaultValue: 'CURRENT_TIMESTAMP',
    },
    updated_at: {
      type: type.TIMESTAMP,
      notNull: true,
      defaultValue: 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
    },
  });
};

exports.down = function (db) {
  return db.dropTable('departments');
};

exports._meta = {
  version: 1,
};
