import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  ALL_ENTITIES,
  Addon,
  Booking,
  CafeDay,
  CafeTable,
  Game,
  Slot,
  User,
} from './entities/entities';
import { CafeService } from './cafe/cafe.service';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { madridToday } from './common/time';
import { extractTicketCode, partidaUrl } from './common/qr';

process.env.WEB_ORIGIN = 'https://gambito.proyectos.cristiancode.dev';
process.env.JWT_SECRET = 'test-secret';

describe('Gambito cafe', () => {
  let app: INestApplication;
  let cafe: CafeService;
  let auth: AuthService;
  let users: Repository<User>;
  let tables: Repository<CafeTable>;
  let games: Repository<Game>;
  let days: Repository<CafeDay>;
  let slots: Repository<Slot>;
  let addons: Repository<Addon>;
  let visitor: User;
  let other: User;
  let staff: User;
  let table: CafeTable;
  let tiny: CafeTable;
  let catan: Game;
  let wings: Game;
  let openSlot: Slot;
  let closedSlot: Slot;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
        } as any),
        TypeOrmModule.forFeature(ALL_ENTITIES),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '7d' } }),
        AuthModule,
      ],
      providers: [CafeService],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    cafe = moduleRef.get(CafeService);
    auth = moduleRef.get(AuthService);
    users = moduleRef.get(getRepositoryToken(User));
    tables = moduleRef.get(getRepositoryToken(CafeTable));
    games = moduleRef.get(getRepositoryToken(Game));
    days = moduleRef.get(getRepositoryToken(CafeDay));
    slots = moduleRef.get(getRepositoryToken(Slot));
    addons = moduleRef.get(getRepositoryToken(Addon));

    const hash = await bcrypt.hash('demo1234', 10);
    visitor = (await users.save({
      username: 'gambito',
      email: 'demo@gambito.dev',
      passwordHash: hash,
      role: 'visitor',
      points: 0,
    } as any)) as User;
    other = (await users.save({
      username: 'rival',
      email: 'rival@gambito.dev',
      passwordHash: hash,
      role: 'visitor',
      points: 0,
    } as any)) as User;
    staff = (await users.save({
      username: 'staff',
      email: 'staff@gambito.dev',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any)) as User;

    table = (await tables.save({
      slug: 'tapete',
      name: 'Tapete Verde',
      seats: 4,
      priceCents: 1800,
      photoUrl: '/assets/mesa-tapete.svg',
      blurb: 'Fieltro',
      sortOrder: 1,
    } as any)) as CafeTable;
    tiny = (await tables.save({
      slug: 'duo',
      name: 'Balcón',
      seats: 2,
      priceCents: 1400,
      photoUrl: '/assets/mesa-balcon.svg',
      blurb: 'Dúo',
      sortOrder: 2,
    } as any)) as CafeTable;

    catan = (await games.save({
      slug: 'catan',
      title: 'Catan',
      minPlayers: 3,
      maxPlayers: 4,
      minutes: 90,
      weight: 2.3,
      totalCopies: 1,
      mechanics: ['trading'],
      photoUrl: '/assets/caja-catan.svg',
      copySurchargeCents: 200,
    } as any)) as Game;
    wings = (await games.save({
      slug: 'wingspan',
      title: 'Wingspan',
      minPlayers: 1,
      maxPlayers: 5,
      minutes: 70,
      weight: 2.4,
      totalCopies: 1,
      mechanics: ['engine'],
      photoUrl: '/assets/caja-wings.svg',
      copySurchargeCents: 0,
    } as any)) as Game;

    await addons.save({ name: 'Soda', priceCents: 350, active: true } as any);

    const today = madridToday();
    const openDay = (await days.save({
      day: today,
      status: 'open',
      note: 'ok',
      maxCovers: null,
    } as any)) as CafeDay;
    const closedDay = (await days.save({
      day: '2099-01-01',
      status: 'closed',
      note: 'cerrado',
      maxCovers: null,
    } as any)) as CafeDay;

    openSlot = (await slots.save({
      cafeDayId: openDay.id,
      day: today,
      startTime: '18:00',
      endTime: '20:00',
      sortKey: 18,
    } as any)) as Slot;
    await slots.save({
      cafeDayId: openDay.id,
      day: today,
      startTime: '00:00',
      endTime: '02:00',
      sortKey: 24,
    } as any);
    await slots.save({
      cafeDayId: openDay.id,
      day: today,
      startTime: '12:00',
      endTime: '14:00',
      sortKey: 12,
    } as any);
    closedSlot = (await slots.save({
      cafeDayId: closedDay.id,
      day: '2099-01-01',
      startTime: '18:00',
      endTime: '20:00',
      sortKey: 18,
    } as any)) as Slot;
  });

  afterAll(async () => {
    await app.close();
  });

  it('login acepta username o email', async () => {
    const a = await auth.login({ identifier: 'gambito', password: 'demo1234' });
    const b = await auth.login({ identifier: 'demo@gambito.dev', password: 'demo1234' });
    expect(a.accessToken).toBeTruthy();
    expect(b.user.email).toBe('demo@gambito.dev');
  });

  it('hold contra CafeDay closed → 409 CAFE_CLOSED', async () => {
    await expect(
      cafe.hold(visitor.id, closedSlot.id, { tableId: table.id, partySize: 2, gameIds: [] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'CAFE_CLOSED' } });
  });

  it('hold crea pending con expiresAt servidor ~15 min', async () => {
    const b = await cafe.hold(visitor.id, openSlot.id, {
      tableId: table.id,
      partySize: 3,
      gameIds: [catan.id],
    });
    expect(b.status).toBe('pending');
    const delta = new Date(b.expiresAt).getTime() - Date.now();
    expect(delta).toBeGreaterThan(14 * 60 * 1000 - 5000);
    expect(delta).toBeLessThan(16 * 60 * 1000);
    expect(b.totalCents).toBe(1800 + 200);
  });

  it('segundo hold same-user+mesa+franja → 409 ALREADY_HELD', async () => {
    await expect(
      cafe.hold(visitor.id, openSlot.id, { tableId: table.id, partySize: 2, gameIds: [] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'ALREADY_HELD' } });
  });

  it('otro usuario misma mesa → 409 TABLE_TAKEN', async () => {
    await expect(
      cafe.hold(other.id, openSlot.id, { tableId: table.id, partySize: 2, gameIds: [] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'TABLE_TAKEN' } });
  });

  it('hold de juego con 0 copias → 409 NO_COPIES', async () => {
    const extra = (await slots.save({
      cafeDayId: openSlot.cafeDayId,
      day: madridToday(),
      startTime: '16:00',
      endTime: '18:00',
      sortKey: 16,
    } as any)) as Slot;
    await cafe.hold(other.id, extra.id, { tableId: table.id, partySize: 2, gameIds: [wings.id] });
    await expect(
      cafe.hold(visitor.id, extra.id, { tableId: tiny.id, partySize: 2, gameIds: [wings.id] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'NO_COPIES' } });
  });

  it('partySize > seats → 409 TABLE_FULL', async () => {
    const s = (await slots.save({
      cafeDayId: openSlot.cafeDayId,
      day: madridToday(),
      startTime: '14:00',
      endTime: '16:00',
      sortKey: 14,
    } as any)) as Slot;
    await expect(
      cafe.hold(other.id, s.id, { tableId: tiny.id, partySize: 4, gameIds: [] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'TABLE_FULL' } });
  });

  it('confirm pinta QR real con URL /partida/:code', async () => {
    const mine = await cafe.listMine(visitor.id);
    const pending = mine.find((b: any) => b.status === 'pending' && b.cafeTableId === table.id);
    const res = await cafe.confirm(visitor.id, pending.id);
    expect(res.qrUrl).toBe(partidaUrl(pending.code));
    expect(res.qrSvg).toContain(res.qrUrl);
    expect(res.qrSvg).toContain('data-session-url');
    expect(res.booking.status).toBe('confirmed');
  });

  it('segundo hold tras confirmed → 409 ALREADY_BOOKED', async () => {
    await expect(
      cafe.hold(visitor.id, openSlot.id, { tableId: table.id, partySize: 2, gameIds: [] }),
    ).rejects.toMatchObject({ status: 409, response: { code: 'ALREADY_BOOKED' } });
  });

  it('ticket público  y extractTicketCode acepta URL', async () => {
    const mine = await cafe.listMine(visitor.id);
    const confirmed = mine.find((b: any) => b.status === 'confirmed');
    const pub = await cafe.publicTicket(confirmed.code);
    expect(pub.booking.code).toBe(confirmed.code);
    const fromUrl = extractTicketCode(partidaUrl(confirmed.code));
    expect(fromUrl).toBe(confirmed.code);
  });

  it('check-in staff y segundo scan 409 ALREADY_CHECKED_IN', async () => {
    const mine = await cafe.listMine(visitor.id);
    const confirmed = mine.find((b: any) => b.status === 'confirmed');
    const in1 = await cafe.staffCheckIn(partidaUrl(confirmed.code));
    expect(in1.status).toBe('checked_in');
    await expect(cafe.staffCheckIn(confirmed.code)).rejects.toMatchObject({
      status: 409,
      response: { code: 'ALREADY_CHECKED_IN' },
    });
  });

  it('now-playing no pide otra caja; reorder persiste', async () => {
    const mine = await cafe.listMine(visitor.id);
    const b = mine.find((x: any) => x.status === 'checked_in');
    const q = await cafe.updateQueue(visitor.id, b.id, {
      order: b.queue.map((e: any) => e.gameId),
      nowPlayingGameId: b.queue[0].gameId,
    });
    expect(q[0].isNowPlaying).toBe(true);
    const copies = await cafe.availableCopies(catan.id, openSlot.id);
    expect(copies).toBe(0);
  });

  it('sweeper expira pending vencido', async () => {
    const s = (await slots.save({
      cafeDayId: openSlot.cafeDayId,
      day: madridToday(),
      startTime: '10:00',
      endTime: '12:00',
      sortKey: 10,
    } as any)) as Slot;
    const held = await cafe.hold(other.id, s.id, { tableId: tiny.id, partySize: 2, gameIds: [] });
    const repo = app.get(getRepositoryToken(Booking)) as Repository<Booking>;
    const row = await repo.findOne({ where: { id: held.id } });
    row!.expiresAt = new Date(Date.now() - 1000);
    await repo.save(row as any);
    const n = await cafe.expireStale();
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it('00:00 es la última franja', async () => {
    const list = await cafe.slotsForDate(madridToday());
    expect(list[list.length - 1].startTime).toBe('00:00');
    expect(list[0].startTime).not.toBe('00:00');
  });

  it('puntos derivados 10 × partySize completed', async () => {
    const s = (await slots.save({
      cafeDayId: openSlot.cafeDayId,
      day: madridToday(),
      startTime: '08:00',
      endTime: '10:00',
      sortKey: 8,
    } as any)) as Slot;
    const held = await cafe.hold(staff.id, s.id, { tableId: table.id, partySize: 4, gameIds: [] });
    await cafe.confirm(staff.id, held.id);
    const repo = app.get(getRepositoryToken(Booking)) as Repository<Booking>;
    const row = await repo.findOne({ where: { id: held.id } });
    row.status = 'completed';
    row.completedAt = new Date();
    await repo.save(row);
    const pts = await cafe.myPoints(staff.id);
    expect(pts.points).toBe(40);
  });

  it('lista y detalle comparten totalCents de BookingLine', async () => {
    const list = await cafe.listMine(visitor.id);
    const one = list[0];
    const detail = await cafe.getMine(visitor.id, one.id);
    expect(detail.totalCents).toBe(one.totalCents);
    const sum = detail.lines.reduce((s: number, l: any) => s + l.lineCents, 0);
    expect(detail.totalCents).toBe(sum);
  });

  it('home y mesas: mismo freeSlotsToday', async () => {
    const list = await cafe.listTables();
    const detail = await cafe.getTable(table.id);
    const row = list.find((t: any) => t.id === table.id);
    expect(row.freeSlotsToday).toBe(detail.freeSlotsToday);
  });

  it('login token de AuthService firma JWT', async () => {
    const res = await auth.login({ identifier: 'staff@gambito.dev', password: 'demo1234' });
    expect(res.user.role).toBe('staff');
  });
});
