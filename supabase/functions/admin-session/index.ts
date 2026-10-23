import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key)throw new Error('Function credentials unavailable');
const url=Deno.env.get('SUPABASE_URL')!;const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const publishable=Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}'))[0] as string|undefined||Deno.env.get('SUPABASE_ANON_KEY');
const reply=(status:number,body:Record<string,unknown>)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
Deno.serve(async request=>{
 if(request.method!=='POST')return reply(405,{error:'method_not_allowed'});
 try{const text=await request.text();if(text.length>2048)return reply(413,{error:'invalid_login'});const input=JSON.parse(text);if(typeof input.username!=='string'||!/^[a-z][a-z0-9_]{2,29}$/.test(input.username)||typeof input.password!=='string'||input.password.length<1||input.password.length>128)return reply(400,{error:'invalid_login'});
 // Use the gateway address, never a client-supplied body field, for the login budget.
 const address=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')||'gateway';
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.username+'|'+address));const budget=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 const {data:id,error}=await admin.rpc('admin_login_identity',{p_username:input.username,p_key:budget});if(error||!id)return reply(401,{error:'invalid_login'});
 const user=await admin.auth.admin.getUserById(id);if(user.error||!user.data.user.email||!publishable)return reply(401,{error:'invalid_login'});
 const auth=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});const result=await auth.auth.signInWithPassword({email:user.data.user.email,password:input.password});if(result.error||result.data.user?.id!==id||!result.data.session)return reply(401,{error:'invalid_login'});
 const role=await auth.rpc('is_admin');if(role.error||role.data!==true){await auth.auth.signOut();return reply(401,{error:'invalid_login'});}
 return reply(200,{session:{access_token:result.data.session.access_token,refresh_token:result.data.session.refresh_token}});
 }catch{return reply(400,{error:'invalid_login'});}
});
