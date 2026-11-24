import type { IpcChannel, IpcInput, IpcOutput } from '@shared/ipc'

/** Erro devolvido pelo main; `fields` traz a mensagem de cada campo inválido. */
export class IpcError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {}
  ) {
    super(message)
  }
}

/** Chama o main e devolve os dados, ou lança IpcError com a mensagem do main. */
export async function call<C extends IpcChannel>(
  channel: C,
  ...args: IpcInput<C> extends void ? [] : [IpcInput<C>]
): Promise<IpcOutput<C>> {
  const result = await window.api.invoke(channel, ...args)
  if (!result.ok) throw new IpcError(result.error, result.fields)
  return result.data
}
