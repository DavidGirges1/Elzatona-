export type PdfRecord = {
  id: string; author_id: string; source_kind: string; status: string;
  storage_path: string | null; course_active: boolean;
};
export type FileServices = {
  authenticate(token: string): Promise<{ id: string } | null>;
  isAdmin?(id: string): Promise<boolean>;
  canReview?(id:string,resourceId:string): Promise<boolean>;
  resource(id: string): Promise<PdfRecord | null>;
  download(path: string): Promise<Blob | null>;
  finalize(id: string, author: string): Promise<boolean>;
  sign(path: string): Promise<string | null>;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function fileHandler(services:FileServices){return async(request:Request):Promise<Response>=>{
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(Number(request.headers.get('content-length')||0)>4096)return reply(413,{error:'request_too_large'});
 try{
  const text=await request.text();if(text.length>4096)return reply(413,{error:'request_too_large'});
  const input=JSON.parse(text) as {action?:unknown;resource_id?:unknown};
  if(typeof input.resource_id!=='string'||!uuid.test(input.resource_id)||!['open','finalize','review'].includes(String(input.action)))return reply(400,{error:'invalid_request'});
  let actor:{id:string}|null=null;
  if(input.action==='finalize'||input.action==='review'){
   const auth=request.headers.get('authorization');if(!auth?.startsWith('Bearer '))return reply(401,{error:'sign_in_required'});
   actor=await services.authenticate(auth.slice(7));if(!actor)return reply(401,{error:'sign_in_required'});
  }
  if(input.action==='review'&&!((services.isAdmin&&await services.isAdmin(actor!.id))||(services.canReview&&await services.canReview(actor!.id,input.resource_id))))return reply(403,{error:'not_authorized'});
  const resource=await services.resource(input.resource_id);
  if(!resource||resource.source_kind!=='pdf'||!resource.storage_path||(input.action!=='review'&&!resource.course_active))return reply(404,{error:'resource_unavailable'});
  if(input.action==='open'||input.action==='review'){
   if(input.action==='open'&&resource.status!=='published')return reply(404,{error:'resource_unavailable'});
   const url=await services.sign(resource.storage_path);return url?reply(200,{url,expires_in:60}):reply(503,{error:'file_unavailable'});
  }
  if(resource.author_id!==actor!.id||resource.status!=='pending')return reply(403,{error:'not_authorized'});
  const file=await services.download(resource.storage_path);
  if(!file||file.size<5||file.size>3145728||new TextDecoder().decode(await file.slice(0,5).arrayBuffer())!=='%PDF-')return reply(422,{error:'invalid_pdf'});
  if(!await services.finalize(resource.id,actor!.id))return reply(409,{error:'publication_failed'});
  const updated=await services.resource(resource.id);
  return reply(200,{complete:true,published:updated?.status==='published',submitted:updated?.status==='pending'});
 }catch{return reply(400,{error:'invalid_request'});}
};}
