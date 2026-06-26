export interface Cliente {
  id: string
  bubble_id: string
  razao_social: string
  cnpj: string
  uf: string
  cidade?: string
  consumo_estimado?: number
  status_atual: string
  responsavel_id: string
  ultimo_contato?: Atividade
  proximo_follow_up?: string
  concorrente_atual?: string
  data_vencimento_contrato?: string
}

export interface Atividade {
  id: string
  agente_id: string
  cliente_id: string
  tipo: 'Ligacao' | 'Email' | 'Reuniao' | 'Proposta' | 'Declinio'
  status: 'Atendeu' | 'Nao atendeu' | 'Agendou' | 'Recusou'
  comentario?: string
  follow_up_data?: string
  created_at: string
}

export interface ClienteMeta {
  cliente_id: string
  agente_id: string
  concorrente_atual?: string
  data_vencimento_contrato?: string
  updated_at: string
}

export interface DadosCnpj {
  ok: boolean
  cnpj: string
  razao_social: string
  nome_fantasia: string
  situacao_cadastral: string
  cnae_principal: string
  logradouro: string
  numero: string
  bairro: string
  cep: string
  municipio: string
  uf: string
  telefone_1?: string
  telefone_2?: string
  email?: string
  socios: Array<{
    nome: string
    qualificacao: string
    faixa_etaria: string
  }>
}

export interface AgenteBubble {
  id: string
  nome: string
  email: string
  token: string
}
