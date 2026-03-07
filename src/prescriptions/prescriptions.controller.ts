import {
  Controller, Post, Get, Patch, Param, Query,
  Req, Res, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrescriptionsService } from './prescriptions.service';
import { ConfigService } from '../config/config.service';

@Controller('api/prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  async receive(@Req() req: Request, @Res() res: Response) {
    try {
      let raw: string;
      if (typeof req.body === 'string') {
        raw = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        raw = req.body.toString('utf-8');
      } else if (typeof req.body === 'object' && req.body !== null) {
        raw = JSON.stringify(req.body);
      } else {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Body vuoto o non leggibile' });
      }

      const result = await this.prescriptionsService.receive(raw);
      const filtered = this.configService.applyOutputFilter(result as unknown as Record<string, any>);
      return res.status(HttpStatus.CREATED).json(filtered);
    } catch (e) {
      const status = e.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      return res.status(status).json({ error: e.message });
    }
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('raw') raw?: string,
    @Res() res?: Response,
  ) {
    const results = await this.prescriptionsService.findAll(status);
    const ids = results.map((p) => p.prescriptionId);
    const useRaw = raw === 'true' || raw === '1';
    const output = useRaw
      ? results
      : results.map((p) => this.configService.applyOutputFilter(p as unknown as Record<string, any>));
    if (!useRaw) {
      res.on('finish', () => ids.forEach((id) => this.prescriptionsService.markAsSent(id)));
    }
    res.json(output);
  }

  @Patch(':id/sent')
  async markSent(@Param('id') id: string, @Res() res: Response) {
    const exists = await this.prescriptionsService.findOne(id);
    if (!exists) {
      return res.status(HttpStatus.NOT_FOUND).json({ error: `Prescrizione ${id} non trovata` });
    }
    await this.prescriptionsService.markAsSent(id);
    return res.status(HttpStatus.OK).json({ ok: true });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const p = await this.prescriptionsService.findOne(id);
    if (!p) {
      res.status(HttpStatus.NOT_FOUND).json({ error: `Prescrizione ${id} non trovata` });
      return;
    }
    const filtered = this.configService.applyOutputFilter(p as unknown as Record<string, any>);
    res.on('finish', () => this.prescriptionsService.markAsSent(id));
    res.json(filtered);
  }
}
