import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { User, UserRole } from '../users/entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';

async function seedAdmin() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [User, Organization],
    synchronize: false,
  });

  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(User);

    const email = 'admin@example.com';
    const existingUser = await userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      console.log(`Admin account already exists: ${email}`);
      return;
    }

    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!password || password.length < 12) {
      throw new Error(
        'Set SEED_ADMIN_PASSWORD to a password of at least 12 characters in your local .env file.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = userRepository.create({
      name: 'POMS Super Admin',
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      organizationId: null,
      isActive: true,
    });

    await userRepository.save(admin);

    console.log(`Super Admin created: ${email}`);
  } finally {
    await dataSource.destroy();
  }
}

seedAdmin().catch((error) => {
  console.error('Admin seed failed:', error);
  process.exitCode = 1;
});
