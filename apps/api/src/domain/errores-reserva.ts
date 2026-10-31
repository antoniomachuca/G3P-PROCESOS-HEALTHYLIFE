export type CodigoErrorReserva =
  | "no_encontrado"
  | "no_reservable"
  | "duplicada"
  | "usuario_invalido"
  | "evento_iniciado"
  | "ya_cancelada";

export class ErrorDeReserva extends Error {
  readonly codigo: CodigoErrorReserva;

  constructor(codigo: CodigoErrorReserva, message: string) {
    super(message);
    this.codigo = codigo;
  }
}
