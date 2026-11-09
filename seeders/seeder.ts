import bcrypt from 'bcryptjs';
import * as mysql from 'mysql2/promise';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seeder creates known passwords, do not run in production');
}

const EMPLOYEE_COUNT = 100;
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'Password123!';

const FIRST_NAMES = [
  'Adi',
  'Budi',
  'Citra',
  'Dewi',
  'Eka',
  'Fajar',
  'Gita',
  'Hana',
  'Indra',
  'Joko',
];
const LAST_NAMES = [
  'Wijaya',
  'Santoso',
  'Saputra',
  'Lestari',
  'Pratama',
  'Kusuma',
  'Hidayat',
  'Permata',
  'Nugroho',
  'Utami',
];

const access: mysql.ConnectionOptions = {
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT),
};

const conn = mysql.createPool(access);

async function getIdsByName(table: string) {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT id, name FROM ${table}`,
  );
  return new Map<string, number>(rows.map((row) => [row.name, row.id]));
}

try {
  // roles
  await conn.query(
    "INSERT IGNORE INTO roles (name) VALUES ('HR_ADMIN'), ('EMPLOYEE')",
  );
  console.log('Seeded 2 roles HR_ADMIN, EMPLOYEE');

  await conn.query(`INSERT IGNORE INTO departments (name)
            VALUES ('MARKETING'), ('R&D'), ('QA'),
            ('ERP/SAP'), ('IT')`);

  console.log('Seeded 5 departments MARKETING, R&D, QA, ERP/SAP, IT');

  const roleIds = await getIdsByName('roles');
  const departmentIds = await getIdsByName('departments');
  const departments = [...departmentIds.values()];

  const password = await bcrypt.hash(SEED_PASSWORD, 10);

  const hrAdmin = [
    'HR-0001',
    'HR Admin',
    'hr.admin@example.com',
    password,
    roleIds.get('HR_ADMIN'),
    departmentIds.get('IT'),
    '081200000000',
  ];

  const employees = Array.from({ length: EMPLOYEE_COUNT }, (_, index) => {
    const number = index + 1;
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName =
      LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];

    return [
      `EMP-${String(number).padStart(4, '0')}`,
      `${firstName} ${lastName}`,
      `employee${String(number).padStart(3, '0')}@example.com`,
      password,
      roleIds.get('EMPLOYEE'),
      departments[index % departments.length],
      `0812${String(number).padStart(8, '0')}`,
    ];
  });

  await conn.query(
    `INSERT IGNORE INTO employees
       (employee_code, full_name, email, password, role_id, department_id, phone)
     VALUES ?`,
    [[hrAdmin, ...employees]],
  );

  console.log(`Seeded 1 HR_ADMIN and ${EMPLOYEE_COUNT} EMPLOYEE rows`);
} finally {
  await conn.end();
}
