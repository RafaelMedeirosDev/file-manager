import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ExamCategory, Prisma, PrismaClient, ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { Pool } from 'pg';
import { BCRYPT_SALT_ROUNDS } from '../src/shared/constants/bcrypt.constants';
import { DEMO_ASSETS } from './demo-assets';

/**
 * Reconstroi a organizacao de demonstracao do zero.
 *
 * Roda todas as noites por cron. E por isso que ele RECONSTROI em vez de
 * semear: `upsert` e idempotente mas nao limpa, e um visitante que criasse 200
 * pastas as deixaria para sempre. Apagar e recriar mantem a demo igual para
 * quem chega depois.
 *
 * Arquivo separado do seed.ts de proposito, e a separacao nao e organizacional:
 * um seed unico rodando em cron de producao recriaria `admin@filemanager.dev`,
 * com a senha de desenvolvimento publicada no README, DENTRO da organizacao
 * real.
 *
 * Nunca toca o R2. As linhas de `files` apontam para objetos fixos que o
 * upload-demo-assets.ts subiu uma vez -- ver demo-assets.ts.
 */

// A organizacao e resolvida pelo slug, que e unique, em vez de por um id
// literal. O id existe uma vez so, no SQL da migration que criou a linha.
const DEMO_ORGANIZATION_SLUG = 'demo';
const PRINCIPAL_ORGANIZATION_SLUG = 'principal';

/**
 * Sufixo que marca toda conta desta organizacao.
 *
 * E uma das duas guardas do delete de `users`, que e a unica tabela sem
 * `organization_id` para filtrar. Ver a funcao `wipeDemoOrganization`.
 */
const DEMO_EMAIL_SUFFIX = '@demo.filemanager.dev';

// Credenciais publicadas no README. Nao ha nada a proteger: elas dao acesso a
// uma organizacao descartavel, isolada dos dados reais e reconstruida a cada
// noite.
const DEMO_ADMIN_EMAIL = `admin${DEMO_EMAIL_SUFFIX}`;
const DEMO_USER_EMAIL = `user${DEMO_EMAIL_SUFFIX}`;
const DEMO_PASSWORD = 'demo1234';

/** `users.name` e VarChar(50) e `users.email` tambem -- nomes curtos. */
const PATIENTS = [
  'Ana Carolina Ribeiro',
  'Bruno Tavares Lima',
  'Carla Mendes Pinto',
  'Diego Nunes Barreto',
  'Eduarda Prado Salles',
  'Felipe Andrade Rocha',
  'Gabriela Moraes Luz',
  'Henrique Bastos Reis',
  'Isabela Fontes Braga',
  'Joao Vitor Camargo',
  'Larissa Duarte Alves',
  'Marcelo Freitas Pena',
  'Natalia Queiroz Sa',
  'Otavio Bandeira Cruz',
];

/**
 * 18 exames cobrindo os 8 valores de ExamCategory.
 *
 * O volume nao e arbitrario: a tela de exames usa PAGE_LIMIT = 10 no
 * frontend, entao a paginacao so aparece a partir de 11 registros.
 */
