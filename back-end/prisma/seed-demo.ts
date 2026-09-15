import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { ExamCategory, Prisma, PrismaClient, ROLE } from '@prisma/client';
import { hash } from 'bcrypt';
import { Pool } from 'pg';
import { BCRYPT_SALT_ROUNDS } from '../src/shared/constants/bcrypt.constants';
import { randomUUID } from 'crypto';
import {
  DEMO_ASSETS,
  GUIDE_ASSETS,
  IMG_ASSETS,
  LAB_ASSETS,
  RX_ASSETS,
  type DemoAsset,
} from './demo-assets';

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
// ── Estrutura de pastas ─────────────────────────────────

type FolderTheme = { name: string; pool: DemoAsset[] };

/**
 * Cada subpasta tem um tema, e os arquivos dela saem do pool daquele tema.
 * E o que faz o conteudo de "Exames de imagem" combinar com o nome da pasta,
 * em vez de ser sorteio.
 *
 * Sao 5 temas e a escolha e `(i + s) % 5`, entao dois usuarios vizinhos
 * recebem as subpastas em ordem diferente.
 */
const FOLDER_THEMES: FolderTheme[] = [
  { name: 'Exames laboratoriais', pool: LAB_ASSETS },
  { name: 'Exames de imagem', pool: IMG_ASSETS },
  { name: 'Receitas e atestados', pool: RX_ASSETS },
  { name: 'Laudos anteriores', pool: LAB_ASSETS },
  { name: 'Orientacoes e termos', pool: GUIDE_ASSETS },
];

/** Todo nome de pasta que nao vem do nome do usuario. Conferidos contra o VarChar(50). */
const FIXED_FOLDER_NAMES = [
  ...FOLDER_THEMES.map((theme) => theme.name),
  'Documentos internos',
  '2026',
  'Primeiro semestre',
];

/**
 * Teto de arquivos por pasta. **Nao e estetica.**
 *
 * GetFolderByIdUseCase devolve os arquivos da pasta SEM `skip`/`take`, e a
 * FolderDetailsPage renderiza todos sem virtualizacao -- assim como o
 * `node.files.map` da Sidebar. Somado aos 20 que um visitante pode enviar de
 * uma vez (BULK_UPLOAD_MAX_FILES), o pior caso ainda precisa renderizar.
 */
const MAX_FILES_PER_FOLDER = 6;

// ── Grafo em memoria ────────────────────────────────────
//
// Tudo e montado aqui antes de qualquer escrita, por dois motivos:
//
//   1. permite `createMany` no lugar de ~200 `create` sequenciais. O seed
//      roda dentro de UMA transacao, e no timeout padrao do Prisma (5s) uma
//      instancia com 25ms de latencia estouraria toda noite -- silenciosamente,
//      porque o rollback deixa a demo com os dados da vespera. E o CI nunca
//      veria, porque la o Postgres e um container local.
//   2. permite conferir as invariantes ANTES de escrever (ver os asserts).

type SeedUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: ROLE;
};

type SeedFolder = {
  id: string;
  name: string;
  organizationId: string;
  userId: string;
  folderId: string | null;
  isDefault: boolean;
};

type SeedFile = {
  name: string;
  organizationId: string;
  userId: string;
  folderId: string;
  extension: string;
  key: string;
};

type SeedExamRequest = {
  organizationId: string;
  userId: string;
  indication: string;
  createdAt: Date;
  examIds: string[];
};

/** Sufixo de mes no nome exibido: da unicidade dentro da pasta sem inventar nada. */
function monthLabel(offset: number): string {
  return `${String((offset % 12) + 1).padStart(2, '0')}/2026`;
}

