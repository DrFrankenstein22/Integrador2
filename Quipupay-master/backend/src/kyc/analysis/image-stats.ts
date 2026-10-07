import sharp from 'sharp';

export type ImageStats = {
  width: number;
  height: number;
  megapixels: number;
  meanBrightness: number; // 0..255
  contrast: number; // stdev of luma, 0..~128
  sharpness: number; // sharp's estimated sharpness
  entropy: number; // 0..8, detail/texture; screens & flat prints score lower
  overexposedRatio: number; // 0..1, fraction of near-white pixels (glare)
  underexposedRatio: number; // 0..1
};

/**
 * Estadísticas de una imagen usadas por las heurísticas antifraude.
 * Todo se calcula con `sharp` (sin modelos de IA).
 */
export async function imageStats(buffer: Buffer): Promise<ImageStats> {
  const pipeline = sharp(buffer, { failOn: 'none' });
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const gray = sharp(buffer, { failOn: 'none' }).greyscale();
  const stats = await gray.stats();
  const channel = stats.channels[0];

  // Histograma de luma para glare / sombras.
  const { data, info } = await sharp(buffer, { failOn: 'none' })
    .greyscale()
    .resize(256, 256, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let over = 0;
  let under = 0;
  const total = info.width * info.height;
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] >= 245) {
      over += 1;
    } else if (data[i] <= 12) {
      under += 1;
    }
  }

  return {
    width,
    height,
    megapixels: Number(((width * height) / 1_000_000).toFixed(2)),
    meanBrightness: Number(channel.mean.toFixed(2)),
    contrast: Number(channel.stdev.toFixed(2)),
    sharpness: Number((stats.sharpness ?? 0).toFixed(3)),
    entropy: Number((stats.entropy ?? 0).toFixed(3)),
    overexposedRatio: Number((over / total).toFixed(4)),
    underexposedRatio: Number((under / total).toFixed(4)),
  };
}

/**
 * Diferencia normalizada (0..1) entre dos frames: 0 = idénticos (foto quieta),
 * ~0.1-0.4 = movimiento humano real entre pasos del challenge.
 */
export async function frameMotion(a: Buffer, b: Buffer): Promise<number> {
  const size = 64;
  const toRaw = (buf: Buffer) =>
    sharp(buf, { failOn: 'none' })
      .greyscale()
      .resize(size, size, { fit: 'fill' })
      .raw()
      .toBuffer();

  const [ra, rb] = await Promise.all([toRaw(a), toRaw(b)]);
  let sum = 0;
  for (let i = 0; i < ra.length; i += 1) {
    sum += Math.abs(ra[i] - rb[i]);
  }
  return Number((sum / ra.length / 255).toFixed(4));
}

/**
 * Recorta una imagen a partir de un bounding box relativo (0..1, como el que
 * devuelve Rekognition/DetectFaces) con margen alrededor de la cara, en vez de
 * adivinar dónde está el rostro. Un DNI peruano tiene la foto pegada al borde
 * izquierdo (no al centro), así que cualquier recorte "a ciegas" termina
 * agarrando texto/fondo en vez de la cara — este recorte usa la ubicación real
 * que detectó el proveedor de rostros.
 */
export async function cropToFaceBox(
  buffer: Buffer,
  box: { x: number; y: number; width: number; height: number },
  marginRatio = 0.35,
): Promise<Buffer> {
  const meta = await sharp(buffer, { failOn: 'none' }).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) {
    return buffer;
  }

  const marginX = box.width * w * marginRatio;
  const marginY = box.height * h * marginRatio;
  const left = Math.max(0, Math.round(box.x * w - marginX));
  const top = Math.max(0, Math.round(box.y * h - marginY));
  const right = Math.min(w, Math.round((box.x + box.width) * w + marginX));
  const bottom = Math.min(h, Math.round((box.y + box.height) * h + marginY));
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) {
    return buffer;
  }

  const cropped = sharp(buffer, { failOn: 'none' }).extract({ left, top, width, height });

  // La cara en un DNI es chica: recortada, muchas veces queda por debajo de
  // los ~100-150 px por lado que un modelo de comparación facial usa como
  // referencia interna. No se puede "inventar" detalle que no está en la
  // foto original, pero re-muestrear hacia arriba con un kernel de calidad
  // (Lanczos3) estabiliza el vector de características que calcula el
  // proveedor — el mismo motivo por el que estos modelos normalizan toda
  // entrada a un tamaño fijo (p. ej. 112x112 o 160x160) antes de vectorizar.
  const MIN_SIDE = 240;
  if (Math.min(width, height) < MIN_SIDE) {
    const scale = MIN_SIDE / Math.min(width, height);
    return cropped
      .resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        kernel: sharp.kernel.lanczos3,
      })
      .toBuffer();
  }

  return cropped.toBuffer();
}
