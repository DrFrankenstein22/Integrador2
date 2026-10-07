import { NotFoundException } from '@nestjs/common';

import { ProductsController } from '../src/products/products.controller';

describe('ProductsController', () => {
  const controller = new ProductsController();

  it('lists the account products with a single recommended one', () => {
    const products = controller.list();

    expect(products.length).toBeGreaterThanOrEqual(3);
    expect(products.filter((product) => product.recommended)).toHaveLength(1);
    expect(products.map((product) => product.code)).toContain('AHORROS');
  });

  it('returns a product by code (case insensitive)', () => {
    expect(controller.detail('ahorros').name).toBe('Cuenta de ahorros');
  });

  it('throws 404 for an unknown product', () => {
    expect(() => controller.detail('NOPE')).toThrow(NotFoundException);
  });
});