/**
 * Escolhe `count` assets de um pool, a partir de um ponto que avanca com o
 * `seed`.
 *
 * Os pools tem 5 itens e `count` e 2, entao `gcd(2, 5) = 1`: o passo percorre
 * o pool inteiro antes de repetir.
 *
 * O que isto garante e que **duas pastas do mesmo tema nao recebem o mesmo
 * conjunto** de arquivos. NAO garante interseccao zero: com 5 itens e janelas
 * de 2, duas janelas vizinhas compartilham um item, e isso e aceitavel --
 * pacientes de verdade fazem os mesmos exames. O que nao pode acontecer e
 * duas contas exibirem a lista identica.
 */
function pickAssets(
  pool: DemoAsset[],
  seed: number,
  count: number,
): DemoAsset[] {
  const start = (seed * count) % pool.length;
  return Array.from(
    { length: Math.min(count, pool.length) },
    (_, index) => pool[(start + index) % pool.length],
  );
}

/**
 * Monta pastas e arquivos de todos os donos.
 *
 * A ordem do array de pastas importa: o `createMany` vira um unico INSERT
 * multi-linha e o FK de `folder_id` e conferido linha a linha, na ordem. Um
 * filho antes do pai derrubaria a transacao inteira. Por isso os quatro
 * passos abaixo sao por NIVEL, e nao por usuario.
 */
function buildFoldersAndFiles(
  organizationId: string,
  owners: SeedUser[],
): { folders: SeedFolder[]; files: SeedFile[] } {
  const folders: SeedFolder[] = [];
  const files: SeedFile[] = [];

  /**
   * Contador sequencial de pasta, e a razao de ele existir e um bug que a
   * verificacao pegou:
   *
   * antes o seed do sorteio era `index + slot` -- **a mesma conta que escolhe
   * o tema**. Duas pastas que caissem no mesmo tema tinham por construcao o
   * mesmo seed, e recebiam arquivos identicos. Ana e Bruno, vizinhos na
   * listagem, compartilhavam 5 das 8 chaves.
   *
   * Com um contador proprio, tema e conteudo deixam de ser a mesma variavel.
   */
  let folderSeq = 0;

  function addFiles(
    folder: SeedFolder,
    pool: DemoAsset[],
    count: number,
  ): void {
    const seed = folderSeq;
    folderSeq += 1;

    pickAssets(pool, seed, count).forEach((asset, index) => {
      files.push({
        name: `${asset.name} - ${monthLabel(seed + index)}`,
        organizationId,
        userId: folder.userId,
        folderId: folder.id,
        extension: asset.extension,
        key: asset.key,
      });
    });
  }

  // Nivel 1: a pasta padrao. Espelha CreateUserWithFoldersUseCase -- leva o
  // nome do usuario e e a UNICA onde um USER pode enviar arquivos.
  //
  // `isDefault: true` so acontece aqui. Nao ha constraint no banco impedindo
  // duas pastas padrao por usuario, e duas tornariam duas pastas elegiveis
  // para upload.
  const defaults = owners.map((owner, index) => {
    const folder: SeedFolder = {
      id: randomUUID(),
      name: owner.name.slice(0, 50),
      organizationId,
      userId: owner.id,
      folderId: null,
      isDefault: true,
    };
    folders.push(folder);
    addFiles(folder, GUIDE_ASSETS, 2);
    return folder;
  });

  // Nivel 2: as subpastas tematicas.
  const level2: Array<{
    folder: SeedFolder;
    theme: FolderTheme;
    ownerIndex: number;
  }> = [];

  owners.forEach((owner, index) => {
    const subfolderCount = 2 + (index % 2);

    for (let slot = 0; slot < subfolderCount; slot += 1) {
      const theme = FOLDER_THEMES[(index + slot) % FOLDER_THEMES.length];
      const folder: SeedFolder = {
        id: randomUUID(),
        name: theme.name,
        organizationId,
        userId: owner.id,
        folderId: defaults[index].id,
        isDefault: false,
      };
      folders.push(folder);
      level2.push({ folder, theme, ownerIndex: index });

      // Uma pasta vazia aqui e ali e proposital: o estado vazio tambem e
      // parte do que um avaliador precisa conseguir ver.
      const isDeliberatelyEmpty =
        index % 7 === 3 && slot === subfolderCount - 1;

      if (!isDeliberatelyEmpty) {
        addFiles(folder, theme.pool, 2);
      }
    }
  });

  // Nivel 3, em tres usuarios.
  const level3: Array<{
    folder: SeedFolder;
    theme: FolderTheme;
    ownerIndex: number;
  }> = [];

  owners.forEach((owner, index) => {
    if (index % 7 !== 0) {
      return;
    }

    const parent = level2.find((entry) => entry.ownerIndex === index);

    if (!parent) {
      return;
    }

    const folder: SeedFolder = {
      id: randomUUID(),
      name: '2026',
      organizationId,
      userId: owner.id,
      folderId: parent.folder.id,
      isDefault: false,
    };
    folders.push(folder);
    addFiles(folder, parent.theme.pool, 1);
    level3.push({ folder, theme: parent.theme, ownerIndex: index });
  });

  // Nivel 4, em UM usuario -- o `user@demo`, que e a credencial publicada.
  //
  // Profundidade custa requisicao: a sidebar dispara um GET /folders/:id por
  // pasta expandida, e o throttler global e de 100/min. Quatro niveis cabem
  // com folga; em seis, navegar normalmente ja come uma fatia visivel do balde.
  const deepest = level3.find((entry) => entry.ownerIndex === 0);

  if (deepest) {
    const folder: SeedFolder = {
      id: randomUUID(),
      name: 'Primeiro semestre',
      organizationId,
      userId: deepest.folder.userId,
      folderId: deepest.folder.id,
      isDefault: false,
    };
    folders.push(folder);
    addFiles(folder, deepest.theme.pool, 2);
  }

  return { folders, files };
}

