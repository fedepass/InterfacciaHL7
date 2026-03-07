import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DrugCategoryService } from './drug-category.service';

@Controller('api/drug-categories')
export class DrugCategoryController {
  constructor(private readonly svc: DrugCategoryService) {}

  @Get()
  getAll() {
    return this.svc.getCategories();
  }

  @Get(':code')
  getOne(@Param('code') code: string) {
    return this.svc.getCategory(code);
  }

  @Post()
  create(@Body() body: { code: string; label: string; description?: string }) {
    return this.svc.addCategory(body);
  }

  @Put(':code')
  update(@Param('code') code: string, @Body() body: { label?: string; description?: string; active?: boolean }) {
    return this.svc.updateCategory(code, body);
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('code') code: string) {
    await this.svc.removeCategory(code);
  }

  // ── Alias ─────────────────────────────────────────────────────

  @Post(':code/aliases')
  addAlias(@Param('code') code: string, @Body() body: { alias: string; language?: string }) {
    return this.svc.addAlias(code, body);
  }

  @Delete('aliases/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAlias(@Param('id') id: string) {
    await this.svc.removeAlias(Number(id));
  }

  // ── ATC: gerarchia ────────────────────────────────────────────

  @Get('atc/hierarchy')
  getAtcHierarchy() {
    return this.svc.getAtcHierarchy();
  }

  @Get('atc/level2')
  getAtcLevel2() {
    return this.svc.getAtcLevel2();
  }

  // ── ATC: associazioni categoria ↔ codice ──────────────────────

  @Post(':code/atc')
  @HttpCode(HttpStatus.CREATED)
  async addAtcMapping(@Param('code') code: string, @Body() body: { atcCode: string }) {
    await this.svc.addAtcMapping(code, body.atcCode);
  }

  @Delete('atc-mappings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAtcMapping(@Param('id') id: string) {
    await this.svc.removeAtcMapping(Number(id));
  }
}
