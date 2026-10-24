import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { fileHandler } from './handler.ts';
// Secrets stay in Supabase's managed function environment; never return or log them.
const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
const key=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!key)throw new Error('Supabase function secret is unavailable');
const admin=createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(fileHandler({
 async authenticate(token){const {data,error}=await admin.auth.getUser(token);return error||!data.user?null:{id:data.user.id};},
 async isAdmin(id){const [r,a,u]=await Promise.all([admin.from('user_roles').select('role').eq('user_id',id).maybeSingle(),admin.from('account_states').select('status').eq('user_id',id).maybeSingle(),admin.auth.admin.getUserById(id)]);return !r.error&&!a.error&&!u.error&&r.data?.role==='admin'&&a.data?.status==='active'&&!!u.data.user.email_confirmed_at;},
 async canReview(id,resourceId){const {data,error}=await admin.rpc('review_pdf_path',{p_resource:resourceId,p_reviewer:id});return !error&&typeof data==='string'&&data.length>0;},
 async resource(id){
  const {data:r,error}=await admin.from('resources').select('id,author_id,source_kind,status,storage_path,course_id').eq('id',id).maybeSingle();if(error||!r)return null;
  const {data:c}=await admin.from('courses').select('is_active,university_id').eq('id',r.course_id).maybeSingle();const {data:u}=c?await admin.from('universities').select('is_active').eq('id',c.university_id).maybeSingle():{data:null};return {...r,course_active:c?.is_active===true&&u?.is_active===true};
 },
 async download(path){const {data,error}=await admin.storage.from('course-pdfs').download(path);return error?null:data;},
 async finalize(id,author){const {error}=await admin.rpc('finalize_pdf_checked',{p_resource:id,p_author:author});return !error;},
 async sign(path){const {data,error}=await admin.storage.from('course-pdfs').createSignedUrl(path,60,{download:true});return error?null:data?.signedUrl||null;},
}));
