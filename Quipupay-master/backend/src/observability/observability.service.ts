import { Injectable, Logger } from '@nestjs/common';
import { getNewRelic } from './newrelic.client';

export type ObsAttrs = Record<string, string | number | boolean | null | undefined>;
type SafeAttrs = Record<string, string | number | boolean | null>;

// Cinturon y tirantes: el `attributes.exclude` de newrelic.js filtra a nivel
// de transporte, esta lista filtra a nivel de codigo — evita que un
// `recordEvent` escrito con prisa en clase filtre un DNI, un PIN o un token.
const DENY_LIST = new Set([
  'dni',
  'password',
  'pin',
  'pinhash',
  'otp',
  'accesstoken',
  'refreshtoken',
  'email',
  'phone',
  'firstname',
  'lastname',
  'sessionkey',
]);

const MAX_STRING_LENGTH = 255;

/**
 * Wrapper inyectable sobre la API del agente de New Relic. Nunca lanza: un
 * fallo de telemetria no debe tumbar un request de negocio.
 */
@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger(ObservabilityService.name);

  get enabled(): boolean {
    return getNewRelic() !== null;
  }

  addAttributes(attrs: ObsAttrs): void {
    this.safeCall(() => {
      const agent = getNewRelic();
      if (!agent) return;
      agent.addCustomAttributes(this.sanitize(attrs));
    });
  }

  setTransactionName(name: string): void {
    this.safeCall(() => getNewRelic()?.setTransactionName(name));
  }

  recordMetric(name: string, value: number): void {
    this.safeCall(() => getNewRelic()?.recordMetric(name, value));
  }

  incrementMetric(name: string, amount = 1): void {
    this.safeCall(() => getNewRelic()?.incrementMetric(name, amount));
  }

  recordEvent(eventType: string, attrs: ObsAttrs): void {
    this.safeCall(() => {
      const agent = getNewRelic();
      if (!agent) return;
      agent.recordCustomEvent(eventType, this.sanitize(attrs));
    });
  }

  noticeError(error: unknown, attrs: ObsAttrs = {}): void {
    this.safeCall(() => {
      const agent = getNewRelic();
      if (!agent) return;
      const normalized = error instanceof Error ? error : new Error(String(error));
      agent.noticeError(normalized, this.sanitize(attrs));
    });
  }

  startSegment<T>(name: string, record: boolean, handler: () => T): T {
    const agent = getNewRelic();
    if (!agent) {
      return handler();
    }
    try {
      return agent.startSegment(name, record, handler);
    } catch (err) {
      this.logger.warn(`startSegment(${name}) fallo, ejecutando sin traza: ${err}`);
      return handler();
    }
  }

  startBackgroundTransaction<T>(name: string, group: string, handler: () => T): T {
    const agent = getNewRelic();
    if (!agent) {
      return handler();
    }
    try {
      return agent.startBackgroundTransaction(name, group, handler);
    } catch (err) {
      this.logger.warn(`startBackgroundTransaction(${name}) fallo: ${err}`);
      return handler();
    }
  }

  private sanitize(attrs: ObsAttrs): SafeAttrs {
    const out: SafeAttrs = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined) continue;
      if (DENY_LIST.has(key.toLowerCase())) continue;
      out[key] = this.coerce(value);
    }
    return out;
  }

  private coerce(value: string | number | boolean | null): string | number | boolean | null {
    if (typeof value !== 'string') return value;
    return value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
  }

  private safeCall(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      this.logger.warn(`Llamada a New Relic fallo (ignorada): ${err}`);
    }
  }
}
