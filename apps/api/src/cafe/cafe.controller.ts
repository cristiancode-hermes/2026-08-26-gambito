import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CafeService } from './cafe.service';
import { ConfirmDto, HoldDto, QueueDto, ReviewDto } from './cafe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, StaffGuard } from '../auth/current-user';

@ApiTags('cafe')
@Controller()
export class CafeController {
  constructor(private readonly cafe: CafeService) {}

  @Get('tables')
  listTables() {
    return this.cafe.listTables();
  }

  @Get('tables/:id')
  getTable(@Param('id') id: string) {
    return this.cafe.getTable(id);
  }

  @Get('games')
  listGames(
    @Query('players') players?: number,
    @Query('maxMinutes') maxMinutes?: number,
    @Query('q') q?: string,
    @Query('slotId') slotId?: string,
  ) {
    return this.cafe.listGames({ players, maxMinutes, q, slotId });
  }

  @Get('games/:id/reviews')
  gameReviews(@Param('id') id: string) {
    return this.cafe.gameReviews(id);
  }

  @Get('games/:id')
  getGame(@Param('id') id: string, @Query('slotId') slotId?: string) {
    return this.cafe.getGame(id, slotId);
  }

  @Get('slots')
  slots(@Query('date') date?: string) {
    return this.cafe.slotsForDate(date);
  }

  @Get('slots/:id')
  getSlot(@Param('id') id: string) {
    return this.cafe.getSlot(id);
  }

  @Get('cafe-days/today')
  today() {
    return this.cafe.cafeDayToday();
  }

  @Get('cafe-days')
  days(@Query('from') from?: string, @Query('to') to?: string) {
    return this.cafe.listCafeDays(from, to);
  }

  @Get('addons')
  addons() {
    return this.cafe.listAddons();
  }

  @Post('slots/:id/hold')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  hold(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: HoldDto) {
    return this.cafe.hold(user.userId, id, dto);
  }

  @Get('bookings/ticket/:code')
  ticket(@Param('code') code: string) {
    return this.cafe.publicTicket(code);
  }

  @Get('bookings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: { userId: string }) {
    return this.cafe.listMine(user.userId);
  }

  @Get('bookings/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  one(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.cafe.getMine(user.userId, id);
  }

  @Post('bookings/:id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  confirm(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: ConfirmDto) {
    return this.cafe.confirm(user.userId, id, dto.paymentRef);
  }

  @Post('bookings/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancel(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.cafe.cancel(user.userId, id);
  }

  @Patch('bookings/:id/queue')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  queue(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: QueueDto) {
    return this.cafe.updateQueue(user.userId, id, dto);
  }

  @Post('bookings/:id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  review(@CurrentUser() user: { userId: string }, @Param('id') id: string, @Body() dto: ReviewDto) {
    return this.cafe.addReview(user.userId, id, dto);
  }

  @Get('me/points')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  points(@CurrentUser() user: { userId: string }) {
    return this.cafe.myPoints(user.userId);
  }

  @Get('now-playing')
  nowPlaying() {
    return this.cafe.nowPlayingRail();
  }

  @Get('stats/today')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  statsToday() {
    return this.cafe.statsToday();
  }
}
