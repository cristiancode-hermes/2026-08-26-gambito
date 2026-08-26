import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities/entities';
import { SeedService } from './seed.service';
import { CafeModule } from '../cafe/cafe.module';

@Module({
  imports: [TypeOrmModule.forFeature(ALL_ENTITIES), CafeModule],
  providers: [SeedService],
})
export class SeedModule {}
