export type Decision = 'APPROVED' | 'REVIEW' | 'REJECTED';

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ChallengeStepCode =
  | 'LOOK_UP'
  | 'LOOK_DOWN'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'BLINK_TWICE'
  | 'MOVE_CLOSER'
  | 'SMILE';

export type ChallengeStep = {
  code: ChallengeStepCode;
  label: string;
  seconds: number;
};

export type OcrResult = {
  fullName: string | null;
  documentNumber: string | null;
  confidence: number;
};

export type FaceDetection = {
  faceCount: number;
  box?: BoundingBox;
  quality: number;
  sharpness: number;
};

export type FaceComparison = {
  matchScore: number;
  confidence: number;
};

export type LivenessInput = {
  frames: Buffer[];
  videoDurationMs: number;
  challenge: ChallengeStep[];
  stepTimingsMs: number[];
};

export type LivenessResult = {
  score: number;
  decision: Decision;
  signals: Record<string, number>;
  reasonCodes: string[];
};

export type DocumentInput = {
  frontStraight: Buffer;
  frontTilt: Buffer;
  backStraight: Buffer;
  backTilt: Buffer;
};

export type DocumentAnalysis = {
  ocr: OcrResult;
  quality: number;
  authenticity: number;
  reasonCodes: string[];
};

export type DeepfakeResult = {
  score: number;
  decision: Decision;
};

export type DocumentExpiry = {
  /** Fecha de caducidad encontrada en el documento, en formato ISO (yyyy-mm-dd), o null si no se pudo leer. */
  expiryDate: string | null;
  /** true = vencido, false = vigente, null = no se pudo determinar (no bloquea, es un chequeo asistido). */
  expired: boolean | null;
  /**
   * true = el nombre que devolvió RENIEC para ese número de DNI se encontró
   * impreso en la foto del documento; false = no se encontró (posible
   * documento de otra persona con el número cambiado a mano, o foto de otro
   * DNI); null = no se pudo determinar (no bloquea).
   */
  nameMatch: boolean | null;
  /** 0..1, fracción de las palabras del nombre de RENIEC halladas en el texto del documento. */
  nameMatchScore: number;
};

export interface FaceProvider {
  readonly name: string;
  detectFace(image: Buffer): Promise<FaceDetection>;
  compareFaces(reference: Buffer, probe: Buffer): Promise<FaceComparison>;
}

export interface LivenessProvider {
  readonly name: string;
  analyze(input: LivenessInput): Promise<LivenessResult>;
}

export interface DocumentProvider {
  readonly name: string;
  analyze(input: DocumentInput): Promise<DocumentAnalysis>;
}

export interface DeepfakeProvider {
  readonly name: string;
  score(frames: Buffer[]): Promise<DeepfakeResult>;
}

/**
 * Lee el texto impreso en el frente del documento (con OCR real, cuando el
 * proveedor lo soporta) para dos verificaciones que RENIEC no expone por
 * API:
 * 1. Fecha de caducidad: el DNI conserva el mismo número toda la vida, solo
 *    se reemplaza la tarjeta física al vencer, así que "vigente" = "no
 *    caducado" según lo impreso.
 * 2. Coincidencia de nombre: que el nombre que devuelve RENIEC para el
 *    número de DNI ingresado sea el mismo que está impreso en la FOTO del
 *    documento — sin esto, alguien podría escribir un número de DNI válido
 *    (el suyo) y fotografiar el documento físico de otra persona.
 * El mock no puede leer texto de una imagen -> siempre "no se pudo
 * determinar" en ambos (no bloquea); el proveedor AWS usa Rekognition
 * DetectText para las dos cosas con una sola llamada.
 */
export interface DocumentExpiryProvider {
  readonly name: string;
  check(frontImage: Buffer, expectedFullName?: string | null): Promise<DocumentExpiry>;
}

export type KycProviderSet = {
  face: FaceProvider;
  liveness: LivenessProvider;
  document: DocumentProvider;
  deepfake: DeepfakeProvider;
  documentExpiry: DocumentExpiryProvider;
};

export const KYC_PROVIDERS = 'KYC_PROVIDERS';
