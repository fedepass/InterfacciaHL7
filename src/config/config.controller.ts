import { Controller, Get, Put, Post, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { ConfigService, RoutingFilter } from './config.service';

@Controller('api/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('filters')
  getFilters() {
    return this.configService.getFilters();
  }

  @Post('filters')
  addFilter(@Body() dto: Omit<RoutingFilter, 'id'>) {
    return this.configService.addFilter(dto);
  }

  @Put('filters/:id')
  updateFilter(@Param('id') id: string, @Body() dto: Partial<Omit<RoutingFilter, 'id'>>) {
    const result = this.configService.updateFilter(id, dto);
    if (!result) throw new NotFoundException(`Filtro ${id} non trovato`);
    return result;
  }

  @Delete('filters/:id')
  removeFilter(@Param('id') id: string) {
    const ok = this.configService.removeFilter(id);
    if (!ok) throw new NotFoundException(`Filtro ${id} non trovato`);
    return { message: `Filtro ${id} rimosso` };
  }

  @Get('output-fields')
  getOutputFields() {
    return { enabledFields: this.configService.getOutputFields() };
  }

  @Put('output-fields')
  setOutputFields(@Body() body: { enabledFields: string[] | null }) {
    this.configService.setOutputFields(body.enabledFields ?? null);
    return { enabledFields: this.configService.getOutputFields() };
  }
}