/**
 * Uma solicitacao por dono, no minimo.
 *
 * A regra antiga era `owners[index % owners.length]` sobre 12 indicacoes e 15
 * donos -- os tres ultimos pacientes ficavam com zero, e na tela pareciam
 * contas mortas.
 */
function buildExamRequests(
  organizationId: string,
  owners: SeedUser[],
  exams: Array<{ id: string }>,
): SeedExamRequest[] {
  const requests: SeedExamRequest[] = [];

  owners.forEach((owner, index) => {
    const count = 1 + (index % 3);

    for (let slot = 0; slot < count; slot += 1) {
      const examCount = 1 + ((index + slot) % 4);

      const examIds = Array.from(
        { length: examCount },
        // 7 e coprimo com 18, entao os indices de uma mesma solicitacao sao
        // distintos. Conectar o mesmo exame duas vezes violaria a PK da
        // tabela de juncao e derrubaria a transacao.
        (_, position) =>
          exams[(index * 5 + slot * 3 + 7 * position) % exams.length].id,
      );

      requests.push({
        organizationId,
        userId: owner.id,
        indication: INDICATIONS[(index + slot) % INDICATIONS.length],
        // Espalhadas por 90 dias, e nao 56: assim "ultimos 30 dias" exclui a
        // maioria e "ultimos 7" devolve um punhado.
        createdAt: daysAgo(((index * 7 + slot * 3) % 90) + 1),
        examIds,
      });
    }
  });

  return requests;
}

// ── Invariantes ─────────────────────────────────────────
//
// Tudo isto e conferido ANTES de abrir a transacao. O motivo e o modo de
// falha: uma violacao de constraint no meio do `$transaction` faz rollback de
// tudo, a demo fica com os dados da vespera, e a aplicacao nao acusa nada --
// so o log do cron sabe. Uma mensagem clara aqui vale mais que um P2002 la.

