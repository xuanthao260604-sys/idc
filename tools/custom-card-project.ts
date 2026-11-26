import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mkdir,open,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';

const revision=z.number().int().nonnegative().safe();
const label=z.string().max(120).refine(s=>s.trim().length>0,'Tên không được trống.');
const asset=z.strictObject({id:z.uuid(),mime:z.enum(['image/png','image/jpeg','image/webp']),sha256:z.string().regex(/^[a-f0-9]{64}$/),bytes:z.number().int().positive().max(8*1024*1024),width:z.number().int().positive().max(8192),height:z.number().int().positive().max(8192)});
const customId=z.string().refine(s=>s.startsWith('custom:')&&z.uuid().safeParse(s.slice(7)).success,'ID phải là custom:UUID.');
const fields={id:customId,origin:z.literal('custom'),kind:z.literal('normal-monster'),name:label,text:z.string().max(10000),attribute:z.enum(['DARK','LIGHT','EARTH','WATER','FIRE','WIND','DIVINE']),race:label,level:z.number().int().min(1).max(12),attack:z.number().int().min(0).max(99999),defense:z.number().int().min(0).max(99999),artwork:z.strictObject({assetId:z.uuid(),rights:z.enum(['owned','permission','licensed'])}).optional()};
const inputCard=z.strictObject(fields),storedCard=z.strictObject({...fields,revision:revision.refine(n=>n>0)});
function checkReferences(p:{cards:readonly {id:string;artwork?:{assetId:string}|undefined}[];assets:readonly {id:string}[]},ctx:z.RefinementCtx){
 if(new Set(p.cards.map(c=>c.id)).size!==p.cards.length)ctx.addIssue({code:'custom',message:'ID bài trùng.'});
 if(new Set(p.assets.map(a=>a.id)).size!==p.assets.length)ctx.addIssue({code:'custom',message:'ID ảnh trùng.'});
 for(const c of p.cards)if(c.artwork&&!p.assets.some(a=>a.id===c.artwork!.assetId))ctx.addIssue({code:'custom',message:'Thiếu metadata ảnh được tham chiếu.'});
}
const inputSchema=z.strictObject({title:label,cards:z.array(inputCard).max(500),assets:z.array(asset).max(500)}).superRefine(checkReferences);
export const CustomProjectSchema=z.strictObject({schemaVersion:z.literal(1),projectId:z.uuid(),revision,retiredIds:z.array(customId).max(5000),title:label,cards:z.array(storedCard).max(500),assets:z.array(asset).max(500)}).superRefine(checkReferences).superRefine((p,ctx)=>{if(new Set(p.retiredIds).size!==p.retiredIds.length||p.cards.some(c=>p.retiredIds.includes(c.id)))ctx.addIssue({code:'custom',message:'ID bài đã xóa không được dùng lại.'});});
export type CustomProject=z.infer<typeof CustomProjectSchema>;
export type CustomProjectInput=z.infer<typeof inputSchema>;
type Result={ok:true;project:CustomProject}|{ok:false;reason:'invalid-input'|'conflict'|'storage-error';message:string};
const ownFrozen=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const v of Object.values(value))ownFrozen(v);Object.freeze(value);}return value;};
export const CUSTOM_PROJECT_IMPORT_LIMIT=2*1024*1024;
/** Authoring metadata only. Does not resolve/read image files or grant runtime capability. */
export function parseCustomProject(text:string):CustomProject {
 if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>CUSTOM_PROJECT_IMPORT_LIMIT)throw Error('File dự án vượt 2 MiB.');
 return ownFrozen(CustomProjectSchema.parse(JSON.parse(text)));
}
export function exportCustomProject(project:unknown):string {return JSON.stringify(CustomProjectSchema.parse(project),null,2)+'\n';}
const content=(c:z.infer<typeof storedCard>)=>{const{revision:ignored,...rest}=c;return rest;};
/** Directory is trusted local startup configuration, never an imported/HTTP path.
 * Separate file from deck A/B. One writer lock, temp+sync+rename, then memory commit.
 */
