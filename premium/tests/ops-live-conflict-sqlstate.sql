do $test$
declare p public.ops_live_publications; code text; result jsonb;
begin
 select * into p from public.ops_live_publications where public.ops_live_authorized(id,owner_id) and last_sequence>0 order by updated_at desc limit 1;
 if p.id is null then raise exception 'No authorized publication available for read regression'; end if;
 begin perform public.ops_live_read(p.id,p.owner_id,1,p.version-1); exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from 'PT409' then raise exception 'Regression: expected PT409, got %',code; end if;
 result:=public.ops_live_read(p.id,p.owner_id,0,null);
 if (result->>'version')::bigint<>p.version or (result->>'closed')::boolean is distinct from (p.closed_at is not null) then raise exception 'Fresh read changed'; end if;
 if jsonb_array_length(result->'points')=0 then raise exception 'GPS points missing'; end if;
 code:=null;
 begin perform public.ops_live_read(p.id,gen_random_uuid(),0,null); exception when others then get stacked diagnostics code=returned_sqlstate; end;
 if code is distinct from '42501' then raise exception 'Unauthorized read permitted'; end if;
end $test$;