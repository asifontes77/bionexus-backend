import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthorizationFoundation1786060800000 implements MigrationInterface {
  name = 'AuthorizationFoundation1786060800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userCounts = (await queryRunner.query(`
      SELECT
        COUNT(*) AS users_total,
        SUM(
          CASE
            WHEN FIND_IN_SET(
              'admin',
              REPLACE(LOWER(COALESCE(roles, '')), ' ', '')
            ) > 0
            THEN 1
            ELSE 0
          END
        ) AS administrators_total
      FROM users
    `)) as Array<{
      users_total: string | number;
      administrators_total: string | number;
    }>;

    const usersTotal = Number(userCounts[0]?.users_total ?? 0);
    const administratorsTotal = Number(
      userCounts[0]?.administrators_total ?? 0,
    );

    if (usersTotal > 0 && administratorsTotal === 0) {
      throw new Error(
        'Authorization migration requires at least one legacy admin user when users already exist.',
      );
    }

    await queryRunner.query(`
      CREATE TABLE security_roles (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(60) NOT NULL,
        name varchar(100) NOT NULL,
        description varchar(250) DEFAULT NULL,
        is_system tinyint NOT NULL DEFAULT 0,
        is_active tinyint NOT NULL DEFAULT 1,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_security_roles_code (code),
        KEY IX_security_roles_active (is_active)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE security_permissions (
        id int NOT NULL AUTO_INCREMENT,
        code varchar(120) NOT NULL,
        name varchar(120) NOT NULL,
        description varchar(250) DEFAULT NULL,
        module varchar(60) NOT NULL,
        is_active tinyint NOT NULL DEFAULT 1,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY UQ_security_permissions_code (code),
        KEY IX_security_permissions_module (module),
        KEY IX_security_permissions_active (is_active)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE security_role_permissions (
        role_id int NOT NULL,
        permission_id int NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id),
        KEY IX_security_role_permissions_permission (permission_id),
        CONSTRAINT FK_security_role_permissions_role
          FOREIGN KEY (role_id)
          REFERENCES security_roles (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        CONSTRAINT FK_security_role_permissions_permission
          FOREIGN KEY (permission_id)
          REFERENCES security_permissions (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE security_user_roles (
        user_id int NOT NULL,
        role_id int NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id),
        KEY IX_security_user_roles_role (role_id),
        CONSTRAINT FK_security_user_roles_user
          FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        CONSTRAINT FK_security_user_roles_role
          FOREIGN KEY (role_id)
          REFERENCES security_roles (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      CREATE TABLE security_user_permission_overrides (
        user_id int NOT NULL,
        permission_id int NOT NULL,
        effect enum('allow', 'deny') NOT NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
          ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, permission_id),
        KEY IX_security_user_permission_overrides_permission (permission_id),
        KEY IX_security_user_permission_overrides_effect (effect),
        CONSTRAINT FK_security_user_permission_overrides_user
          FOREIGN KEY (user_id)
          REFERENCES users (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        CONSTRAINT FK_security_user_permission_overrides_permission
          FOREIGN KEY (permission_id)
          REFERENCES security_permissions (id)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_general_ci
    `);

    await queryRunner.query(`
      INSERT INTO security_roles (
        code,
        name,
        description,
        is_system,
        is_active
      )
      VALUES
        (
          'admin',
          'Administrador',
          'Administracion completa del sistema',
          1,
          1
        ),
        (
          'user',
          'Usuario',
          'Acceso operativo general',
          1,
          1
        ),
        (
          'annular',
          'Autorizador de anulaciones',
          'Autoriza la anulacion de registros operativos',
          1,
          1
        )
    `);

    await queryRunner.query(`
      INSERT INTO security_permissions (
        code,
        name,
        description,
        module,
        is_active
      )
      VALUES
        (
          'security.roles.read',
          'Consultar roles',
          'Permite consultar roles y sus permisos',
          'security',
          1
        ),
        (
          'security.roles.create',
          'Crear roles',
          'Permite crear roles configurables',
          'security',
          1
        ),
        (
          'security.roles.update',
          'Actualizar roles',
          'Permite actualizar roles existentes',
          'security',
          1
        ),
        (
          'security.roles.assign-permissions',
          'Asignar permisos a roles',
          'Permite modificar los permisos de un rol',
          'security',
          1
        ),
        (
          'security.permissions.read',
          'Consultar permisos',
          'Permite consultar el catalogo de permisos',
          'security',
          1
        ),
        (
          'security.users.read',
          'Consultar usuarios',
          'Permite consultar usuarios y sus asignaciones',
          'security',
          1
        ),
        (
          'security.users.create',
          'Crear usuarios',
          'Permite crear usuarios',
          'security',
          1
        ),
        (
          'security.users.update',
          'Actualizar usuarios',
          'Permite actualizar usuarios',
          'security',
          1
        ),
        (
          'security.users.assign-roles',
          'Asignar roles a usuarios',
          'Permite modificar los roles de un usuario',
          'security',
          1
        ),
        (
          'security.users.assign-permissions',
          'Asignar excepciones a usuarios',
          'Permite conceder o negar permisos directos',
          'security',
          1
        ),
        (
          'parasiticforms.read',
          'Consultar formas parasitarias',
          'Permite consultar formas parasitarias',
          'parasiticforms',
          1
        ),
        (
          'parasiticforms.create',
          'Crear formas parasitarias',
          'Permite crear formas parasitarias',
          'parasiticforms',
          1
        ),
        (
          'parasiticforms.update',
          'Actualizar formas parasitarias',
          'Permite editar formas parasitarias',
          'parasiticforms',
          1
        ),
        (
          'parasiticforms.change-status',
          'Cambiar estado de formas parasitarias',
          'Permite ocultar o reactivar formas parasitarias',
          'parasiticforms',
          1
        ),
        (
          'patients.cancel',
          'Anular pacientes',
          'Permite autorizar la anulacion de pacientes',
          'patients',
          1
        )
    `);

    await queryRunner.query(`
      INSERT INTO security_role_permissions (
        role_id,
        permission_id
      )
      SELECT
        role.id,
        permission.id
      FROM security_roles role
      CROSS JOIN security_permissions permission
      WHERE role.code = 'admin'
    `);

    await queryRunner.query(`
      INSERT INTO security_role_permissions (
        role_id,
        permission_id
      )
      SELECT
        role.id,
        permission.id
      FROM security_roles role
      INNER JOIN security_permissions permission
        ON permission.code = 'parasiticforms.read'
      WHERE role.code = 'user'
    `);

    await queryRunner.query(`
      INSERT INTO security_role_permissions (
        role_id,
        permission_id
      )
      SELECT
        role.id,
        permission.id
      FROM security_roles role
      INNER JOIN security_permissions permission
        ON permission.code = 'patients.cancel'
      WHERE role.code = 'annular'
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO security_user_roles (
        user_id,
        role_id
      )
      SELECT
        user.id,
        role.id
      FROM users user
      INNER JOIN security_roles role
        ON role.code = 'admin'
      WHERE FIND_IN_SET(
        'admin',
        REPLACE(LOWER(COALESCE(user.roles, '')), ' ', '')
      ) > 0
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO security_user_roles (
        user_id,
        role_id
      )
      SELECT
        user.id,
        role.id
      FROM users user
      INNER JOIN security_roles role
        ON role.code = 'user'
      WHERE FIND_IN_SET(
        'user',
        REPLACE(LOWER(COALESCE(user.roles, '')), ' ', '')
      ) > 0
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO security_user_roles (
        user_id,
        role_id
      )
      SELECT
        user.id,
        role.id
      FROM users user
      INNER JOIN security_roles role
        ON role.code = 'annular'
      WHERE FIND_IN_SET(
        'annular',
        REPLACE(LOWER(COALESCE(user.roles, '')), ' ', '')
      ) > 0
    `);

    const normalizedAdministrators = (await queryRunner.query(`
      SELECT COUNT(DISTINCT user_role.user_id) AS total
      FROM security_user_roles user_role
      INNER JOIN security_roles role
        ON role.id = user_role.role_id
      WHERE role.code = 'admin'
        AND role.is_active = 1
    `)) as Array<{ total: string | number }>;

    if (
      usersTotal > 0 &&
      Number(normalizedAdministrators[0]?.total ?? 0) === 0
    ) {
      throw new Error(
        'Authorization migration did not assign any active administrator.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS security_user_permission_overrides
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS security_user_roles
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS security_role_permissions
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS security_permissions
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS security_roles
    `);
  }
}
