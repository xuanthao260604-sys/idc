import { describe,it,expect } from 'vitest';
import { boundedRegistry as registry,buildBoundedLive } from './fixtures/bounded-live.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { applyAction } from '../packages/engine/src/duel.js';
import { createPlayerProjection } from '../packages/engine/src/player-view.js';
import { loadRuntimeCatalog } from './runtime-catalog.js';
const secrets=['bounded-counter-resolution-frame-v1','reviewSha256','integritySha256','originSequence','sourceAtActivation','survivingSourceIds'];
describe('explicit v6 adapter discovery/projection/receipt boundaries',()=>{
 it.each(['a','b'])('discovers the eighth link and keeps retries/handles private for %s',actor=>{
  const other=actor==='a'?'b':'a',owners=[actor,other,actor,other,actor,other];
  const f=buildBoundedLive({actor,spellId:'official:55144522',owners,activateSevenCount:5}),room=createCommandAdapter(registry,f.state);let serial=0;
  const command=(who:string,action:unknown)=>{const v=room.getView(who);return{commandId:'bounded-'+ ++serial,duelId:v.duelId,expectedStateVersion:v.stateVersion,action};};
  const view=room.getView(other),offered=room.getView(other,true),plan=offered.availableActions!.find(a=>a.type==='activate-lp-counter-trap');
  expect(room.getView(other)).toEqual(view);expect(plan).toBeDefined();if(plan?.type!=='activate-lp-counter-trap')throw Error('Missing eighth discovery');
  expect(plan.chainHandle).toBe(offered.chain.at(-1)!.chainHandle);const stale=command(other,plan);room.refreshView(other);
  expect(room.submit(other,stale).accepted).toBe(false);const fresh=room.getView(other,true),next=fresh.availableActions!.find(a=>a.type==='activate-lp-counter-trap')!;
  const cmd=command(other,next),receipt=room.submit(other,cmd);expect(receipt.accepted).toBe(true);const after=room.getView(other);expect(after.chain).toHaveLength(8);
  expect(room.submit(other,cmd)).toEqual(receipt);expect(room.getView(other)).toEqual(after);
  for(let i=0;i<2;i++){const who=room.getView(actor).timing.priorityPlayer!;expect(room.submit(who,command(who,{type:'pass'})).accepted).toBe(true);}
  for(let i=0;i<3&&room.getView(actor).chain.length;i++){
   for(const who of [actor,other]){const v=room.getView(who,true);for(const s of secrets)expect(JSON.stringify(v)).not.toContain(s);expect(v.chain.every(l=>l.resolved&&l.targetHandles.length===0)).toBe(true);}
   const who=[actor,other].find(p=>room.getView(p).decision)!,d=room.getView(who).decision!;
   const answer=command(who,{type:'answer-decision',decisionId:d.id,optionIds:[...d.optionIds].reverse()}),r=room.submit(who,answer);expect(r.accepted).toBe(true);const done=room.getView(who);expect(room.submit(who,answer)).toEqual(r);expect(room.getView(who)).toEqual(done);
  }
  expect(room.getView(actor).chain).toEqual([]);expect(room.getView(actor).activity).toEqual(room.getView(other).activity);
 });
 it.each(['a','b'])('hides a returned graveyard target from both resolved chain projections for %s',actor=>{
  const f=buildBoundedLive({actor,spellId:'official:74848038',owners:[actor,actor==='a'?'b':'a',actor,actor==='a'?'b':'a',actor]});let state=f.state;
  for(let i=0;i<2;i++){const r=applyAction(registry,state,{actorId:state.timing.priorityPlayer!,expectedStateVersion:state.stateVersion,action:{type:'pass'}});expect(r.accepted).toBe(true);state=r.state;}
  expect(state.boundedCounterResolution?.stage).toBe('cleanup');expect(state.cards[f.rootTarget!]!.location.kind).toBe('hand');
  for(const p of state.players){const v=createPlayerProjection(registry,state,p.id).view;expect(v.chain.every(l=>l.resolved&&l.targetHandles.length===0)).toBe(true);expect(JSON.stringify(v)).not.toContain(f.rootTarget!);for(const s of secrets)expect(JSON.stringify(v)).not.toContain(s);}
 });
 it.each([999,1000,1001])('charges only a payable activation at LP %s',lp=>{
  const f=buildBoundedLive({owners:['a'],activateSevenCount:0,lp:{a:lp,b:9001}}),s=f.state,source=f.sevenIds.a![0]!,before=structuredClone(s);
  const r=applyAction(registry,s,{actorId:'a',expectedStateVersion:s.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:source,respondingToLinkId:s.chain.at(-1)!.id}});
  expect(r.accepted).toBe(lp>1000);expect(s).toEqual(before);
  if(r.accepted){expect(r.state.players[0].lifePoints).toBe(1);expect(r.events.filter(e=>e.kind==='life-points-paid')).toHaveLength(1);}else{expect(r.state).toBe(s);expect(s.cards[source]!.position).toBe('face-down');}
 });
 it('keeps default runtime v5 and legacy state ABI unchanged',()=>{const {registry:r}=loadRuntimeCatalog();expect(r.counterContinuations['official:03819470']).toBe('reviewed-four-link-counter-patterns-v5');expect(r.boundedCounterReview).toBeUndefined();});
});
