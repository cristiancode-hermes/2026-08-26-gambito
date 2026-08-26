import { ArrayNotEmpty, IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class HoldDto {
  @ApiProperty()
  @IsString()
  tableId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize!: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  gameIds!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonIds?: string[];
}

export class ConfirmDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentRef?: string;
}

export class QueueDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  order!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nowPlayingGameId?: string;
}

export class ReviewDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameId?: string;
}

export class CheckInDto {
  @ApiProperty()
  @IsString()
  code!: string;
}

export class CafeDayDto {
  @ApiProperty()
  @IsIn(['open', 'limited', 'closed'])
  status!: 'open' | 'limited' | 'closed';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxCovers?: number;
}
