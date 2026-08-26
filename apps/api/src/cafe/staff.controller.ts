import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CafeService } from './cafe.service';
import { CafeDayDto, CheckInDto } from './cafe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StaffGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly cafe: CafeService) {}

  @Post('check-in')
  checkIn(@Body() dto: CheckInDto) {
    return this.cafe.staffCheckIn(dto.code);
  }

  @Patch('cafe-days/:date')
  patchDay(@Param('date') date: string, @Body() dto: CafeDayDto) {
    return this.cafe.patchCafeDay(date, dto);
  }

  @Get('stats/today')
  stats() {
    return this.cafe.statsToday();
  }
}
