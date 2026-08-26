import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 180, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 120 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 16, default: 'visitor' })
  role: 'visitor' | 'staff' | 'admin';

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Booking, (b: Booking) => b.user)
  bookings?: Booking[];
}

@Entity({ name: 'cafe_tables' })
export class CafeTable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'int' })
  seats: number;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'varchar', length: 240 })
  photoUrl: string;

  @Column({ type: 'text' })
  blurb: string;

  @Column({ type: 'int' })
  sortOrder: number;

  @OneToMany(() => Booking, (b: Booking) => b.cafeTable)
  bookings?: Booking[];
}

@Entity({ name: 'games' })
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'int' })
  minPlayers: number;

  @Column({ type: 'int' })
  maxPlayers: number;

  @Column({ type: 'int' })
  minutes: number;

  @Column({ type: 'real' })
  weight: number;

  @Column({ type: 'int' })
  totalCopies: number;

  @Column({ type: 'simple-json' })
  mechanics: string[];

  @Column({ type: 'varchar', length: 240 })
  photoUrl: string;

  @Column({ type: 'int', default: 0 })
  copySurchargeCents: number;
}

@Entity({ name: 'cafe_days' })
export class CafeDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10, unique: true })
  day: string;

  @Column({ type: 'varchar', length: 16 })
  status: 'open' | 'limited' | 'closed';

  @Column({ type: 'varchar', length: 200, nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  maxCovers: number | null;

  @OneToMany(() => Slot, (s: Slot) => s.cafeDay)
  slots?: Slot[];
}

@Entity({ name: 'slots' })
@Index(['day', 'startTime'], { unique: true })
export class Slot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  cafeDayId: string;

  @ManyToOne(() => CafeDay, (d: CafeDay) => d.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cafeDayId' })
  cafeDay?: CafeDay;

  @Column({ type: 'varchar', length: 10 })
  day: string;

  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  @Column({ type: 'int' })
  sortKey: number;
}

@Entity({ name: 'addons' })
export class Addon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'int' })
  priceCents: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}

@Entity({ name: 'bookings' })
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @ManyToOne(() => User, (u: User) => u.bookings)
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 36 })
  cafeTableId: string;

  @ManyToOne(() => CafeTable, (t: CafeTable) => t.bookings)
  @JoinColumn({ name: 'cafeTableId' })
  cafeTable?: CafeTable;

  @Column({ type: 'varchar', length: 36 })
  slotId: string;

  @ManyToOne(() => Slot)
  @JoinColumn({ name: 'slotId' })
  slot?: Slot;

  @Column({ type: 'int' })
  partySize: number;

  @Column({ type: 'varchar', length: 20 })
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'expired';

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 16, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  qrSvg: string | null;

  @Column({ type: 'varchar', length: 240, nullable: true })
  qrUrl: string | null;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  checkedInAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => BookingLine, (l: BookingLine) => l.booking)
  lines?: BookingLine[];

  @OneToMany(() => QueueEntry, (q: QueueEntry) => q.booking)
  queue?: QueueEntry[];
}

@Entity({ name: 'booking_lines' })
export class BookingLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking, (b: Booking) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 16 })
  kind: 'table' | 'game' | 'addon';

  @Column({ type: 'varchar', length: 36, nullable: true })
  refId: string | null;

  @Column({ type: 'varchar', length: 120 })
  label: string;

  @Column({ type: 'int', default: 1 })
  qty: number;

  @Column({ type: 'int' })
  unitCents: number;

  @Column({ type: 'int' })
  lineCents: number;
}

@Entity({ name: 'queue_entries' })
export class QueueEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking, (b: Booking) => b.queue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 36 })
  gameId: string;

  @ManyToOne(() => Game)
  @JoinColumn({ name: 'gameId' })
  game?: Game;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'boolean', default: false })
  isNowPlaying: boolean;
}

@Entity({ name: 'reviews' })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, unique: true })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 36 })
  userId: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  gameId: string | null;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'varchar', length: 400, nullable: true })
  comment: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Entity({ name: 'email_logs' })
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  bookingId: string;

  @Column({ type: 'varchar', length: 180 })
  toEmail: string;

  @Column({ type: 'varchar', length: 160 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  sentAt: Date;
}

export const ALL_ENTITIES = [
  User,
  CafeTable,
  Game,
  CafeDay,
  Slot,
  Addon,
  Booking,
  BookingLine,
  QueueEntry,
  Review,
  EmailLog,
];
