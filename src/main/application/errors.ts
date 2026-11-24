/** Erro de regra/entrada que o usuário consegue corrigir. A mensagem vai para a tela. */
export class ValidationError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {}
  ) {
    super(message)
    this.name = 'ValidationError'
  }

  static fields(fields: Record<string, string>): ValidationError {
    return new ValidationError(Object.values(fields)[0] ?? 'Verifique os campos.', fields)
  }
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} não encontrado.`)
    this.name = 'NotFoundError'
  }
}
