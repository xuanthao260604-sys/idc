import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { projectRoot } from './project-root.js';
import { defaultDeck } from './deck-store.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const {registry}=loadRuntimeCatalog();
const load=(p:string)=>JSON.parse(readFileSync(join(projectRoot,p),'utf8'));
const manifest={cards:['classic-10','classic-10b','classic-10c','classic-10d','classic-10e'].flatMap(batch=>load(`data/import/${batch}.manifest.json`).cards)} as {cards:{passcode:string;konamiId:number;expectedName:string}[]};
function step(s:DuelState,actorId:string,action:EngineAction){const result=applyAction(registry,s,{actorId,expectedStateVersion:s.stateVersion,action});if(!result.accepted)throw new Error(result.message);return result.state;}
function settle(s:DuelState){for(let n=0;s.timing.window!=='open';n++){if(n>4)throw new Error('Response did not settle');s=step(s,s.timing.priorityPlayer!,{type:'pass'});}return s;}
describe('Fifty sourced expansion normal monsters through summon and battle transitions',()=>{
  it.each(manifest.cards)('$expectedName uses reviewed tribute count and printed ATK for direct battle damage',entry=>{
    const proof=load(`data/evidence/konami/${entry.konamiId}.json`), requiredIds=[`official:${entry.passcode}`,'official:05053103','official:91152256'],
      deck=[...requiredIds,...defaultDeck(registry).filter(id=>!requiredIds.includes(id))].slice(0,40);
    expect(deck).toContain(`official:${entry.passcode}`);
    const s=structuredClone(createDuel(registry,{duelId:'classic10',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:'a',seedHex:'23'.repeat(32)}).state) as Mutable<DuelState>;
    s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
    const take=(definitionId:string)=>{const p=s.players[0],card=Object.values(s.cards).find(c=>c.ownerId==='a'&&c.definition.id===definitionId&&['hand','deck'].includes(c.location.kind))!;const list=card.location.kind==='hand'?p.hand:p.deck;list.splice(list.indexOf(card.id),1);return card;};
    const source=take(`official:${entry.passcode}`);s.players[0].hand.push(source.id);source.location={kind:'hand',playerId:'a'};
    const tributes:string[]=[];
    for(const [index,id] of ['official:05053103','official:91152256'].entries()){
      const c=take(id),slot=(index+1) as Slot;s.players[0].monsters[slot]=c.id;c.location={kind:'monster',playerId:'a',slot};c.position='face-up-attack';tributes.push(c.id);
    }
    const required=proof.currentFacts.level<=4?0:proof.currentFacts.level<=6?1:2;
    const wrong=applyAction(registry,s,{actorId:'a',expectedStateVersion:s.stateVersion,action:{type:'normal-summon',instanceId:source.id,slot:0,tributeIds:required?[]:[tributes[0]!]}});
    expect(wrong.accepted).toBe(false);expect(wrong.state).toBe(s);
    let done=settle(step(s,'a',{type:'normal-summon',instanceId:source.id,slot:0,tributeIds:tributes.slice(0,required)}));
    expect(done.players[0].monsters[0]).toBe(source.id);expect(done.players[0].graveyard).toHaveLength(required);
    done=settle(step(done,'a',{type:'request-phase',phase:'battle'}));
    done=settle(step(done,'a',{type:'declare-attack',attackerId:source.id,targetId:'direct'}));
    expect(done.players[1].lifePoints).toBe(8000-proof.currentFacts.attack);assertDuelInvariants(done,registry);
  });
});
