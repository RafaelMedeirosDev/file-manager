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

// A organizacao e resolvida pelo slug, que e unique, em vez de por um id
// literal repetido aqui. O id existe uma vez so, no SQL da migration que criou
// a linha -- duplica-lo em TypeScript criaria duas fontes da verdade para o
// mesmo valor, e a segunda ninguem lembraria de atualizar.
const PRINCIPAL_ORGANIZATION_SLUG = 'principal';

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

    const organization = await prisma.organization.findUnique({
      where: { slug: PRINCIPAL_ORGANIZATION_SLUG },
    });

    // Mensagem explicita em vez de deixar o erro do Prisma falar: este e o
    // caminho de onboarding, e "organizacao nao encontrada" nao diz a quem
    // acabou de clonar o projeto que falta rodar a migration.
    if (!organization) {
      throw new Error(
        `Organizacao "${PRINCIPAL_ORGANIZATION_SLUG}" nao existe. ` +
          'Rode `pnpm prisma:migrate:deploy` antes do seed.',
      );
    }

    // As associacoes com a organizacao principal. Sao elas que carregam o
    // papel: `users.role` ainda e gravado acima, mas sera dropada no contract,
    // e a partir do PR de autenticacao e daqui que o papel e lido.
    //
    // Sem esta parte o seed continua passando e o login para de funcionar --
    // um usuario sem nenhuma associacao ativa e recusado no passo 1.
    for (const [account, role] of [
      [admin, ROLE.ADMIN],
      [user, ROLE.USER],
    ] as const) {
      await prisma.membership.upsert({
        where: {
          userId_organizationId: {
            userId: account.id,
            organizationId: organization.id,
          },
        },
        update: {},
        create: {
          userId: account.id,
          organizationId: organization.id,
          role,
        },
      });
    }

    // Espelha CreateUserWithFoldersUseCase: a pasta padrao leva o nome do
    // usuario e e a unica onde um USER pode enviar arquivos.
    const existingDefaultFolder = await prisma.folder.findFirst({
      where: {
        organizationId: organization.id,
        userId: user.id,
        isDefault: true,
        deletedAt: null,
      },
    });

    if (!existingDefaultFolder) {
      await prisma.folder.create({
        data: {
          name: user.name,
          organizationId: organization.id,
          userId: user.id,
          isDefault: true,
        },
      });
    }

    for (const exam of EXAMS) {
      await prisma.exam.upsert({
        where: {
          organizationId_code: {
            organizationId: organization.id,
            code: exam.code,
          },
        },
        update: {},
        create: { ...exam, organizationId: organization.id },
      });
    }

    console.log('Seed concluido.');
    console.log(`  ADMIN: ${admin.email} / ${ADMIN_PASSWORD}`);
    console.log(`  USER:  ${user.email} / ${USER_PASSWORD}`);
    console.log(`  ${EXAMS.length} exames no catalogo`);
    console.log(`  ambos associados a organizacao ${organization.name}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
