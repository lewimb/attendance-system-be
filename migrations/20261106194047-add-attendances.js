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

exports.up = async function (db) {
  await db.createTable('attendances', {
    id: { type: type.BIGINT, primaryKey: true, autoIncrement: true },
    employee_id: {
      type: type.BIGINT,
      notNull: true,
      foreignKey: {
        name: 'attendances_employee_id_fk',
        table: 'employees',
        mapping: 'id',
        rules: { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
      },
    },
    work_date: {
      type: type.DATE,
      notNull: true,
    },
    check_in_at: {
      type: type.DATE_TIME,
      defaultValue: new String('CURRENT_TIMESTAMP'),
      notNull: true,
    },
    check_in_photo_path: {
      type: type.STRING,
      length: 255,
      notNull: true,
    },
    check_in_photo_mime: {
      type: type.STRING,
      length: 20,
      notNull: true,
    },
    check_out_at: {
      type: type.DATE_TIME,
    },
    status: {
      type: type.STRING,
      length: 20,
      notNull: true,
    },
    created_at: {
      type: type.TIMESTAMP,
      notNull: true,
      defaultValue: new String('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: type.TIMESTAMP,
      notNull: true,
      defaultValue: new String('CURRENT_TIMESTAMP'),
      onUpdate: 'CURRENT_TIMESTAMP',
    },
  });

  await db.addIndex(
    'attendances',
    'uq_attendances_employee_id_work_date',
    ['employee_id', 'work_date'],
    true, // unique
  );

  await db.addIndex('attendances', 'idx_attendances_date_status', [
    'work_date',
    'status',
  ]);

  await db.runSql(`
    ALTER TABLE attendances
    ADD CONSTRAINT chk_checkout_after_checkin
    CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
  `);
};

exports.down = function (db) {
  return db.dropTable('attendances');
};

exports._meta = {
  version: 1,
};