function assertConstantsAreSound(): void {
  const emails = PATIENTS.map(emailFor);

  // emailFor monta `primeiro.ultimo@...` sem deduplicar. Dois pacientes com
  // mesmo primeiro e ultimo nome violariam o unique de users.email.
  if (new Set(emails).size !== emails.length) {
    throw new Error('PATIENTS gera e-mails duplicados via emailFor.');
  }

  const longEmail = emails.find((email) => email.length > 50);

  if (longEmail) {
    throw new Error(`E-mail passa do VarChar(50) de users.email: ${longEmail}`);
  }

  const longName = [...FIXED_FOLDER_NAMES, ...PATIENTS].find(
    (name) => name.length > 50,
  );

  if (longName) {
    throw new Error(`Nome passa do VarChar(50): ${longName}`);
  }

  const codes = EXAMS.map((exam) => exam.code);

  if (new Set(codes).size !== codes.length) {
    throw new Error(
      'EXAMS tem codigo duplicado -- viola @@unique([organizationId, code]).',
    );
  }
}

/**
 * Confere o que este seed existe para garantir. Sao as promessas do PR, em
 * codigo: se uma regra de distribuicao for mexida e quebrar alguma delas, o
 * seed para aqui em vez de publicar uma demo pela metade.
 */
function assertContentIsUsable(
  users: SeedUser[],
  folders: SeedFolder[],
  files: SeedFile[],
  requests: SeedExamRequest[],
): void {
  const usersWithFiles = new Set(files.map((file) => file.userId));
  const empty = users.filter((user) => !usersWithFiles.has(user.id));

  if (empty.length > 0) {
    throw new Error(
      `Contas sem nenhum arquivo: ${empty.map((user) => user.email).join(', ')}`,
    );
  }

  const byFolder = new Map<string, SeedFile[]>();

  for (const file of files) {
    byFolder.set(file.folderId, [...(byFolder.get(file.folderId) ?? []), file]);
  }

  for (const [folderId, folderFiles] of byFolder) {
    if (folderFiles.length > MAX_FILES_PER_FOLDER) {
      const folder = folders.find((candidate) => candidate.id === folderId);
      throw new Error(
        `Pasta "${folder?.name ?? folderId}" tem ${folderFiles.length} arquivos, ` +
          `acima do teto de ${MAX_FILES_PER_FOLDER}.`,
      );
    }

    const keys = folderFiles.map((file) => file.key);

    if (new Set(keys).size !== keys.length) {
      const folder = folders.find((candidate) => candidate.id === folderId);
      throw new Error(
        `Pasta "${folder?.name ?? folderId}" repete a mesma key duas vezes.`,
      );
    }
  }

  const requesters = new Set(requests.map((request) => request.userId));
  const withoutRequest = users.filter(
    (user) => user.role === ROLE.USER && !requesters.has(user.id),
  );

  if (withoutRequest.length > 0) {
    throw new Error(
      `USERs sem solicitacao: ${withoutRequest.map((user) => user.email).join(', ')}`,
    );
  }

  for (const request of requests) {
    if (new Set(request.examIds).size !== request.examIds.length) {
      throw new Error(
        'Uma solicitacao conecta o mesmo exame duas vezes -- viola a PK da juncao.',
      );
    }
  }

  // Todo asset cadastrado precisa ser referenciado por alguma linha. Um asset
  // orfao seria um objeto subido ao R2 a mao que nunca aparece na aplicacao --
  // custo e confusao sem retorno. Como a distribuicao e aritmetica, a
  // cobertura muda junto com qualquer ajuste nas contagens, e sem esta
  // verificacao a regressao passaria despercebida.
  const usedKeys = new Set(files.map((file) => file.key));
  const orphans = DEMO_ASSETS.filter((asset) => !usedKeys.has(asset.key));

  if (orphans.length > 0) {
    throw new Error(
      `Assets cadastrados que nenhuma linha referencia: ${orphans
        .map((asset) => asset.key)
        .join(', ')}`,
    );
  }
}

// ── Execucao ────────────────────────────────────────────

