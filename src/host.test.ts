import { describe, expect, it } from 'vitest';
import { FixtureHostAuthenticator } from './auth/host-auth';
import { AFFINE_ACCESS_REQUEST, affineBlock, fixtureBlock } from './blocks';
import { BlockRegistry, can, cleanupBlockMount, compareSemanticReadback, runBlockLifecycle, workspaceMatches, type DonorSemanticReadback, type HostAccessPort, type HostAccessReadback, type HostAssertionClaims, type RuntimeBindings } from './host';
import { HostBlockRegistry } from './registry/host-registry';
import { BaseSessionAuthority } from './session/host-session';
import { HostTenancyDirectory, workspaceIdFromPath, workspacePath } from './tenancy/workspace-selection';

describe('host contracts', () => {
  const ctx = {tenantId:'t',workspaceId:'w',principalId:'p',principalKind:'employee' as const,teamIds:[],clientAccountIds:[],correlationId:'c'};
  const bindings: RuntimeBindings = {apiBaseUrl:'https://backend.test', identity:{issue:async()=> 'token'},data:{postgresSchema:'knowledge'},tokens:{resolve:()=>({})},ports:{emit:async()=>{},command:async()=>({ok:false})}};
  const accessReadback = (overrides: Partial<HostAccessReadback> = {}): HostAccessReadback => ({authenticated:true,assertionPresent:true,issuer:'actionist-base',audience:AFFINE_ACCESS_REQUEST.audience,clientId:AFFINE_ACCESS_REQUEST.clientId,sessionId:'session',principalId:ctx.principalId,principalKind:ctx.principalKind,tenantId:ctx.tenantId,workspaceId:ctx.workspaceId,capabilities:[...AFFINE_ACCESS_REQUEST.requiredCapabilities],issuedAt:new Date(Date.now()-1_000).toISOString(),expiresAt:new Date(Date.now()+60_000).toISOString(),...overrides});
  const access: HostAccessPort = {issue:async(_context,request)=>({assertion:'signed',readback:accessReadback({audience:request.audience,clientId:request.clientId,capabilities:[...request.requiredCapabilities]})})};
  const semanticReadback = (expected: HostAccessReadback, overrides: Partial<DonorSemanticReadback> = {}): DonorSemanticReadback => ({authenticated:true,issuer:expected.issuer,audience:expected.audience,clientId:expected.clientId,principalId:expected.principalId,tenantId:expected.tenantId,workspaceId:expected.workspaceId,capabilities:[...expected.capabilities],expiresAt:expected.expiresAt,...overrides});
  it('rejects route and id conflicts', () => { const r = new BlockRegistry(); r.register(fixtureBlock); expect(() => r.register({...fixtureBlock, id:'other'})).toThrow('route conflict'); expect(() => r.register(fixtureBlock)).toThrow('block conflict'); });
  it('denies capabilities by default and checks workspace ownership', () => { expect(can(ctx,'knowledge.view',{})).toBe(false); expect(workspaceMatches('other',ctx)).toBe(false); });
  it('runs preload before mount and invokes cleanup', async () => { const order:string[]=[]; const b = {...fixtureBlock, preload:async()=>{order.push('preload')}, mount:async(el:HTMLElement)=>{order.push('mount'); el.textContent='mounted'; return ()=>{order.push('unmount');}}}; const el=document.createElement('div'); const cleanup=await runBlockLifecycle(b,el,ctx,bindings,()=>{}); expect(order).toEqual(['preload','mount']); await cleanup(); expect(order).toEqual(['preload','mount','unmount']); });
  it('does not mount a lifecycle run that becomes stale before mount', async () => { let active = true; let mounted = false; const b = {...fixtureBlock, preload:async()=>{active = false}, mount:async()=>{mounted = true; return ()=>{}}}; await runBlockLifecycle(b,document.createElement('div'),ctx,bindings,()=>{},()=>active); expect(mounted).toBe(false); });
  it('skips mount when health is unavailable', async () => { let mounted=false; const b={...fixtureBlock,health:async()=>({status:'unavailable' as const}),mount:async()=>{mounted=true;return ()=>{}}}; const el=document.createElement('div'); const cleanup=await runBlockLifecycle(b,el,ctx,bindings,()=>{}); await cleanup(); expect(mounted).toBe(false); });
  it('surfaces rejected module/import through lifecycle rejection', async () => { const b={...fixtureBlock,mount:async()=>{throw new Error('configured module failed')}}; await expect(runBlockLifecycle(b,document.createElement('div'),ctx,bindings,()=>{})).rejects.toThrow('configured module failed'); });
  it('reports missing AFFiNE configuration as unavailable', async () => { const b = affineBlock(access, { moduleUrl: '/missing.js', backendBase: '/backend', issuerUrl: '/issuer', expectedClientId: 'bykonz-yard' }); const originalFetch=globalThis.fetch; globalThis.fetch=async()=>new Response('',{status:503}); const h = await b.health?.(ctx, bindings); expect(h?.status).toBe('unavailable'); globalThis.fetch=originalFetch; });
  it('rejects a backend session that does not match the issuer identity', async () => { const originalFetch=globalThis.fetch; globalThis.fetch=async input => String(input).includes('knowledge-context') ? new Response(JSON.stringify({userId:'p',email:'p@example.test',clientId:'bykonz-yard',workspaceId:'w',expiresAt:new Date(Date.now()+60000).toISOString(),capabilities:['view','edit'],token:'signed'}),{status:200}) : new Response(JSON.stringify({user:{id:'other'}}),{status:200}); const h = await affineBlock(access, {moduleUrl:'/module.js',backendBase:'/backend',issuerUrl:'/issuer',expectedClientId:'bykonz-yard'}).health?.(ctx, bindings); expect(h).toEqual({status:'unavailable',detail:'Knowledge backend session mismatch'}); globalThis.fetch=originalFetch; });
  it('rejects a backend workspace read-back that does not match the issuer identity', async () => { const originalFetch=globalThis.fetch; globalThis.fetch=async input => { const url=String(input); if (url.includes('knowledge-context')) return new Response(JSON.stringify({userId:'p',email:'p@example.test',clientId:'bykonz-yard',workspaceId:'w',expiresAt:new Date(Date.now()+60000).toISOString(),capabilities:['view','edit'],token:'signed'}),{status:200}); if (url.includes('/api/auth/session')) return new Response(JSON.stringify({user:{id:'p'}}),{status:200}); return new Response(JSON.stringify({data:{currentUser:{id:'p'},workspace:{id:'other'}}}),{status:200}); }; const h = await affineBlock(access, {moduleUrl:'/module.js',backendBase:'/backend',issuerUrl:'/issuer',expectedClientId:'bykonz-yard'}).health?.(ctx, bindings); expect(h).toEqual({status:'unavailable',detail:'Knowledge backend workspace session mismatch'}); globalThis.fetch=originalFetch; });
  it('passes context and runtime bindings to a configured AFFiNE module', async () => { const originalFetch=globalThis.fetch; globalThis.fetch=async(input)=>String(input).includes('knowledge-context') ? new Response(JSON.stringify({userId:'p',email:'p@example.test',clientId:'bykonz-yard',workspaceId:'w',expiresAt:new Date(Date.now()+60000).toISOString(),capabilities:['view','edit'],token:'signed'}),{status:200}) : new Response('{}',{status:200}); const seen:{options?:unknown}={}; const url='data:text/javascript,'+encodeURIComponent('export async function mount(target, options){ globalThis.__seen=options; target.textContent="ok"; return ()=>{} }'); const b=affineBlock(access, {moduleUrl:url,backendBase:'https://backend.test',issuerUrl:'/issuer',expectedClientId:'bykonz-yard'}); const el=document.createElement('div'); const cleanup=await b.mount(el,ctx,bindings); seen.options=(globalThis as {__seen?:unknown}).__seen; await cleanup(); expect(seen.options).toMatchObject({host:{identity:{workspaceId:'w'},database:{config:{schema:'knowledge'}},tokens:{sisoRequestContext:'signed'}},context:ctx,backendBase:'https://backend.test'}); globalThis.fetch=originalFetch; });
  it('waits for donor unmount before clearing its DOM', async () => { const order:string[]=[]; const el=document.createElement('div'); el.innerHTML='<div>mounted</div>'; await cleanupBlockMount(el, async()=>{ order.push(`unmount:${el.childElementCount}`); }); order.push(`cleared:${el.childElementCount}`); expect(order).toEqual(['unmount:1','cleared:0']); });
  it('fixture block cleans up its mount', async () => { const el = document.createElement('div'); const unmount = await fixtureBlock.mount(el, {} as never, {} as never); expect(el.querySelector('[data-verify="fixture-block"]')).toBeTruthy(); await unmount(); expect(el.childElementCount).toBe(0); });

  it('keeps an unconfigured AFFiNE adapter fail-closed and unavailable', async () => {
    const block = affineBlock(undefined, {moduleUrl:'/module.js',backendBase:'/backend',issuerUrl:'/issuer',expectedClientId:'bykonz-yard'});
    await expect(block.preload?.(ctx, bindings)).resolves.toBeUndefined();
    await expect(block.health?.(ctx, bindings)).resolves.toEqual({status:'unavailable',detail:'Base access port is not configured'});
  });

  it('authenticates and selects only predeclared Base fixture identities and memberships', async () => {
    const principal = {principalId:'p',principalKind:'employee' as const,displayName:'Fixture principal',teamIds:[],clientAccountIds:[]};
    const authenticator = new FixtureHostAuthenticator([principal]);
    await expect(authenticator.login({principalId:'p'})).resolves.toMatchObject(principal);
    await expect(authenticator.login({principalId:'other'})).rejects.toMatchObject({code:'AUTHENTICATION_DENIED'});
    const tenancy = new HostTenancyDirectory([{principalId:'p',tenantId:'t',workspaceId:'w',workspaceName:'Workspace',capabilities:['knowledge.view']}]);
    expect(tenancy.list('p')).toEqual([{tenantId:'t',workspaceId:'w',workspaceName:'Workspace',capabilities:['knowledge.view']}]);
    expect(() => tenancy.select('p', 't', 'other')).toThrow('Base workspace selection denied');
    expect(workspaceIdFromPath('/w/w/knowledge')).toBe('w');
    expect(workspaceIdFromPath('/w/%2F/knowledge')).toBeNull();
    expect(workspacePath('w', '/knowledge')).toBe('/w/w/knowledge');
  });

  it('denies a mismatched session context before invoking the assertion issuer', async () => {
    const issued: HostAssertionClaims[] = [];
    const authority = new BaseSessionAuthority({
      issuer:'actionist-base',
      policies:[{audience:AFFINE_ACCESS_REQUEST.audience,clientId:AFFINE_ACCESS_REQUEST.clientId,capabilities:AFFINE_ACCESS_REQUEST.requiredCapabilities,accessTtlMs:30_000}],
      issueAssertion:async claims=>{issued.push(claims);return 'signed';},
      now:()=>Date.parse('2026-08-30T10:00:00.000Z'),
      createSessionId:()=> ' session ',
      sessionTtlMs:60_000,
    });
    const session = authority.login(
      {principalId:'p',principalKind:'employee',teamIds:[],clientAccountIds:[]},
      {tenantId:'t',workspaceId:'w',workspaceName:'Workspace',capabilities:['knowledge.view','knowledge.edit']},
    );
    const port = authority.accessPort(session.sessionId);
    await expect(port.issue({...ctx,workspaceId:'other'}, AFFINE_ACCESS_REQUEST)).rejects.toMatchObject({code:'SCOPE_DENIED'});
    expect(issued).toHaveLength(0);
    const grant = await port.issue(ctx, AFFINE_ACCESS_REQUEST);
    expect(grant.readback).toMatchObject({sessionId:'session',principalId:'p',tenantId:'t',workspaceId:'w',audience:AFFINE_ACCESS_REQUEST.audience,clientId:AFFINE_ACCESS_REQUEST.clientId});
    expect(grant.readback.expiresAt).toBe('2026-08-30T10:00:30.000Z');
    expect(grant.readback).not.toHaveProperty('assertion');
    expect(issued).toHaveLength(1);
  });

  it('sanitizes assertion issuer failures and denies invalid access policy inputs', async () => {
    const authority = new BaseSessionAuthority({
      issuer:'actionist-base',
      policies:[{audience:AFFINE_ACCESS_REQUEST.audience,clientId:AFFINE_ACCESS_REQUEST.clientId,capabilities:AFFINE_ACCESS_REQUEST.requiredCapabilities}],
      issueAssertion:async()=>{throw new Error('provider detail must not escape');},
      createSessionId:()=> 'session',
    });
    const session = authority.login(
      {principalId:'p',principalKind:'employee',teamIds:[],clientAccountIds:[]},
      {tenantId:'t',workspaceId:'w',workspaceName:'Workspace',capabilities:['knowledge.view','knowledge.edit']},
    );
    await expect(authority.issueAccess(session.sessionId, AFFINE_ACCESS_REQUEST)).rejects.toMatchObject({code:'ASSERTION_ISSUE_FAILED',message:'Base assertion issue failed'});
    await expect(authority.issueAccess(session.sessionId, {...AFFINE_ACCESS_REQUEST,audience:'other'})).rejects.toMatchObject({code:'AUDIENCE_DENIED'});
    await expect(authority.issueAccess(session.sessionId, {...AFFINE_ACCESS_REQUEST,clientId:'other'})).rejects.toMatchObject({code:'CLIENT_DENIED'});
    await expect(authority.issueAccess(session.sessionId, {...AFFINE_ACCESS_REQUEST,requiredCapabilities:['knowledge.admin']})).rejects.toMatchObject({code:'CAPABILITY_DENIED'});
  });

  it('keeps installed navigation and route resolution capability-gated', () => {
    const registry = new HostBlockRegistry();
    registry.install({
      block:fixtureBlock,
      navigation:{id:'fixture',label:'Fixture',route:fixtureBlock.route,blockId:fixtureBlock.id,groupId:'capabilities',groupLabel:'Capabilities'},
      requiredCapabilities:[fixtureBlock.capability],
    });
    expect(registry.navigationGroups([])).toEqual([]);
    expect(registry.resolve('/fixture')).toBeUndefined();
    expect(registry.resolve('/fixture/detail', [fixtureBlock.capability])?.id).toBe(fixtureBlock.id);
    expect(registry.navigationGroups([fixtureBlock.capability])[0]?.items[0]).toMatchObject({blockId:fixtureBlock.id});
    expect(registry.uninstall(fixtureBlock.id)?.block.id).toBe(fixtureBlock.id);
    expect(registry.resolve('/fixture', [fixtureBlock.capability])).toBeUndefined();
  });

  it('compares structured donor identity, scope, contract, capability, and expiry readback', () => {
    const expected = accessReadback();
    expect(compareSemanticReadback(expected, semanticReadback(expected))).toEqual({status:'healthy'});
    expect(compareSemanticReadback(expected, semanticReadback(expected, {issuer:'other'})).detail).toContain('issuer');
    expect(compareSemanticReadback(expected, semanticReadback(expected, {audience:'other'})).detail).toContain('audience');
    expect(compareSemanticReadback(expected, semanticReadback(expected, {clientId:'other'})).detail).toContain('client');
    expect(compareSemanticReadback(expected, semanticReadback(expected, {principalId:'other'})).detail).toContain('principal');
    expect(compareSemanticReadback(expected, semanticReadback(expected, {tenantId:'other'})).detail).toContain('tenant');
    expect(compareSemanticReadback(expected, semanticReadback(expected, {workspaceId:'other'})).detail).toContain('workspace');
    expect(compareSemanticReadback(expected, semanticReadback(expected, {capabilities:['knowledge.view']})).detail).toContain('capability');
    expect(compareSemanticReadback(expected, semanticReadback(expected, {expiresAt:new Date(Date.parse(expected.expiresAt)+1).toISOString()})).detail).toContain('expiry');
  });
});