const EXAMS: Array<{ name: string; code: string; category: ExamCategory }> = [
  {
    name: 'Hemograma completo',
    code: '40304361',
    category: ExamCategory.HEMATOLOGY,
  },
  { name: 'Coagulograma', code: '40304418', category: ExamCategory.HEMATOLOGY },
  {
    name: 'Contagem de plaquetas',
    code: '40304337',
    category: ExamCategory.HEMATOLOGY,
  },
  {
    name: 'Glicemia de jejum',
    code: '40301150',
    category: ExamCategory.BIOCHEMISTRY,
  },
  {
    name: 'Colesterol total e fracoes',
    code: '40301621',
    category: ExamCategory.BIOCHEMISTRY,
  },
  {
    name: 'Creatinina serica',
    code: '40302040',
    category: ExamCategory.BIOCHEMISTRY,
  },
  { name: 'TSH', code: '40316050', category: ExamCategory.ENDOCRINE_METABOLIC },
  {
    name: 'T4 livre',
    code: '40316122',
    category: ExamCategory.ENDOCRINE_METABOLIC,
  },
  {
    name: 'Hemoglobina glicada',
    code: '40301630',
    category: ExamCategory.ENDOCRINE_METABOLIC,
  },
  {
    name: 'Fator V de Leiden',
    code: '40307891',
    category: ExamCategory.THROMBOPHILIA,
  },
  {
    name: 'Mutacao da protrombina',
    code: '40307905',
    category: ExamCategory.THROMBOPHILIA,
  },
  { name: 'Urocultura', code: '40310120', category: ExamCategory.MICROBIOLOGY },
  {
    name: 'Hemocultura',
    code: '40310031',
    category: ExamCategory.MICROBIOLOGY,
  },
  {
    name: 'Fator antinuclear (FAN)',
    code: '40306313',
    category: ExamCategory.IMMUNOLOGY,
  },
  {
    name: 'Proteina C reativa',
    code: '40306526',
    category: ExamCategory.IMMUNOLOGY,
  },
  {
    name: 'Beta HCG quantitativo',
    code: '40316220',
    category: ExamCategory.OBSTETRIC_MARKERS,
  },
  {
    name: 'Ultrassonografia abdominal',
    code: '40901130',
    category: ExamCategory.IMAGING,
  },
  {
    name: 'Ultrassonografia obstetrica',
    code: '40901210',
    category: ExamCategory.IMAGING,
  },
];

/** Indicacoes clinicas plausiveis. Uma delas longa, para a coluna nao parecer sempre curta. */
const INDICATIONS = [
  'Jejum de 12 horas. Paciente em uso de levotiroxina.',
  'Investigacao de anemia. Repetir em 30 dias.',
  'Controle de rotina anual.',
  'Suspeita de hipotireoidismo subclinico.',
  'Acompanhamento de quadro trombofilico familiar. Paciente relata episodio previo de trombose venosa profunda em membro inferior direito, ha aproximadamente dois anos, sem uso de anticoagulante no momento. Solicitado painel completo para estratificacao de risco antes de procedimento cirurgico eletivo.',
  'Dor abdominal em hipocondrio direito.',
  'Pre-operatorio de cirurgia eletiva.',
  'Gestante, primeiro trimestre.',
  'Quadro febril sem foco definido.',
  'Revisao de exames alterados na ultima consulta.',
  'Monitoramento de funcao renal.',
  'Investigacao de quadro articular inflamatorio.',
];

function createPrismaClient(): { prisma: PrismaClient; pool: Pool } {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool, { schema: process.env.DATABASE_SCHEMA });

  return { prisma: new PrismaClient({ adapter }), pool };
}

