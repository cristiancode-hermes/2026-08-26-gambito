import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Addon,
  Booking,
  BookingLine,
  CafeDay,
  CafeTable,
  EmailLog,
  Game,
  QueueEntry,
  Review,
  Slot,
  User,
} from '../entities/entities';
import { addMadridDays, hoursUntilSlotStart, madridToday, sortNightSlots } from '../common/time';
import { buildSessionQrSvg, extractTicketCode, makeCode, partidaUrl } from '../common/qr';
import { withLock } from '../common/mutex';

const LIVE = ['pending', 'confirmed', 'checked_in'] as const;
const HOLD_MS = 15 * 60 * 1000;
const POINTS_PER_GUEST = 10;

function conflict(code: string, message: string): never {
  throw new ConflictException({ code, message: `${code}: ${message}` });
}

function isLivePending(b: Booking, now = Date.now()): boolean {
  if (b.status !== 'pending') return LIVE.includes(b.status as any);
  if (!b.expiresAt) return true;
  return b.expiresAt.getTime() > now;
}

@Injectable()
export class CafeService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CafeTable) private readonly tables: Repository<CafeTable>,
    @InjectRepository(Game) private readonly games: Repository<Game>,
    @InjectRepository(CafeDay) private readonly days: Repository<CafeDay>,
    @InjectRepository(Slot) private readonly slots: Repository<Slot>,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectRepository(BookingLine) private readonly lines: Repository<BookingLine>,
    @InjectRepository(QueueEntry) private readonly queue: Repository<QueueEntry>,
    @InjectRepository(Addon) private readonly addons: Repository<Addon>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(EmailLog) private readonly emails: Repository<EmailLog>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.expireStale().catch(() => undefined);
    }, 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async expireStale(): Promise<number> {
    const now = new Date();
    const pending = await this.bookings.find({ where: { status: 'pending' } });
    let n = 0;
    for (const b of pending) {
      if (b.expiresAt && b.expiresAt.getTime() <= now.getTime()) {
        b.status = 'expired';
        await this.bookings.save(b as any);
        n += 1;
      }
    }
    return n;
  }

  private async liveBookingsForSlot(slotId: string, excludeId?: string): Promise<Booking[]> {
    const rows = await this.bookings.find({
      where: { slotId, status: In([...LIVE]) },
    });
    return rows.filter((b) => {
      if (excludeId && b.id === excludeId) return false;
      return isLivePending(b);
    });
  }

  async availableCopies(gameId: string, slotId: string, excludeBookingId?: string): Promise<number> {
    const game = await this.games.findOne({ where: { id: gameId } });
    if (!game) return 0;
    const live = await this.liveBookingsForSlot(slotId, excludeBookingId);
    if (!live.length) return game.totalCopies;
    const used = await this.queue.find({
      where: { bookingId: In(live.map((b) => b.id)), gameId },
    });
    return Math.max(0, game.totalCopies - used.length);
  }

  async freeSlotsToday(tableId: string, date = madridToday()): Promise<number> {
    const daySlots = sortNightSlots(await this.slots.find({ where: { day: date } }));
    let free = 0;
    for (const s of daySlots) {
      const live = await this.liveBookingsForSlot(s.id);
      if (!live.some((b) => b.cafeTableId === tableId)) free += 1;
    }
    return free;
  }

  async listTables() {
    const all = await this.tables.find({ order: { sortOrder: 'ASC' } });
    const date = madridToday();
    const out = [];
    for (const t of all) {
      const freeSlotsToday = await this.freeSlotsToday(t.id, date);
      out.push({ ...t, freeSlotsToday, occupancyLabel: freeSlotsToday > 0 ? 'Libre' : 'Ocupada' });
    }
    return out;
  }

  async getTable(id: string) {
    const t = await this.tables.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Mesa no encontrada');
    const date = madridToday();
    const freeSlotsToday = await this.freeSlotsToday(t.id, date);
    const slots = await this.slotsForDate(date);
    const occupancy = [];
    for (const s of slots) {
      const live = await this.liveBookingsForSlot(s.id);
      const taken = live.some((b) => b.cafeTableId === t.id);
      occupancy.push({
        slotId: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        sortKey: s.sortKey,
        status: taken ? 'Ocupada' : 'Libre',
        taken,
      });
    }
    return { ...t, freeSlotsToday, occupancyLabel: freeSlotsToday > 0 ? 'Libre' : 'Ocupada', occupancy };
  }

  async listGames(q?: { players?: number; maxMinutes?: number; q?: string; slotId?: string }) {
    const all = await this.games.find({ order: { title: 'ASC' } });
    const slotId = q?.slotId;
    const firstToday = sortNightSlots(await this.slots.find({ where: { day: madridToday() } }))[0];
    const sid = slotId || firstToday?.id;
    const out = [];
    for (const g of all) {
      if (q?.players && (g.minPlayers > q.players || g.maxPlayers < q.players)) continue;
      if (q?.maxMinutes && g.minutes > q.maxMinutes) continue;
      if (q?.q && !g.title.toLowerCase().includes(q.q.toLowerCase())) continue;
      const availableCopies = sid ? await this.availableCopies(g.id, sid) : g.totalCopies;
      out.push({ ...g, availableCopies });
    }
    return out;
  }

  async getGame(id: string, slotId?: string) {
    const g = await this.games.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Juego no encontrado');
    const firstToday = sortNightSlots(await this.slots.find({ where: { day: madridToday() } }))[0];
    const sid = slotId || firstToday?.id;
    const availableCopies = sid ? await this.availableCopies(g.id, sid) : g.totalCopies;
    const items = await this.reviews.find({ where: { gameId: id }, order: { createdAt: 'DESC' } });
    const avg = items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : 0;
    return { ...g, availableCopies, reviews: { avg, items } };
  }

  async slotsForDate(date?: string) {
    const day = date || madridToday();
    return sortNightSlots(await this.slots.find({ where: { day } }));
  }

  async getSlot(id: string) {
    const s = await this.slots.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Franja no encontrada');
    return s;
  }

  async cafeDayToday() {
    const day = madridToday();
    let row = await this.days.findOne({ where: { day } });
    if (!row) {
      row = (await this.days.save({ day, status: 'open', note: null, maxCovers: null } as any)) as CafeDay;
    }
    return row;
  }

  async listCafeDays(from?: string, to?: string) {
    const all = await this.days.find({ order: { day: 'ASC' } });
    return all.filter((d) => {
      if (from && d.day < from) return false;
      if (to && d.day > to) return false;
      return true;
    });
  }

  async listAddons() {
    return this.addons.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  quoteLines(table: CafeTable, games: Game[], addons: Addon[]) {
    const rows: Array<{ kind: 'table' | 'game' | 'addon'; refId: string; label: string; qty: number; unitCents: number; lineCents: number }> = [];
    rows.push({
      kind: 'table',
      refId: table.id,
      label: `Mesa ${table.name}`,
      qty: 1,
      unitCents: table.priceCents,
      lineCents: table.priceCents,
    });
    for (const g of games) {
      rows.push({
        kind: 'game',
        refId: g.id,
        label: g.title,
        qty: 1,
        unitCents: g.copySurchargeCents,
        lineCents: g.copySurchargeCents,
      });
    }
    for (const a of addons) {
      rows.push({
        kind: 'addon',
        refId: a.id,
        label: a.name,
        qty: 1,
        unitCents: a.priceCents,
        lineCents: a.priceCents,
      });
    }
    const totalCents = rows.reduce((s, r) => s + r.lineCents, 0);
    return { lines: rows, totalCents };
  }

  hold(userId: string, slotId: string, dto: { tableId: string; partySize: number; gameIds: string[]; addonIds?: string[] }) {
    return withLock(() => this.holdLocked(userId, slotId, dto));
  }

  private async holdLocked(
    userId: string,
    slotId: string,
    dto: { tableId: string; partySize: number; gameIds: string[]; addonIds?: string[] },
  ) {
    await this.expireStale();
    const slot = await this.slots.findOne({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Franja no encontrada');
    const day = await this.days.findOne({ where: { day: slot.day } });
    if (day?.status === 'closed') conflict('CAFE_CLOSED', 'El café está cerrado ese día');
    const table = await this.tables.findOne({ where: { id: dto.tableId } });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    if (dto.partySize < 1 || dto.partySize > table.seats) conflict('TABLE_FULL', 'El grupo no cabe en esta mesa');

    const mine = await this.bookings.find({
      where: { userId, cafeTableId: table.id, slotId },
    });
    const liveMine = mine.filter((b) => isLivePending(b));
    if (liveMine.some((b) => b.status === 'pending')) {
      conflict('ALREADY_HELD', 'Ya tienes una retención viva en esta mesa y franja');
    }
    if (liveMine.some((b) => b.status === 'confirmed' || b.status === 'checked_in')) {
      conflict('ALREADY_BOOKED', 'Ya tienes esta mesa confirmada');
    }

    const live = await this.liveBookingsForSlot(slotId);
    if (live.some((b) => b.cafeTableId === table.id)) {
      conflict('TABLE_TAKEN', 'Otro grupo tiene esta mesa');
    }

    const gameIds = Array.from(new Set(dto.gameIds || []));
    const games: Game[] = [];
    for (const gid of gameIds) {
      const g = await this.games.findOne({ where: { id: gid } });
      if (!g) throw new NotFoundException('Juego no encontrado');
      const copies = await this.availableCopies(g.id, slotId);
      if (copies < 1) conflict('NO_COPIES', `No quedan copias de ${g.title}`);
      games.push(g);
    }

    const addonIds = Array.from(new Set(dto.addonIds || []));
    const extra: Addon[] = [];
    for (const aid of addonIds) {
      const a = await this.addons.findOne({ where: { id: aid, active: true } });
      if (!a) throw new NotFoundException('Extra no encontrado');
      extra.push(a);
    }

    const quote = this.quoteLines(table, games, extra);
    const code = makeCode();
    const booking = (await this.bookings.save({
      userId,
      cafeTableId: table.id,
      slotId: slot.id,
      partySize: dto.partySize,
      status: 'pending',
      expiresAt: new Date(Date.now() + HOLD_MS),
      code,
      qrSvg: null,
      qrUrl: null,
    } as any)) as Booking;

    for (const row of quote.lines) {
      await this.lines.save({
        bookingId: booking.id,
        kind: row.kind,
        refId: row.refId,
        label: row.label,
        qty: row.qty,
        unitCents: row.unitCents,
        lineCents: row.lineCents,
      } as any);
    }
    let pos = 0;
    for (const g of games) {
      await this.queue.save({
        bookingId: booking.id,
        gameId: g.id,
        position: pos,
        isNowPlaying: false,
      } as any);
      pos += 1;
    }
    return this.serializeBooking(booking.id);
  }

  async confirm(userId: string, bookingId: string, _paymentRef?: string) {
    await this.expireStale();
    const b = await this.bookings.findOne({ where: { id: bookingId } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (b.userId !== userId) throw new ForbiddenException();
    if (b.status !== 'pending') conflict('NOT_CONFIRMABLE', 'Esta reserva no se puede confirmar');
    if (b.expiresAt && b.expiresAt.getTime() <= Date.now()) {
      b.status = 'expired';
      await this.bookings.save(b as any);
      conflict('NOT_CONFIRMABLE', 'La retención ha caducado');
    }
    const url = partidaUrl(b.code);
    const svg = await buildSessionQrSvg(url, b.code);
    b.status = 'confirmed';
    b.confirmedAt = new Date();
    b.expiresAt = null;
    b.qrUrl = url;
    b.qrSvg = svg;
    await this.bookings.save(b as any);
    const user = await this.users.findOne({ where: { id: userId } });
    if (user) {
      await this.emails.save({
        bookingId: b.id,
        toEmail: user.email,
        subject: `Pase Gambito ${b.code}`,
        body: `Tu partida está confirmada. Pase: ${url}`,
      } as any);
    }
    const serialized = await this.serializeBooking(b.id);
    return { booking: serialized, qrSvg: serialized.qrSvg, qrUrl: serialized.qrUrl };
  }

  async cancel(userId: string, bookingId: string) {
    const b = await this.bookings.findOne({ where: { id: bookingId }, relations: { slot: true } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (b.userId !== userId) throw new ForbiddenException();
    if (b.status === 'cancelled' || b.status === 'expired' || b.status === 'completed') {
      conflict('NOT_CONFIRMABLE', 'No se puede cancelar');
    }
    if (b.status === 'confirmed' || b.status === 'checked_in') {
      const hours = hoursUntilSlotStart(b.slot!.day, b.slot!.startTime);
      if (hours < 24) conflict('TOO_LATE', 'Cancelación solo hasta 24 h antes');
    }
    b.status = 'cancelled';
    await this.bookings.save(b as any);
    return this.serializeBooking(b.id);
  }

  async listMine(userId: string) {
    const rows = await this.bookings.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const out = [];
    for (const r of rows) out.push(await this.serializeBooking(r.id));
    return out;
  }

  async getMine(userId: string, id: string) {
    const b = await this.bookings.findOne({ where: { id } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (b.userId !== userId) throw new ForbiddenException();
    return this.serializeBooking(b.id);
  }

  async publicTicket(code: string) {
    const c = extractTicketCode(code);
    const b = await this.bookings.findOne({ where: { code: c } });
    if (!b) throw new NotFoundException('Pase no encontrado');
    const serialized = await this.ensureQr(b);
    return { booking: serialized, qrSvg: serialized.qrSvg, qrUrl: serialized.qrUrl };
  }

  async myPoints(userId: string) {
    const rows = await this.bookings.find({ where: { userId, status: 'completed' } });
    const points = rows.reduce((s, b) => s + POINTS_PER_GUEST * b.partySize, 0);
    const user = await this.users.findOne({ where: { id: userId } });
    if (user && user.points !== points) {
      user.points = points;
      await this.users.save(user as any);
    }
    return { points };
  }

  async addReview(userId: string, bookingId: string, dto: { rating: number; comment?: string; gameId?: string }) {
    const b = await this.bookings.findOne({ where: { id: bookingId } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (b.userId !== userId) throw new ForbiddenException();
    if (b.status !== 'completed') throw new BadRequestException('Solo partidas completed');
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating 1-5');
    const existing = await this.reviews.findOne({ where: { bookingId } });
    if (existing) throw new ConflictException('Ya hay reseña');
    return this.reviews.save({
      bookingId,
      userId,
      gameId: dto.gameId || null,
      rating: dto.rating,
      comment: dto.comment || null,
    } as any);
  }

  async gameReviews(gameId: string) {
    const items = await this.reviews.find({ where: { gameId }, order: { createdAt: 'DESC' } });
    const avg = items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : 0;
    return { avg, items };
  }

  async updateQueue(userId: string, bookingId: string, dto: { order: string[]; nowPlayingGameId?: string | null }) {
    const b = await this.bookings.findOne({ where: { id: bookingId } });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    if (b.userId !== userId) throw new ForbiddenException();
    if (b.status !== 'checked_in') throw new BadRequestException('La cola viva solo tras check-in');
    const entries = await this.queue.find({ where: { bookingId } });
    const ids = new Set(entries.map((e) => e.gameId));
    if (dto.order.length !== entries.length || dto.order.some((id) => !ids.has(id))) {
      throw new BadRequestException('Orden incompleto');
    }
    for (let i = 0; i < dto.order.length; i++) {
      const e = entries.find((x) => x.gameId === dto.order[i])!;
      e.position = i;
      e.isNowPlaying = dto.nowPlayingGameId ? e.gameId === dto.nowPlayingGameId : false;
      await this.queue.save(e as any);
    }
    return this.queue.find({ where: { bookingId }, order: { position: 'ASC' }, relations: { game: true } });
  }

  async staffCheckIn(raw: string) {
    await this.expireStale();
    const code = extractTicketCode(raw);
    const b = await this.bookings.findOne({ where: { code } });
    if (!b) throw new NotFoundException('Pase no encontrado');
    if (b.status === 'checked_in' || b.status === 'completed') {
      conflict('ALREADY_CHECKED_IN', 'Este pase ya se usó');
    }
    if (b.status !== 'confirmed') conflict('NOT_CONFIRMABLE', 'El pase no está confirmado');
    b.status = 'checked_in';
    b.checkedInAt = new Date();
    await this.bookings.save(b as any);
    const entries = await this.queue.find({ where: { bookingId: b.id }, order: { position: 'ASC' } });
    if (entries[0] && !entries.some((e) => e.isNowPlaying)) {
      entries[0].isNowPlaying = true;
      await this.queue.save(entries[0] as any);
    }
    return this.serializeBooking(b.id);
  }

  async patchCafeDay(date: string, dto: { status: 'open' | 'limited' | 'closed'; note?: string; maxCovers?: number | null }) {
    let row = await this.days.findOne({ where: { day: date } });
    if (!row) {
      row = (await this.days.save({
        day: date,
        status: dto.status,
        note: dto.note || null,
        maxCovers: dto.maxCovers ?? null,
      } as any)) as CafeDay;
    } else {
      row.status = dto.status;
      if (dto.note !== undefined) row.note = dto.note;
      if (dto.maxCovers !== undefined) row.maxCovers = dto.maxCovers;
      await this.days.save(row as any);
    }
    return row;
  }

  async statsToday() {
    const date = madridToday();
    const daySlots = await this.slots.find({ where: { day: date } });
    const ids = daySlots.map((s) => s.id);
    if (!ids.length) return { covers: 0, copiesOut: 0, revenue: 0 };
    const rows = await this.bookings.find({
      where: { slotId: In(ids), status: In(['confirmed', 'checked_in', 'completed']) },
    });
    const covers = rows.reduce((s, b) => s + b.partySize, 0);
    const bid = rows.map((b) => b.id);
    const lineRows = bid.length ? await this.lines.find({ where: { bookingId: In(bid) } }) : [];
    const revenue = lineRows.reduce((s, l) => s + l.lineCents, 0);
    const q = bid.length ? await this.queue.find({ where: { bookingId: In(bid) } }) : [];
    return { covers, copiesOut: q.length, revenue };
  }

  async nowPlayingRail(date = madridToday()) {
    const slots = await this.slots.find({ where: { day: date } });
    const live = await this.bookings.find({
      where: { slotId: In(slots.map((s) => s.id)), status: In(['checked_in']) },
    });
    const rail = [];
    for (const b of live) {
      const q = await this.queue.find({
        where: { bookingId: b.id, isNowPlaying: true },
        relations: { game: true },
      });
      const table = await this.tables.findOne({ where: { id: b.cafeTableId } });
      if (q[0]?.game) {
        rail.push({ tableId: b.cafeTableId, tableName: table?.name, game: q[0].game, bookingId: b.id });
      }
    }
    return rail;
  }

  private async ensureQr(b: Booking) {
    const url = partidaUrl(b.code);
    if (!b.qrSvg || !b.qrSvg.includes(url) || !b.qrUrl) {
      b.qrUrl = url;
      b.qrSvg = await buildSessionQrSvg(url, b.code);
      await this.bookings.save(b as any);
    }
    return this.serializeBooking(b.id);
  }

  async serializeBooking(id: string) {
    const b = await this.bookings.findOne({
      where: { id },
      relations: { cafeTable: true, slot: true, user: true },
    });
    if (!b) throw new NotFoundException('Reserva no encontrada');
    const lines = await this.lines.find({ where: { bookingId: id } });
    const queue = await this.queue.find({ where: { bookingId: id }, order: { position: 'ASC' }, relations: { game: true } });
    const totalCents = lines.reduce((s, l) => s + l.lineCents, 0);
    if ((b.status === 'confirmed' || b.status === 'checked_in' || b.status === 'completed') && (!b.qrSvg || !String(b.qrSvg).includes(partidaUrl(b.code)))) {
      b.qrUrl = partidaUrl(b.code);
      b.qrSvg = await buildSessionQrSvg(b.qrUrl, b.code);
      await this.bookings.save(b as any);
    }
    return {
      ...b,
      lines,
      queue,
      totalCents,
      table: b.cafeTable,
      slot: b.slot,
    };
  }

  async seedCalendarIfNeeded(from = madridToday(), days = 7) {
    const hours = ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00'];
    for (let i = 0; i < days; i++) {
      const day = addMadridDays(from, i);
      let cafe = await this.days.findOne({ where: { day } });
      if (!cafe) {
        cafe = (await this.days.save({
          day,
          status: i === 3 ? 'closed' : 'open',
          note: i === 3 ? 'Inventario y barniz de tapetes' : 'Sala abierta',
          maxCovers: null,
        } as any)) as CafeDay;
      }
      for (const start of hours) {
        const exists = await this.slots.findOne({ where: { day, startTime: start } });
        if (exists) continue;
        const [hh] = start.split(':').map(Number);
        const end =
          start === '00:00' ? '02:00' : `${String((hh + 2) % 24).padStart(2, '0')}:00`;
        await this.slots.save({
          cafeDayId: cafe.id,
          day,
          startTime: start,
          endTime: end,
          sortKey: start === '00:00' ? 24 : hh,
        } as any);
      }
    }
  }
}
