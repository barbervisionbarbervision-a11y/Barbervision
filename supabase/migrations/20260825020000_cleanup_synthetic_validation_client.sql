begin;

-- Limpeza auditável do único cliente sintético criado durante a validação
-- hospedada. As três condições evitam atingir um cadastro real por engano.
delete from public.clientes
where id = '945ffed9-783a-4ff6-a33e-dace675ca987'::uuid
  and barbearia_id = '8cc72f6b-e440-40ec-9e98-50d775cbea21'::uuid
  and email_normalizado = 'teste.atualizado@barbervision.invalid';

commit;
