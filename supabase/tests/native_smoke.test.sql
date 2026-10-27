begin;
select plan(3);
select has_extension('vector', 'native Postgres has pgvector');
select is((select '[1,0,0]'::extensions.vector <=> '[1,0,0]'::extensions.vector), 0::double precision, 'native vector distance works');
select is((select count(*) from supabase_migrations.schema_migrations where version = '202610270001'), 1::bigint, 'identity migration was applied');
select * from finish();
rollback;
