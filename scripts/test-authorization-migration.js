const path = require('path')
const dotenv = require('dotenv')
const mysql = require('mysql2/promise')
const { DataSource } = require('typeorm')

const backendRoot = path.resolve(__dirname, '..')
const environmentPath = path.join(backendRoot, '.env')
const migrationPath = path.join(
  backendRoot,
  'src',
  'database',
  'migrations',
  '2026080700000-AuthorizationFoundation.ts'
)

async function main() {
  const environmentResult = dotenv.config({
    path: environmentPath,
    processEnv: {},
    quiet: true
  })

  if (environmentResult.error) {
    throw environmentResult.error
  }

  const configuration = environmentResult.parsed || {}
  const requiredVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_DATABASE'
  ]

  const missingVariables = requiredVariables.filter((name) => {
    const value = configuration[name]

    return typeof value !== 'string' || value.trim() === ''
  })

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing database variables: ${missingVariables.join(', ')}`
    )
  }

  const databasePort = Number(configuration.DB_PORT)

  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65535
  ) {
    throw new Error('Invalid database port.')
  }

  const temporaryDatabase =
    `bionexus_authorization_test_${Date.now()}`

  const connectionOptions = {
    host: configuration.DB_HOST.trim(),
    port: databasePort,
    user: configuration.DB_USER.trim(),
    password: configuration.DB_PASSWORD
  }

  const administrationConnection =
    await mysql.createConnection(connectionOptions)

  let dataSource = null
  let temporaryDatabaseCreated = false

  try {
    await administrationConnection.query(`
      CREATE DATABASE \`${temporaryDatabase}\`
      CHARACTER SET utf8mb4
      COLLATE utf8mb4_general_ci
    `)

    temporaryDatabaseCreated = true

    dataSource = new DataSource({
      type: 'mysql',
      host: connectionOptions.host,
      port: connectionOptions.port,
      username: connectionOptions.user,
      password: connectionOptions.password,
      database: temporaryDatabase,
      synchronize: false,
      logging: false,
      entities: [],
      migrations: []
    })

    await dataSource.initialize()

    await dataSource.query(`
      CREATE TABLE users (
        id int NOT NULL AUTO_INCREMENT,
        name varchar(100) NOT NULL,
        roles varchar(100) NOT NULL DEFAULT 'user',
        hide_user tinyint NOT NULL DEFAULT 0,
        PRIMARY KEY (id)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_general_ci
    `)

    await dataSource.query(`
      INSERT INTO users (name, roles, hide_user)
      VALUES
        ('Synthetic Administrator 1', 'admin,annular', 0),
        ('Synthetic Administrator 2', 'admin,annular', 0),
        ('Synthetic Standard User', 'user', 0)
    `)

    const migrationModule = require(migrationPath)
    const migration =
      new migrationModule.AuthorizationFoundation2026080700000()

    const queryRunner = dataSource.createQueryRunner()

    await queryRunner.connect()

    try {
      await migration.up(queryRunner)

      const tables = await queryRunner.query(`
        SELECT table_name AS tableName
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name LIKE 'security\\_%'
        ORDER BY table_name
      `)

      const roles = await queryRunner.query(`
        SELECT code
        FROM security_roles
        ORDER BY code
      `)

      const permissions = await queryRunner.query(`
        SELECT code
        FROM security_permissions
        ORDER BY code
      `)

      const rolePermissions = await queryRunner.query(`
        SELECT
          role.code AS roleCode,
          COUNT(*) AS permissionCount
        FROM security_role_permissions assignment
        INNER JOIN security_roles role
          ON role.id = assignment.role_id
        GROUP BY role.code
        ORDER BY role.code
      `)

      const userRoles = await queryRunner.query(`
        SELECT
          assignment.user_id AS userId,
          GROUP_CONCAT(
            role.code
            ORDER BY role.code
            SEPARATOR ','
          ) AS roles
        FROM security_user_roles assignment
        INNER JOIN security_roles role
          ON role.id = assignment.role_id
        GROUP BY assignment.user_id
        ORDER BY assignment.user_id
      `)

      const foreignKeys = await queryRunner.query(`
        SELECT constraint_name AS constraintName
        FROM information_schema.table_constraints
        WHERE table_schema = DATABASE()
          AND table_name LIKE 'security\\_%'
          AND constraint_type = 'FOREIGN KEY'
      `)

      const assignments = Object.fromEntries(
        rolePermissions.map((item) => [
          item.roleCode,
          Number(item.permissionCount)
        ])
      )

      const upChecks = {
        tables: tables.length === 5,
        roles: roles.length === 3,
        permissions: permissions.length === 15,
        adminPermissions: assignments.admin === 15,
        userPermissions: assignments.user === 1,
        cancellationPermissions: assignments.annular === 1,
        userAssignments: userRoles.length === 3,
        foreignKeys: foreignKeys.length === 6
      }

      if (!Object.values(upChecks).every(Boolean)) {
        throw new Error(
          `Migration up validation failed: ${JSON.stringify(upChecks)}`
        )
      }

      await migration.down(queryRunner)

      const remainingTables = await queryRunner.query(`
        SELECT table_name AS tableName
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name LIKE 'security\\_%'
      `)

      const remainingUsers = await queryRunner.query(`
        SELECT id, roles
        FROM users
        ORDER BY id
      `)

      const downChecks = {
        securityTablesRemoved: remainingTables.length === 0,
        usersPreserved: remainingUsers.length === 3,
        legacyRolesPreserved:
          remainingUsers[0].roles === 'admin,annular' &&
          remainingUsers[1].roles === 'admin,annular' &&
          remainingUsers[2].roles === 'user'
      }

      if (!Object.values(downChecks).every(Boolean)) {
        throw new Error(
          `Migration down validation failed: ${JSON.stringify(
            downChecks
          )}`
        )
      }

      console.log('Bio Nexus authorization migration smoke test')
      console.log('')
      console.log(`Temporary database = ${temporaryDatabase}`)
      console.log('Synthetic data     = true')
      console.log('Source database    = not modified')
      console.log('Migration up       = approved')
      console.log('Migration down     = approved')
      console.log(`Tables created     = ${tables.length}`)
      console.log(`Roles created      = ${roles.length}`)
      console.log(`Permissions created= ${permissions.length}`)
      console.log(`Foreign keys       = ${foreignKeys.length}`)
      console.log('')
      console.log('Permissions by role')

      for (const item of rolePermissions) {
        console.log(
          `${item.roleCode} = ${Number(item.permissionCount)}`
        )
      }
    } finally {
      await queryRunner.release()
    }
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy()
    }

    if (temporaryDatabaseCreated) {
      await administrationConnection.query(
        `DROP DATABASE IF EXISTS \`${temporaryDatabase}\``
      )
    }

    const [remainingDatabases] =
      await administrationConnection.query(
        `
          SELECT schema_name AS schemaName
          FROM information_schema.schemata
          WHERE schema_name = ?
        `,
        [temporaryDatabase]
      )

    await administrationConnection.end()

    console.log('')
    console.log(
      `Temporary database removed = ${
        remainingDatabases.length === 0
      }`
    )
  }
}

main().catch((error) => {
  console.error('')
  console.error('Authorization migration smoke test failed.')
  console.error(error && error.message ? error.message : error)
  process.exitCode = 1
})