export function createCustomProjectStore(directory?:string,expectedProjectId?:string){
 if(expectedProjectId!==undefined)z.uuid().parse(expectedProjectId);
 const path=directory?join(directory,'custom-project.json'):undefined;
 const read=()=>{try{const bytes=readFileSync(path!);if(bytes.byteLength>CUSTOM_PROJECT_IMPORT_LIMIT)throw Error('File too large');const p=parseCustomProject(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(p.revision===0)throw Error('Invalid persisted revision');return p;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw Error('Không đọc được dự án đã lưu; giữ nguyên file để kiểm tra.');}};
 let current:CustomProject=path?(read()??ownFrozen({schemaVersion:1,projectId:expectedProjectId??randomUUID(),revision:0,retiredIds:[],title:'Bộ bài riêng',cards:[],assets:[]})):ownFrozen({schemaVersion:1,projectId:expectedProjectId??randomUUID(),revision:0,retiredIds:[],title:'Bộ bài riêng',cards:[],assets:[]});
 if(expectedProjectId!==undefined&&current.projectId!==expectedProjectId)throw Error('Sai projectId; giữ nguyên dự án.');
 let queue=Promise.resolve();
 const commit=(expectedRevision:number,input:unknown,projectId?:string,importedRetired:readonly string[]=[]):Promise<Result>=>{
  // Parse/copy before enqueue: later caller mutation cannot change a pending save.
  const parsed=inputSchema.safeParse(input);const validRevision=revision.safeParse(expectedRevision);
  if(!parsed.success||!validRevision.success)return Promise.resolve({ok:false,reason:'invalid-input',message:'Dữ liệu dự án không hợp lệ; giữ bản đã lưu.'});
  const candidate=parsed.data;
  const operation=queue.then(async():Promise<Result>=>{
   if(expectedRevision!==current.revision||(projectId!==undefined&&projectId!==current.projectId))return{ok:false,reason:'conflict',message:'Dự án đã đổi hoặc khác projectId; tải lại trước khi lưu.'};
   if(current.revision===Number.MAX_SAFE_INTEGER)return{ok:false,reason:'conflict',message:'Revision đã hết miền số an toàn.'};
   const retiredIds=[...new Set([...current.retiredIds,...importedRetired,...current.cards.filter(c=>!candidate.cards.some(n=>n.id===c.id)).map(c=>c.id)])];
   if(retiredIds.length>5000||candidate.cards.some(c=>retiredIds.includes(c.id)))return{ok:false,reason:'conflict',message:'ID bài đã xóa không được dùng lại; tạo bản sao với ID mới.'};
   const cards=candidate.cards.map(c=>{const previous=current.cards.find(p=>p.id===c.id);const same=previous&&JSON.stringify(content(previous))===JSON.stringify(c);return{...c,revision:previous?(same?previous.revision:previous.revision+1):1};});
   if(cards.some(c=>!Number.isSafeInteger(c.revision)))return{ok:false,reason:'conflict',message:'Revision bài đã hết miền số an toàn.'};
   const next=ownFrozen(CustomProjectSchema.parse({schemaVersion:1,projectId:current.projectId,revision:current.revision+1,retiredIds,...candidate,cards}));
   // Enforce the same envelope limit for local save and exported/imported snapshots.
   const serialized=exportCustomProject(next);if(Buffer.byteLength(serialized,'utf8')>CUSTOM_PROJECT_IMPORT_LIMIT)return{ok:false,reason:'invalid-input',message:'Dự án vượt 2 MiB; giữ bản đã lưu.'};
   if(path){
    let lock:Awaited<ReturnType<typeof open>>|undefined;const lockPath=path+'.lock',temp=path+'.tmp-'+randomUUID();
    try{
     await mkdir(directory!,{recursive:true});
     try{lock=await open(lockPath,'wx');}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')return{ok:false,reason:'conflict',message:'Dự án đang được ghi; thử lại sau.'};throw e;}
     const disk=read();if((disk?.revision??0)!==current.revision||(disk&&JSON.stringify(disk)!==JSON.stringify(current)))return{ok:false,reason:'conflict',message:'File đã đổi ngoài cửa sổ này; mở lại dự án.'};
     const handle=await open(temp,'wx');try{await handle.writeFile(serialized,'utf8');await handle.sync();}finally{await handle.close();}
     await rename(temp,path);
    }catch{return{ok:false,reason:'storage-error',message:'Không lưu được dự án; bản cũ được giữ nguyên.'};}
    finally{await rm(temp,{force:true}).catch(()=>{});if(lock){await lock.close().catch(()=>{});await rm(lockPath,{force:true}).catch(()=>{});}}
   }
   current=next;return{ok:true,project:current};
  });
  queue=operation.then(()=>{},()=>{});return operation;
 };
 return{
  get:()=>current,
  export:()=>exportCustomProject(current),
  replace:(expectedRevision:number,input:unknown)=>commit(expectedRevision,input),
  importText(expectedRevision:number,text:string):Promise<Result>{
   let imported:CustomProject;try{imported=parseCustomProject(text);}catch{return Promise.resolve({ok:false,reason:'invalid-input',message:'File nhập lỗi; giữ nguyên dự án và deck.'});}
   return commit(expectedRevision,{title:imported.title,cards:imported.cards.map(content),assets:imported.assets},imported.projectId,imported.retiredIds);
  },
 };
}
