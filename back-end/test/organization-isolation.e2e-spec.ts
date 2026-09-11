import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { ROLE } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { TOKEN_AUDIENCE } from '../src/shared/constants/token.constants';

/**
 * Prova de isolamento entre organizacoes.
 *
 * Estruturalmente diferente das outras suites e2e, e a diferenca e o ponto:
 * `rbac` e `upload-limits` mockam os repositorios, e uma suite de isolamento
 * que mockasse repositorio nao provaria nada -- o isolamento vive exatamente
 * nos `where` deles. Aqui o AppModule sobe inteiro, com repositorios e
 * PrismaService reais, contra o Postgres.
 *
 * Nada e substituido: a suite assina tokens de verdade com o JwtService da
 * aplicacao. Isso e possivel porque o fixture cria associacoes reais, e tem a
 * vantagem de exercitar o caminho inteiro -- JwtStrategy resolvendo a
 * associacao e populando `req.user.organizationId` -- em vez de simula-lo.
 *
 * (Sobrescrever o JwtAuthGuard nao funcionaria: desde que ele virou APP_GUARD,
 * o token `JwtAuthGuard` deixou de ser um provider e `overrideGuard` nao tem o
 * que substituir.)
 */

// O download seria a unica rota a tocar a rede.
jest.mock('../src/shared/lib/r2Client', () => ({
  r2Client: { send: jest.fn() },
}));

const ORG_A = '00000000-0000-4000-8000-00000000000a';
const ORG_B = '00000000-0000-4000-8000-00000000000b';
const SUFFIX = '@isolation-e2e.test';

/** O corpo paginado das listagens, so com o que a suite le. */
type ListBody = { data: Array<{ id: string }> };

type Ids = {
  adminId: string;
  userId: string;
  folderId: string;
  fileId: string;
};

