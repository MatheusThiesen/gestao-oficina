import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { format } from 'node:util'
import { app } from 'electron'

const MAX_BYTES = 2 * 1024 * 1024

/** Copia console.info/warn/error do processo principal para <dados>/logs/main.log (para suporte). */
export function installFileLog(): string {
  const dir = join(app.getPath('userData'), 'logs')
  const file = join(dir, 'main.log')
  mkdirSync(dir, { recursive: true })
  rotate(file)

  for (const level of ['info', 'warn', 'error'] as const) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      try {
        appendFileSync(file, `${new Date().toISOString()} [${level}] ${format(...args)}\n`)
      } catch {
        // Log é auxiliar: nunca derruba o app.
      }
    }
  }
  return file
}

function rotate(file: string): void {
  try {
    if (statSync(file).size > MAX_BYTES) renameSync(file, file.replace(/\.log$/, '.old.log'))
  } catch {
    // arquivo ainda não existe
  }
}
