-- Tabela para enriquecimento de UF/cidade via API CNPJ
-- Executar no SQL Editor do Supabase antes de usar o enriquecimento

create table if not exists pt_clientes_enriquecimento (
  bubble_id     text primary key,
  uf            text not null,
  cidade        text default '',
  atualizado_em timestamptz default now()
);

alter table pt_clientes_enriquecimento enable row level security;

create policy "Allow authenticated"
  on pt_clientes_enriquecimento
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
