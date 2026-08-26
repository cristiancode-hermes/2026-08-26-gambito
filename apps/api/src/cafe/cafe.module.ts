import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { CafeService } from './cafe.service';
import { CafeController } from './cafe.controller';
import { StaffController } from './staff.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), AuthModule],
  controllers: [CafeController, StaffController],
  providers: [CafeService],
  exports: [CafeService],
})
export class CafeModule {}
