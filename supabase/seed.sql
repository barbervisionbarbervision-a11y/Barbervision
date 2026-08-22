-- Dados estritamente fictícios para desenvolvimento local e testes manuais.
-- Os domínios .invalid são reservados e não recebem e-mail real.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'dono-a@barbervision.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'funcionario-a@barbervision.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'dono-b@barbervision.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'suspenso-a@barbervision.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
on conflict (id) do nothing;

insert into public.perfis (usuario_id, nome)
values
  ('10000000-0000-4000-8000-000000000001', 'Dono A — fictício'),
  ('10000000-0000-4000-8000-000000000002', 'Funcionário A — fictício'),
  ('10000000-0000-4000-8000-000000000003', 'Dono B — fictício'),
  ('10000000-0000-4000-8000-000000000004', 'Usuário suspenso — fictício')
on conflict (usuario_id) do nothing;

insert into public.barbearias (id, nome, slug, status, criado_por)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Barbearia Demo A',
    'barbearia-demo-a',
    'ativa',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Barbearia Demo B',
    'barbearia-demo-b',
    'ativa',
    '10000000-0000-4000-8000-000000000003'
  )
on conflict (id) do nothing;

insert into public.membros_barbearia (
  barbearia_id,
  usuario_id,
  papel,
  status,
  convidado_por
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'dono',
    'ativo',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'funcionario',
    'ativo',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000004',
    'funcionario',
    'suspenso',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    'dono',
    'ativo',
    '10000000-0000-4000-8000-000000000003'
  )
on conflict (barbearia_id, usuario_id) do nothing;

insert into public.clientes (
  id,
  barbearia_id,
  nome,
  whatsapp,
  whatsapp_normalizado,
  observacoes,
  criado_por
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Cliente A1 — fictício',
    '+55 (85) 90000-0001',
    '5585900000001',
    'Atribuído ao funcionário A.',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Cliente A2 — fictício',
    '+55 (85) 90000-0002',
    '5585900000002',
    'Sem atribuição.',
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'Cliente B1 — fictício',
    '+55 (85) 90000-0003',
    '5585900000003',
    'Pertence somente ao tenant B.',
    '10000000-0000-4000-8000-000000000003'
  )
on conflict (id) do nothing;

insert into public.atribuicoes_cliente (
  barbearia_id,
  cliente_id,
  usuario_id,
  atribuido_por
)
values (
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001'
)
on conflict (barbearia_id, cliente_id) do nothing;
