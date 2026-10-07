import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { findProduct, PRODUCTS } from './products.constants';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  @Get()
  @ApiOperation({ summary: 'Catálogo de productos disponibles para apertura' })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  list() {
    return PRODUCTS;
  }

  @Get(':code')
  @ApiOperation({ summary: 'Detalle de un producto por código' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  detail(@Param('code') code: string) {
    const product = findProduct(code);

    if (!product) {
      throw new NotFoundException('El producto solicitado no existe');
    }

    return product;
  }
}
