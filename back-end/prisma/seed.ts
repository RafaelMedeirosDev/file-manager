import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ExamCategory, PrismaClient, ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { Pool } from 'pg';
import { BCRYPT_SALT_ROUNDS } from '../src/shared/constants/bcrypt.constants';

// Credenciais de desenvolvimento, documentadas no README. Nao ha nada
// sensivel aqui: este seed so faz sentido contra um banco local.
const ADMIN_EMAIL = 'admin@filemanager.dev';
const ADMIN_PASSWORD = 'admin123';
const USER_EMAIL = 'user@filemanager.dev';
const USER_PASSWORD = 'user123';

// Amostra do catalogo cobrindo categorias distintas, para haver o que
// selecionar no fluxo de solicitacao de exames.
const EXAMS = [
  {
    name: 'Hemograma completo',
    code: '40304361',
    category: ExamCategory.HEMATOLOGY,
  },
  {
    name: 'Glicemia de jejum',
    code: '40301150',
    category: ExamCategory.BIOCHEMISTRY,
  },
  { name: 'TSH', code: '40316050', category: ExamCategory.ENDOCRINE_METABOLIC },
  {
    name: 'Fator V de Leiden',
    code: '40307891',
    category: ExamCategory.THROMBOPHILIA,
  },
  {
    name: 'Ultrassonografia abdominal',
    code: '40901130',
    category: ExamCategory.IMAGING,
  },
];

// O datasource do schema nao declara `url`: a conexao vem do driver adapter,
// exatamente como em src/database/prisma.service.ts. Lemos as variaveis
// direto do process.env em vez de importar src/config/env.ts, que exigiria
// JWT_SECRET e as R2_* apenas para semear o banco.
function createPrismaClient(): { prisma: PrismaClient; pool: Pool } {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool, { schema: process.env.DATABASE_SCHEMA });

  return { prisma: new PrismaClient({ adapter }), pool };
}

async function main(): Promise<void> {
  const { prisma, pool } = createPrismaClient();

  try {
    // Tudo por upsert: rodar o seed duas vezes nao pode quebrar.
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {},
      create: {
        name: 'Administrador',
        email: ADMIN_EMAIL,
        password: await hash(ADMIN_PASSWORD, BCRYPT_SALT_ROUNDS),
        role: ROLE.ADMIN,
      },
    });

    const user = await prisma.user.upsert({
      where: { email: USER_EMAIL },
      update: {},
      create: {
        name: 'Usuario Comum',
        email: USER_EMAIL,
        password: await hash(USER_PASSWORD, BCRYPT_SALT_ROUNDS),
        role: ROLE.USER,
      },
    });

    // Espelha CreateUserWithFoldersUseCase: a pasta padrao leva o nome do
    // usuario e e a unica onde um USER pode enviar arquivos.
    const existingDefaultFolder = await prisma.folder.findFirst({
      where: { userId: user.id, isDefault: true, deletedAt: null },
    });

    if (!existingDefaultFolder) {
      await prisma.folder.create({
        data: { name: user.name, userId: user.id, isDefault: true },
      });
    }

    for (const exam of EXAMS) {
      await prisma.exam.upsert({
        where: { code: exam.code },
        update: {},
        create: exam,
      });
    }

    console.log('Seed concluido.');
    console.log(`  ADMIN: ${admin.email} / ${ADMIN_PASSWORD}`);
    console.log(`  USER:  ${user.email} / ${USER_PASSWORD}`);
    console.log(`  ${EXAMS.length} exames no catalogo`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
