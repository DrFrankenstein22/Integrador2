import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { IsString, Length, Matches } from 'class-validator';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { KycService } from './kyc.service';
import type { DeviceSignals } from './risk-engine.service';

type MulterFile = { buffer: Buffer };
type Uploaded = Record<string, MulterFile[] | undefined>;

class CreateSessionDto {
  @IsString()
  @Matches(/^\d{8}$/, { message: 'El DNI debe tener 8 dígitos' })
  dni: string;
}

class ChallengeDto {
  @IsString()
  @Length(16, 64)
  sessionKey: string;
}

function firstBuffer(files: Uploaded, field: string): Buffer {
  const file = files[field]?.[0];
  if (!file) {
    throw new BadRequestException(`Falta el archivo "${field}"`);
  }
  return file.buffer;
}

@ApiTags('KYC')
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('session')
  @ApiOperation({ summary: 'Iniciar una sesión de verificación de identidad' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.kyc.createSession(dto.dni);
  }

  @Post('challenge')
  @ApiOperation({ summary: 'Obtener un challenge de liveness activo aleatorio' })
  challenge(@Body() dto: ChallengeDto) {
    return this.kyc.issueChallenge(dto.sessionKey);
  }

  @Post('document')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir y analizar la foto del DNI (frente/reverso, recto/inclinado)' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'frontStraight', maxCount: 1 },
        { name: 'frontTilt', maxCount: 1 },
        { name: 'backStraight', maxCount: 1 },
        { name: 'backTilt', maxCount: 1 },
      ],
      { limits: { fileSize: 8 * 1024 * 1024 } },
    ),
  )
  document(
    @UploadedFiles() files: Uploaded,
    @Body('sessionKey') sessionKey: string,
  ) {
    if (!sessionKey) {
      throw new BadRequestException('Falta sessionKey');
    }
    return this.kyc.analyzeDocument(sessionKey, {
      frontStraight: firstBuffer(files, 'frontStraight'),
      frontTilt: firstBuffer(files, 'frontTilt'),
      backStraight: firstBuffer(files, 'backStraight'),
      backTilt: firstBuffer(files, 'backTilt'),
    });
  }

  @Post('selfie')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Subir el video del challenge y decidir el KYC' })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'frames', maxCount: 10 },
        { name: 'neutralFrame', maxCount: 1 },
      ],
      { limits: { fileSize: 25 * 1024 * 1024 } },
    ),
  )
  selfie(@UploadedFiles() files: Uploaded, @Body() body: Record<string, string>) {
    if (!body.sessionKey || !body.challengeId || !body.nonce) {
      throw new BadRequestException('Faltan sessionKey / challengeId / nonce');
    }
    const frames = (files.frames ?? []).map((f) => f.buffer);
    if (frames.length === 0) {
      throw new BadRequestException('Faltan los frames de la selfie');
    }

    let device: DeviceSignals;
    let stepTimingsMs: number[];
    try {
      device = JSON.parse(body.device ?? '{}') as DeviceSignals;
      stepTimingsMs = JSON.parse(body.stepTimingsMs ?? '[]') as number[];
    } catch {
      throw new BadRequestException('device / stepTimingsMs con formato inválido');
    }

    return this.kyc.analyzeSelfie(body.sessionKey, {
      video: files.video?.[0]?.buffer,
      frames,
      neutralFrame: files.neutralFrame?.[0]?.buffer,
      videoDurationMs: Number(body.videoDurationMs ?? 0),
      challengeId: body.challengeId,
      nonce: body.nonce,
      stepTimingsMs,
      device,
    });
  }

  @Get('result/:sessionKey')
  @ApiOperation({ summary: 'Consultar el resultado de una verificación' })
  result(@Param('sessionKey') sessionKey: string) {
    return this.kyc.getResult(sessionKey);
  }
}
