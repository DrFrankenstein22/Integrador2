import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Respuesta de https://api.apis.net.pe/v1/dni
type DniApiResponse = {
  nombre?: string;
  numeroDocumento?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
};

const DNI_API_URL = 'https://api.apis.net.pe/v1/dni';

@Injectable()
export class IdentityService {
  constructor(private readonly configService: ConfigService) {}

  async findByDni(dni: string) {
    const token = this.configService.get<string>('APIPERU_TOKEN');

    if (!token) {
      throw new ServiceUnavailableException(
        'El servicio de validación de identidad no está configurado',
      );
    }

    let response: Response;

    try {
      response = await fetch(
        `${DNI_API_URL}?numero=${encodeURIComponent(dni)}&token=${encodeURIComponent(token)}`,
        { headers: { Accept: 'application/json' } },
      );
    } catch {
      throw new ServiceUnavailableException(
        'No fue posible conectarse al proveedor de identidad',
      );
    }

    if (response.status === 404 || response.status === 422) {
      throw new NotFoundException('No se encontraron datos para el DNI ingresado');
    }

    if (response.status === 401 || response.status === 403) {
      throw new BadGatewayException(
        'El proveedor de identidad rechazó el token configurado',
      );
    }

    if (response.status === 429) {
      throw new ServiceUnavailableException(
        'El proveedor de identidad alcanzó su límite de consultas. Intenta más tarde',
      );
    }

    let payload: DniApiResponse;

    try {
      payload = (await response.json()) as DniApiResponse;
    } catch {
      throw new BadGatewayException(
        'El proveedor de identidad devolvió una respuesta inválida',
      );
    }

    const paternalSurname = payload.apellidoPaterno?.trim() ?? '';
    const maternalSurname = payload.apellidoMaterno?.trim() ?? '';
    const names = payload.nombres?.trim() ?? '';

    if (!response.ok || (!payload.nombre && !names)) {
      throw new BadGatewayException('No fue posible validar el DNI');
    }

    const fullName =
      payload.nombre?.trim() ||
      [names, paternalSurname, maternalSurname].filter(Boolean).join(' ');

    return {
      dni: payload.numeroDocumento ?? dni,
      fullName,
      names,
      paternalSurname,
      maternalSurname,
      verificationCode: null,
      verified: true,
      source: 'APIS_NET_PE',
    };
  }
}
