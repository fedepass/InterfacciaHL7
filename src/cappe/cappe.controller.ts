import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CappeService, CreateCappaDto, UpdateCappaDto } from './cappe.service';

@Controller('api/cappe')
export class CappeController {
  constructor(private readonly cappeService: CappeService) {}

  @Get()
  findAll() {
    return this.cappeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cappeService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCappaDto) {
    return this.cappeService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCappaDto) {
    return this.cappeService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    this.cappeService.remove(id);
    return { message: `Cappa ${id} rimossa` };
  }

  @Get(':id/queue')
  getQueue(@Param('id') id: string) {
    return this.cappeService.getQueue(id);
  }
}
