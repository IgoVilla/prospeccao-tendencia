-- =============================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- Dashboard > SQL Editor > New Query
-- =============================================

-- Tabela de atividades da linha do tempo
CREATE TABLE IF NOT EXISTS pt_atividades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id       UUID NOT NULL,
  cliente_id      TEXT NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio')),
  status          TEXT NOT NULL CHECK (status IN ('Atendeu', 'Nao atendeu', 'Agendou', 'Recusou')),
  comentario      TEXT,
  follow_up_data  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de metadados do cliente (dados que não vêm da Nexi)
CREATE TABLE IF NOT EXISTS pt_clientes_meta (
  cliente_id               TEXT PRIMARY KEY,
  agente_id                UUID NOT NULL,
  concorrente_atual        TEXT,
  data_vencimento_contrato DATE,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security: cada agente só vê seus próprios dados
ALTER TABLE pt_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pt_clientes_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agente_ve_proprias_atividades" ON pt_atividades
  FOR ALL USING (agente_id = auth.uid());

CREATE POLICY "agente_ve_proprios_metas" ON pt_clientes_meta
  FOR ALL USING (agente_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atividades_cliente ON pt_atividades (cliente_id);
CREATE INDEX IF NOT EXISTS idx_atividades_agente ON pt_atividades (agente_id);
CREATE INDEX IF NOT EXISTS idx_atividades_follow_up ON pt_atividades (follow_up_data);
