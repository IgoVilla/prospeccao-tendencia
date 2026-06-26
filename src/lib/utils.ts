import { addBusinessDays, format, isAfter, differenceInMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function proximoFollowUp(): string {
  const data = addBusinessDays(new Date(), 2)
  return format(data, 'yyyy-MM-dd')
}

export function formatarData(data: string): string {
  return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatarDataCurta(data: string): string {
  return format(new Date(data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
}

export function followUpAtrasado(data?: string): boolean {
  if (!data) return false
  return isAfter(new Date(), new Date(data + 'T00:00:00'))
}

export function renovacaoProxima(dataVencimento?: string): boolean {
  if (!dataVencimento) return false
  const meses = differenceInMonths(new Date(dataVencimento + 'T00:00:00'), new Date())
  return meses >= 0 && meses <= 6
}

export function diasAtraso(data?: string): number {
  if (!data) return 0
  const diff = new Date().getTime() - new Date(data + 'T00:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
