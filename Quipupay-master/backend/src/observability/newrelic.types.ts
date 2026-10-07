/**
 * Subconjunto tipado de la API publica del agente de New Relic que
 * efectivamente usamos. El paquete `newrelic` no trae tipos oficiales.
 * https://github.com/newrelic/node-newrelic/blob/main/api.js
 */
export interface NewRelicApi {
  addCustomAttribute(key: string, value: string | number | boolean | null): void;
  addCustomAttributes(attributes: Record<string, string | number | boolean | null>): void;
  setTransactionName(name: string): void;
  recordMetric(name: string, value: number): void;
  incrementMetric(name: string, amount?: number): void;
  recordCustomEvent(eventType: string, attributes: Record<string, string | number | boolean | null>): void;
  noticeError(error: Error, customAttributes?: Record<string, string | number | boolean | null>): void;
  startSegment<T>(
    name: string,
    record: boolean,
    handler: () => T,
    callback?: (result: T) => void,
  ): T;
  startBackgroundTransaction<T>(
    name: string,
    group: string,
    handler: () => T,
  ): T;
}
