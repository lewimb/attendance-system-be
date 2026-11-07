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
  await db.createTable('employees', {
    id: { type: type.BIGINT, primaryKey: true, autoIncrement: true },
    employee_code: {
      type: type.STRING,
      length: 20,
      unique: true,
      notNull: true,
    },
    full_name: { type: type.STRING, length: 100, notNull: true },
    email: { type: type.STRING, length: 255, unique: true, notNull: true },
    password: { type: type.STRING, length: 255, notNull: true },
    role_id: {
      type: type.SMALLINT,
      notNull: true,
      foreignKey: {
        name: 'employees_role_id_fk',
        table: 'roles',
        mapping: 'id',
        rules: { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
      },
    },
    department_id: {
      type: type.SMALLINT,
      notNull: true,
      foreignKey: {
        name: 'employees_department_id_fk',
        table: 'departments',
        mapping: 'id',
        rules: { onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
      },
    },
    phone: { type: type.STRING, length: 20 },
    is_active: { type: type.BOOLEAN, notNull: true, defaultValue: 1 },
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

  await db.addIndex('employees', 'idx_employees_dept_active', [
    'department_id',
    'is_active',
  ]);
};

exports.down = function (db) {
  return db.dropTable('employees');
};

exports._meta = {
  version: 1,
};