async function main(): Promise<void> {
  assertConstantsAreSound();

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

    // Um hash so, reaproveitado. Fica FORA da transacao de proposito: sao 10
    // rounds de bcrypt, e 16 hashes la dentro seriam ~1s de CPU puro dentro
    // do orcamento de tempo da transacao.
    const demoPasswordHash = await hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);

    const demoAdmin: SeedUser = {
      id: randomUUID(),
      name: 'Administrador Demo',
      email: DEMO_ADMIN_EMAIL,
      password: demoPasswordHash,
      role: ROLE.ADMIN,
    };

    const demoUser: SeedUser = {
      id: randomUUID(),
      name: 'Paciente Demo',
      email: DEMO_USER_EMAIL,
      password: demoPasswordHash,
      role: ROLE.USER,
    };

    const patients: SeedUser[] = PATIENTS.map((name) => ({
      id: randomUUID(),
      name,
      email: emailFor(name),
      password: demoPasswordHash,
      role: ROLE.USER,
    }));

    const users = [demoAdmin, demoUser, ...patients];
    const owners = [demoUser, ...patients];

    const { folders, files } = buildFoldersAndFiles(organization.id, owners);

    // O ADMIN tambem ganha pasta e arquivo. Sem isso o balde dele na sidebar
    // fica sempre vazio -- e ele e a primeira conta que alguem abre, porque
    // e a que esta no README.
    const adminDefault: SeedFolder = {
      id: randomUUID(),
      name: demoAdmin.name,
      organizationId: organization.id,
      userId: demoAdmin.id,
      folderId: null,
      isDefault: true,
    };
    const adminInternal: SeedFolder = {
      id: randomUUID(),
      name: 'Documentos internos',
      organizationId: organization.id,
      userId: demoAdmin.id,
      folderId: null,
      isDefault: false,
    };
    folders.push(adminDefault, adminInternal);

    for (const [folder, pool_, seed] of [
      [adminDefault, GUIDE_ASSETS, 3],
      // seed 4 nao e arbitrario: e o que faz esta pasta cobrir o fim do pool
      // RX. Sem ela, `solicitacao-exames.pdf` ficaria no bucket sem nenhuma
      // linha apontando para ele -- ver a assercao de cobertura.
      [adminInternal, RX_ASSETS, 4],
    ] as Array<[SeedFolder, DemoAsset[], number]>) {
      pickAssets(pool_, seed, 2).forEach((asset, index) => {
        files.push({
          name: `${asset.name} - ${monthLabel(seed + index)}`,
          organizationId: organization.id,
          userId: demoAdmin.id,
          folderId: folder.id,
          extension: asset.extension,
          key: asset.key,
        });
      });
    }

    const exams = EXAMS.map((exam) => ({
      id: randomUUID(),
      ...exam,
      organizationId: organization.id,
    }));

    const requests = buildExamRequests(organization.id, owners, exams);

    assertContentIsUsable(users, folders, files, requests);

    await prisma.$transaction(
      async (tx) => {
        await wipeDemoOrganization(tx, organization.id);

        await tx.user.createMany({ data: users });

        await tx.membership.createMany({
          data: [
            ...users.map((user) => ({
              userId: user.id,
              organizationId: organization.id,
              role: user.role,
            })),
            ...operators.map((operator) => ({
              userId: operator.userId,
              organizationId: organization.id,
              role: ROLE.ADMIN,
            })),
          ],
        });

        await tx.folder.createMany({ data: folders });
        await tx.file.createMany({ data: files });
        await tx.exam.createMany({ data: exams });

        // A unica escrita que sobra linha a linha: `_ExamToExamRequest` e uma
        // relacao N-N implicita, sem model proprio, entao `createMany` nao
        // alcanca. 30 idas ao banco cabem no orcamento com folga.
        for (const request of requests) {
          await tx.examRequest.create({
            data: {
              organizationId: request.organizationId,
              userId: request.userId,
              indication: request.indication,
              createdAt: request.createdAt,
              exams: { connect: request.examIds.map((id) => ({ id })) },
            },
          });
        }
      },
      // Explicito porque o padrao do Prisma e 5s, e o seed roda contra um
      // banco cuja latencia nao esta sob nosso controle. Ver o comentario do
      // grafo em memoria, acima.
      { timeout: 30_000, maxWait: 10_000 },
    );

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