/** Email curto e estavel a partir do nome, dentro do VarChar(50) de users.email. */
function emailFor(patientName: string): string {
  const [first, ...rest] = patientName.toLowerCase().split(' ');
  const last = rest[rest.length - 1] ?? '';
  return `${first}.${last}${DEMO_EMAIL_SUFFIX}`;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Apaga tudo que pertence a organizacao de demonstracao.
 *
 * A ordem segue as FKs: `exam_requests` primeiro, porque as linhas da juncao
 * `_ExamToExamRequest` saem por CASCADE ao apagar a solicitacao; `users` por
 * ultimo, porque `user_id` e ON DELETE RESTRICT.
 *
 * Delete FISICO, e isso contraria `prisma.md` ("soft delete em vez de delete
 * fisico"). A regra vale para o comportamento de negocio da API, nao para um
 * script que reconstroi uma organizacao descartavel -- um soft delete aqui
 * acumularia lixo para sempre, que e exatamente o que se quer evitar.
 */
async function wipeDemoOrganization(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<void> {
  await tx.examRequest.deleteMany({ where: { organizationId } });
  await tx.exam.deleteMany({ where: { organizationId } });
  await tx.file.deleteMany({ where: { organizationId } });
  await tx.folder.deleteMany({ where: { organizationId } });
  await tx.membership.deleteMany({ where: { organizationId } });

  // `users` e a unica tabela sem `organization_id`, porque a identidade e
  // global -- a mesma pessoa pode pertencer a duas organizacoes. Dai as DUAS
  // guardas somadas:
  //
  //   endsWith          so contas criadas por este script;
  //   memberships none  so quem ficou sem NENHUMA associacao.
  //
  // O deleteMany de memberships acima ja removeu os vinculos com a demo, entao
  // uma conta so-da-demo tem zero associacoes neste ponto e uma conta
  // multi-organizacao ainda tem a dela. A segunda guarda e o que impede este
  // script de apagar a conta real do operador, que e membro das duas.
  await tx.user.deleteMany({
    where: {
      email: { endsWith: DEMO_EMAIL_SUFFIX },
      memberships: { none: {} },
    },
  });
}

async function main(): Promise<void> {
  const { prisma, pool } = createPrismaClient();

  try {
    const organization = await prisma.organization.findUnique({
      where: { slug: DEMO_ORGANIZATION_SLUG },
    });

    if (!organization) {
      throw new Error(
        `Organizacao "${DEMO_ORGANIZATION_SLUG}" nao existe. ` +
          'Rode `pnpm prisma:migrate:deploy` antes do seed.',
      );
    }

    // Quem e ADMIN na organizacao principal recebe acesso ADMIN a demo, para
    // poder inspecionar o ambiente com a propria conta -- e e o que faz o
    // seletor de organizacao existir de fato em producao, em vez de ser um
    // caminho que so os testes percorrem.
    //
    // Resolvido por consulta em vez de e-mail cravado ou variavel de ambiente:
    // funciona em qualquer ambiente, sem configuracao. O efeito colateral e
    // que um ADMIN novo na principal passa a ter acesso a demo
    // automaticamente, o que para este projeto e aceitavel.
    const principal = await prisma.organization.findUnique({
      where: { slug: PRINCIPAL_ORGANIZATION_SLUG },
    });

    const operators = principal
      ? await prisma.membership.findMany({
          where: {
            organizationId: principal.id,
            role: ROLE.ADMIN,
            deletedAt: null,
            user: { deletedAt: null },
          },
          select: { userId: true },
        })
      : [];

    const demoPasswordHash = await hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

    await prisma.$transaction(async (tx) => {
      await wipeDemoOrganization(tx, organization.id);

      // ── Contas ───────────────────────────────────────────
      const demoAdmin = await tx.user.create({
        data: {
          name: 'Administrador Demo',
          email: DEMO_ADMIN_EMAIL,
          password: demoPasswordHash,
          role: ROLE.ADMIN,
        },
      });
      const demoUser = await tx.user.create({
        data: {
          name: 'Paciente Demo',
          email: DEMO_USER_EMAIL,
          password: demoPasswordHash,
          role: ROLE.USER,
        },
      });

      const patients = [];
      for (const name of PATIENTS) {
        patients.push(
          await tx.user.create({
            data: {
              name,
              email: emailFor(name),
              password: demoPasswordHash,
              role: ROLE.USER,
            },
          }),
        );
      }

      await tx.membership.createMany({
        data: [
          {
            userId: demoAdmin.id,
            organizationId: organization.id,
            role: ROLE.ADMIN,
          },
          {
            userId: demoUser.id,
            organizationId: organization.id,
            role: ROLE.USER,
          },
          ...patients.map((patient) => ({
            userId: patient.id,
            organizationId: organization.id,
            role: ROLE.USER,
          })),
          ...operators.map((operator) => ({
            userId: operator.userId,
            organizationId: organization.id,
            role: ROLE.ADMIN,
          })),
        ],
      });

      // ── Pastas ───────────────────────────────────────────
      // A pasta padrao espelha CreateUserWithFoldersUseCase: leva o nome do
      // usuario e e a unica onde um USER pode enviar arquivos.
      const owners = [demoUser, ...patients];
      const defaultFolders = new Map<string, string>();

      for (const owner of owners) {
        const folder = await tx.folder.create({
          data: {
            name: owner.name.slice(0, 50),
            organizationId: organization.id,
            userId: owner.id,
            isDefault: true,
          },
        });
        defaultFolders.set(owner.id, folder.id);
      }

      // Uma cadeia de tres niveis, para exercitar os `ancestors` do
      // GetFolderByIdUseCase e o breadcrumb da tela. Sem ela a hierarquia
      // nunca passa de um nivel e a feature nao aparece.
      const nivel2 = await tx.folder.create({
        data: {
          name: 'Exames 2026',
          organizationId: organization.id,
          userId: demoUser.id,
          folderId: defaultFolders.get(demoUser.id),
        },
      });
      const nivel3 = await tx.folder.create({
        data: {
          name: 'Cardiologia',
          organizationId: organization.id,
          userId: demoUser.id,
          folderId: nivel2.id,
        },
      });

      // Mais algumas subpastas rasas, para a arvore nao parecer uniforme.
      for (const patient of patients.slice(0, 4)) {
        await tx.folder.create({
          data: {
            name: 'Laudos anteriores',
            organizationId: organization.id,
            userId: patient.id,
            folderId: defaultFolders.get(patient.id),
          },
        });
      }

      // ── Arquivos ─────────────────────────────────────────
      // Apontam para objetos que JA existem no bucket. O ultimo vai na pasta
      // de terceiro nivel, para o download ser exercitado fora da raiz.
      for (const [index, asset] of DEMO_ASSETS.entries()) {
        const isLast = index === DEMO_ASSETS.length - 1;

        await tx.file.create({
          data: {
            name: asset.name,
            organizationId: organization.id,
            userId: demoUser.id,
            folderId: isLast ? nivel3.id : defaultFolders.get(demoUser.id),
            extension: asset.extension,
            key: asset.key,
          },
        });
      }

      // ── Catalogo de exames ───────────────────────────────
      await tx.exam.createMany({
        data: EXAMS.map((exam) => ({
          ...exam,
          organizationId: organization.id,
        })),
      });
      const exams = await tx.exam.findMany({
        where: { organizationId: organization.id },
        select: { id: true },
        orderBy: { code: 'asc' },
      });

      // ── Solicitacoes ─────────────────────────────────────
      // createdAt espalhado nos ultimos 60 dias, para o filtro de periodo da
      // tela ter o que recortar. `createdAt` tem @default(now()), mas aceita
      // valor explicito.
      for (const [index, indication] of INDICATIONS.entries()) {
        const owner = owners[index % owners.length];
        const examCount = (index % 4) + 1;
        const selected = exams
          .slice(index % (exams.length - examCount), undefined)
          .slice(0, examCount);

        await tx.examRequest.create({
          data: {
            organizationId: organization.id,
            userId: owner.id,
            indication,
            createdAt: daysAgo(index * 5 + 1),
            exams: { connect: selected.map(({ id }) => ({ id })) },
          },
        });
      }
    });

    const counts = {
      usuarios: await prisma.membership.count({
        where: { organizationId: organization.id, deletedAt: null },
      }),
      pastas: await prisma.folder.count({
        where: { organizationId: organization.id },
      }),
      arquivos: await prisma.file.count({
        where: { organizationId: organization.id },
      }),
      exames: await prisma.exam.count({
        where: { organizationId: organization.id },
      }),
      solicitacoes: await prisma.examRequest.count({
        where: { organizationId: organization.id },
      }),
    };

    console.log(`Organizacao "${organization.name}" reconstruida.`);
    console.log(`  ADMIN: ${DEMO_ADMIN_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`  USER:  ${DEMO_USER_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(
      `  ${counts.usuarios} associacoes (${operators.length} de operador)`,
    );
    console.log(`  ${counts.pastas} pastas, ${counts.arquivos} arquivos`);
    console.log(
      `  ${counts.exames} exames, ${counts.solicitacoes} solicitacoes`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
