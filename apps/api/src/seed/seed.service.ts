import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Addon,
  Booking,
  BookingLine,
  CafeTable,
  Game,
  QueueEntry,
  User,
} from '../entities/entities';
import { CafeService } from '../cafe/cafe.service';
import { addMadridDays, madridToday } from '../common/time';
import { buildSessionQrSvg, makeCode, partidaUrl } from '../common/qr';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(CafeTable) private readonly tables: Repository<CafeTable>,
    @InjectRepository(Game) private readonly games: Repository<Game>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(QueueEntry) private readonly queue: Repository<QueueEntry>,
    private readonly cafe: CafeService,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB === 'false') return;
    await this.seed();
  }

  async seed() {
    if (await this.users.count()) {
      await this.cafe.seedCalendarIfNeeded();
      return;
    }

    const hash = await bcrypt.hash('demo1234', 10);
    const visitor = (await this.users.save({
      username: 'gambito',
      email: 'demo@gambito.dev',
      passwordHash: hash,
      role: 'visitor',
      points: 0,
    } as any)) as User;
    await this.users.save({
      username: 'staff',
      email: 'staff@gambito.dev',
      passwordHash: hash,
      role: 'staff',
      points: 0,
    } as any);
    await this.users.save({
      username: 'admin',
      email: 'admin@gambito.dev',
      passwordHash: hash,
      role: 'admin',
      points: 0,
    } as any);

    const tableDefs = [
      { slug: 'tapete-verde', name: 'Tapete Verde', seats: 4, priceCents: 1800, photoUrl: '/assets/mesa-tapete.svg', blurb: 'Mesa clásica de fieltro, luces bajas, dados que no se escapan.', sortOrder: 1 },
      { slug: 'balcon-norte', name: 'Balcón Norte', seats: 2, priceCents: 1400, photoUrl: '/assets/mesa-balcon.svg', blurb: 'Dúo junto al ventanal. Ideal para duelos de dos.', sortOrder: 2 },
      { slug: 'sala-larga', name: 'Sala Larga', seats: 8, priceCents: 2800, photoUrl: '/assets/mesa-larga.svg', blurb: 'Ocho plazas, tapete ancho, para campañas y 7 Wonders.', sortOrder: 3 },
      { slug: 'rincon-meeple', name: 'Rincón Meeple', seats: 4, priceCents: 1600, photoUrl: '/assets/mesa-rincon.svg', blurb: 'Esquina con estantería de cajas a mano.', sortOrder: 4 },
      { slug: 'terraza', name: 'Terraza', seats: 6, priceCents: 2200, photoUrl: '/assets/mesa-terraza.svg', blurb: 'Aire, plantas y fichas que no se vuelan (hay pesos).', sortOrder: 5 },
      { slug: 'cueva', name: 'La Cueva', seats: 4, priceCents: 1700, photoUrl: '/assets/mesa-cueva.svg', blurb: 'Sala interior, acústica muerta, partidas largas.', sortOrder: 6 },
    ];
    const tables: CafeTable[] = [];
    for (const d of tableDefs) {
      tables.push((await this.tables.save(d as any)) as CafeTable);
    }

    const gameDefs = [
      { slug: 'catan', title: 'Catan', minPlayers: 3, maxPlayers: 4, minutes: 90, weight: 2.3, totalCopies: 2, mechanics: ['trading', 'dice'], photoUrl: '/assets/caja-catan.svg', copySurchargeCents: 200 },
      { slug: 'carcassonne', title: 'Carcassonne', minPlayers: 2, maxPlayers: 5, minutes: 45, weight: 1.9, totalCopies: 2, mechanics: ['tile', 'area'], photoUrl: '/assets/caja-carca.svg', copySurchargeCents: 0 },
      { slug: 'azul', title: 'Azul', minPlayers: 2, maxPlayers: 4, minutes: 40, weight: 1.8, totalCopies: 3, mechanics: ['pattern', 'draft'], photoUrl: '/assets/caja-azul.svg', copySurchargeCents: 0 },
      { slug: 'wingspan', title: 'Wingspan', minPlayers: 1, maxPlayers: 5, minutes: 70, weight: 2.4, totalCopies: 1, mechanics: ['engine', 'cards'], photoUrl: '/assets/caja-wings.svg', copySurchargeCents: 300 },
      { slug: 'ticket', title: 'Ticket to Ride', minPlayers: 2, maxPlayers: 5, minutes: 60, weight: 1.8, totalCopies: 2, mechanics: ['set-collection', 'map'], photoUrl: '/assets/caja-ticket.svg', copySurchargeCents: 0 },
      { slug: '7wonders', title: '7 Wonders', minPlayers: 3, maxPlayers: 7, minutes: 40, weight: 2.3, totalCopies: 2, mechanics: ['draft', 'civ'], photoUrl: '/assets/caja-7w.svg', copySurchargeCents: 0 },
      { slug: 'codenames', title: 'Codenames', minPlayers: 4, maxPlayers: 8, minutes: 20, weight: 1.3, totalCopies: 3, mechanics: ['word', 'teams'], photoUrl: '/assets/caja-code.svg', copySurchargeCents: 0 },
      { slug: 'spirit', title: 'Spirit Island', minPlayers: 1, maxPlayers: 4, minutes: 120, weight: 4.0, totalCopies: 1, mechanics: ['coop', 'engine'], photoUrl: '/assets/caja-spirit.svg', copySurchargeCents: 400 },
    ];
    const games: Game[] = [];
    for (const d of gameDefs) {
      games.push((await this.games.save(d as any)) as Game);
    }

    const addonDefs = [
      { name: 'Soda artesana', priceCents: 350, active: true },
      { name: 'Tabla de quesos', priceCents: 900, active: true },
      { name: 'Temporizador de arena', priceCents: 200, active: true },
    ];
    const addons: Addon[] = [];
    for (const d of addonDefs) {
      addons.push((await this.addons.save(d as any)) as Addon);
    }

    await this.cafe.seedCalendarIfNeeded(madridToday(), 8);
    const slots = await this.cafe.slotsForDate(madridToday());
    const yesterday = addMadridDays(madridToday(), -1);
    await this.cafe.seedCalendarIfNeeded(yesterday, 1);
    const ySlots = await this.cafe.slotsForDate(yesterday);

    const table = tables[0];
    const game = games[0];
    const ySlot = ySlots.find((s) => s.startTime === '18:00') || ySlots[0];
    const completedCode = makeCode();
    const completedUrl = partidaUrl(completedCode);
    const completed = (await this.bookings.save({
      userId: visitor.id,
      cafeTableId: table.id,
      slotId: ySlot.id,
      partySize: 4,
      status: 'completed',
      expiresAt: null,
      code: completedCode,
      qrUrl: completedUrl,
      qrSvg: await buildSessionQrSvg(completedUrl, completedCode),
      confirmedAt: new Date(Date.now() - 36e5 * 20),
      checkedInAt: new Date(Date.now() - 36e5 * 18),
      completedAt: new Date(Date.now() - 36e5 * 2),
    } as any)) as Booking;
    const completedLines = [
      { kind: 'table', refId: table.id, label: `Mesa ${table.name}`, qty: 1, unitCents: table.priceCents, lineCents: table.priceCents },
      { kind: 'game', refId: game.id, label: game.title, qty: 1, unitCents: game.copySurchargeCents, lineCents: game.copySurchargeCents },
      { kind: 'addon', refId: addons[0].id, label: addons[0].name, qty: 1, unitCents: addons[0].priceCents, lineCents: addons[0].priceCents },
    ];
    for (const row of completedLines) {
      await this.lines.save({ bookingId: completed.id, ...row } as any);
    }
    await this.queue.save({ bookingId: completed.id, gameId: game.id, position: 0, isNowPlaying: false } as any);
    visitor.points = 10 * completed.partySize;
    await this.users.save(visitor as any);

    const liveSlot = slots.find((s) => s.startTime === '20:00') || slots[1];
    const liveCode = makeCode();
    const live = (await this.bookings.save({
      userId: visitor.id,
      cafeTableId: tables[1].id,
      slotId: liveSlot.id,
      partySize: 2,
      status: 'pending',
      expiresAt: new Date(Date.now() + 12 * 60 * 1000),
      code: liveCode,
      qrSvg: null,
      qrUrl: null,
    } as any)) as Booking;
    await this.lines.save({
      bookingId: live.id,
      kind: 'table',
      refId: tables[1].id,
      label: `Mesa ${tables[1].name}`,
      qty: 1,
      unitCents: tables[1].priceCents,
      lineCents: tables[1].priceCents,
    } as any);
    await this.queue.save({ bookingId: live.id, gameId: games[2].id, position: 0, isNowPlaying: false } as any);

    const expiredCode = makeCode();
    await this.bookings.save({
      userId: visitor.id,
      cafeTableId: tables[2].id,
      slotId: (slots.find((s) => s.startTime === '12:00') || slots[0]).id,
      partySize: 3,
      status: 'pending',
      expiresAt: new Date(Date.now() - 60_000),
      code: expiredCode,
      qrSvg: null,
      qrUrl: null,
    } as any);
  }
}
