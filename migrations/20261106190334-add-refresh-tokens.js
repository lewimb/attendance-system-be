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
  return db.createTable('refresh_tokens', {
    id: { type: type.BIGINT, primaryKey: true, autoIncrement: true },
    employee_id: {
      type: type.BIGINT,
      notNull: true,
      foreignKey: {
        name: 'refresh_tokens_employee_id_fk',
        table: 'employees',
        mapping: 'id',
        rules: { onDelete: 'CASCADE', onUpdate: 'RESTRICT' },
      },
    },
    token_hash: {
      type: type.STRING,
      length: 64,
      unique: true,
      notNull: true,
    },
    expires_at: {
      type: type.DATE_TIME,
      notNull: true,
    },
    replaced_at: {
      type: type.DATE_TIME,
    },
    revoked_at: {
      type: type.DATE_TIME,
    },
    created_at: {
      type: type.TIMESTAMP,
      notNull: true,
      defaultValue: new String('CURRENT_TIMESTAMP'),
    },
  });
};

exports.down = function (db) {
  return db.dropTable('refresh_tokens');
};

exports._meta = {
  version: 1,
};