describe('Organization isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let a: Ids;
  let b: Ids;

  // Token real, da mesma audiencia que a JwtStrategy exige. O papel nao entra
  // nos claims: e lido da associacao a cada requisicao.
  function token(organizationId: string, userId: string): string {
    return `Bearer ${jwtService.sign(
      { sub: userId, email: `${userId}${SUFFIX}`, organizationId },
      { audience: TOKEN_AUDIENCE.API },
    )}`;
  }

  async function seedOrganization(
    organizationId: string,
    slug: string,
  ): Promise<Ids> {
    await prisma.organization.create({
      data: { id: organizationId, name: `Org ${slug}`, slug },
    });

    const admin = await prisma.user.create({
      data: {
        name: `Admin ${slug}`,
        email: `admin-${slug}${SUFFIX}`,
        password: 'hash',
        role: ROLE.ADMIN,
      },
    });
    const user = await prisma.user.create({
      data: {
        name: `User ${slug}`,
        email: `user-${slug}${SUFFIX}`,
        password: 'hash',
        role: ROLE.USER,
      },
    });

    await prisma.membership.createMany({
      data: [
        { userId: admin.id, organizationId, role: ROLE.ADMIN },
        { userId: user.id, organizationId, role: ROLE.USER },
      ],
    });

    // Mesmo nome nas duas organizacoes de proposito: e o que prova que o 409
    // de nome duplicado nao atravessa.
    const folder = await prisma.folder.create({
      data: {
        name: 'Pasta Compartilhada',
        organizationId,
        userId: user.id,
        isDefault: true,
      },
    });
    const file = await prisma.file.create({
      data: {
        name: 'laudo',
        organizationId,
        userId: user.id,
        folderId: folder.id,
        extension: 'pdf',
        key: `${slug}/laudo.pdf`,
      },
    });

    return {
      adminId: admin.id,
      userId: user.id,
      folderId: folder.id,
      fileId: file.id,
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    await cleanup();

    a = await seedOrganization(ORG_A, 'alfa');
    b = await seedOrganization(ORG_B, 'beta');
  });

  async function cleanup() {
    const organizationId = { in: [ORG_A, ORG_B] };
    await prisma.file.deleteMany({ where: { organizationId } });
    await prisma.folder.deleteMany({ where: { organizationId } });
    await prisma.membership.deleteMany({ where: { organizationId } });
    await prisma.user.deleteMany({ where: { email: { endsWith: SUFFIX } } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  // ── Leitura por id ─────────────────────────────────────
  describe('reading a resource of another organization', () => {
    it('returns 404 for a folder', () =>
      request(app.getHttpServer())
        .get(`/folders/${b.folderId}`)
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(404));

    it('returns 404 for a file', () =>
      request(app.getHttpServer())
        .get(`/files/${b.fileId}`)
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(404));

    it('returns 404 for a file download', () =>
      request(app.getHttpServer())
        .get(`/files/${b.fileId}/download`)
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(404));
  });

  // ── Escrita por id ─────────────────────────────────────
  describe('writing to a resource of another organization', () => {
    it('returns 404 when renaming a folder', () =>
      request(app.getHttpServer())
        .patch(`/folders/${b.folderId}`)
        .set('Authorization', token(ORG_A, a.adminId))
        .send({ name: 'Invadida' })
        .expect(404));

    it('returns 404 when deleting a folder', () =>
      request(app.getHttpServer())
        .delete(`/folders/${b.folderId}`)
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(404));

    it('returns 404 when deleting a file', () =>
      request(app.getHttpServer())
        .delete(`/files/${b.fileId}`)
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(404));

    it('returns 404 when updating a user', () =>
      request(app.getHttpServer())
        .patch(`/users/${b.userId}`)
        .set('Authorization', token(ORG_A, a.adminId))
        .send({ email: `invadido${SUFFIX}` })
        .expect(404));
  });

  // ── Listagens ──────────────────────────────────────────
  describe('listings', () => {
    it('never leaks folders from another organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/folders')
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(200);

      const ids = (res.body as ListBody).data.map((item) => item.id);
      expect(ids).toContain(a.folderId);
      expect(ids).not.toContain(b.folderId);
    });

    it('never leaks files from another organization', async () => {
      const res = await request(app.getHttpServer())
        .get('/files')
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(200);

      const ids = (res.body as ListBody).data.map((item) => item.id);
      expect(ids).toContain(a.fileId);
      expect(ids).not.toContain(b.fileId);
    });

    it('never leaks users from another organization', async () => {
      // A listagem de usuarios era o pior buraco: ate este PR ela nao tinha
      // recorte de dono nenhum.
      const res = await request(app.getHttpServer())
        .get('/users?limit=100')
        .set('Authorization', token(ORG_A, a.adminId))
        .expect(200);

      const ids = (res.body as ListBody).data.map((item) => item.id);
      expect(ids).toContain(a.userId);
      expect(ids).not.toContain(b.userId);
    });
  });

  // ── Os DTOs que aceitam userId do cliente ──────────────
  describe('DTOs that take a userId from the client', () => {
    it('returns 404 when creating a folder for a user of another organization', () =>
      request(app.getHttpServer())
        .post('/folders')
        .set('Authorization', token(ORG_A, a.adminId))
        .send({ name: 'Enxertada', userId: b.userId })
        .expect(404));

    it('returns 404 when creating a file for a user of another organization', () =>
      request(app.getHttpServer())
        .post('/files')
        .set('Authorization', token(ORG_A, a.adminId))
        .send({
          name: 'enxertado',
          userId: b.userId,
          folderId: b.folderId,
          extension: 'pdf',
          key: 'x.pdf',
        })
        .expect(404));

    it('returns 404 when uploading into a folder of another organization', () =>
      request(app.getHttpServer())
        .post('/files/upload')
        .set('Authorization', token(ORG_A, a.adminId))
        .field('name', 'enxertado')
        .field('folderId', b.folderId)
        .attach('file', Buffer.from('%PDF-1.4'), 'doc.pdf')
        .expect(404));
  });

  // ── Vazamento por mensagem de erro ─────────────────────
  it('allows a folder name that already exists in another organization', async () => {
    // Sem o recorte em findActiveByUserIdAndName isto responderia 409, e a
    // mensagem revelaria nomes de pasta de outra organizacao.
    await request(app.getHttpServer())
      .post('/folders')
      .set('Authorization', token(ORG_A, a.adminId))
      .send({ name: 'Pasta Compartilhada', userId: a.adminId })
      .expect(201);
  });

  // ── A mudanca de comportamento do DELETE /users/:id ────
  it('removes the membership of one organization and leaves the other intact', async () => {
    const multiOrg = await prisma.user.create({
      data: {
        name: 'Multi Org',
        email: `multi${SUFFIX}`,
        password: 'hash',
        role: ROLE.USER,
      },
    });
    await prisma.membership.createMany({
      data: [
        { userId: multiOrg.id, organizationId: ORG_A, role: ROLE.USER },
        { userId: multiOrg.id, organizationId: ORG_B, role: ROLE.USER },
      ],
    });

    await request(app.getHttpServer())
      .delete(`/users/${multiOrg.id}`)
      .set('Authorization', token(ORG_A, a.adminId))
      .expect(200);

    // A linha de `users` continua la: apaga-la mataria a pessoa nas duas.
    const stillThere = await prisma.user.findUnique({
      where: { id: multiOrg.id },
    });
    expect(stillThere?.deletedAt).toBeNull();

    const memberships = await prisma.membership.findMany({
      where: { userId: multiOrg.id },
      orderBy: { organizationId: 'asc' },
    });
    expect(
      memberships.find((m) => m.organizationId === ORG_A)?.deletedAt,
    ).not.toBeNull();
    expect(
      memberships.find((m) => m.organizationId === ORG_B)?.deletedAt,
    ).toBeNull();

    // E some da listagem de A sem sumir da de B.
    const inA = await request(app.getHttpServer())
      .get('/users?limit=100')
      .set('Authorization', token(ORG_A, a.adminId));
    const inB = await request(app.getHttpServer())
      .get('/users?limit=100')
      .set('Authorization', token(ORG_B, b.adminId));

    const idsInA = (inA.body as ListBody).data.map((u) => u.id);
    const idsInB = (inB.body as ListBody).data.map((u) => u.id);
    expect(idsInA).not.toContain(multiOrg.id);
    expect(idsInB).toContain(multiOrg.id);
  });
});
