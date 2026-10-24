from pathlib import Path
import json,uuid,secrets,hashlib,datetime
base=Path('/workspace/scratch/material-import-20261024');v=json.loads((base/'validated-pack.json').read_text())
owner='bd95dec2-336c-4611-9076-2ba0850fe86b';courses={'capital-ai-310':'90058900-bf71-4866-8bac-a6b7d9cf7b97','capital-ai-320':'6cf5d845-8dd2-4fa2-b108-cbb7eb36b57f','capital-ai-330':'0d973a92-5bed-4874-895a-76c316c534db','capital-cs-471':'a65df0e6-91cb-4222-a27d-53856d746afa','capital-is-312':'b1554981-9231-429a-bf38-bf5b53987125','capital-is-365':'99a72378-ffbb-4d6a-9a2f-df0842a5fd03'}
namespace=uuid.UUID('8f682250-6b20-49ac-a529-e831c6c00845')
for f in v['files']:
 f['course_id']=courses[f['course_slug']];f['id']=str(uuid.uuid5(namespace,f['course_slug']+'/'+f['sha256']));f['topic_id']=str(uuid.uuid5(namespace,f['course_slug']+'/topic/'+f['topic'].casefold()))if f['topic'] else None;f['storage_path']=owner+'/'+f['id']+'.pdf';f['public_url']='https://elzatona.tech/courses/'+f['course_slug']+'/resources/'+f['id']
plan={'batch':'materials-20261024-a8d01ba9','owner_id':owner,'archive_sha256':v['archive_sha256'],'files':v['files']};(base/'import-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
cap=secrets.token_urlsafe(32);secret=base/'capability.txt';secret.write_text(cap);secret.chmod(0o600)
config={'ownerId':owner,'capabilityHash':hashlib.sha256(cap.encode()).hexdigest(),'expiresAt':int((datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=60)).timestamp()*1000),'files':{f['id']:{'sha256':f['sha256'],'size':f['size'],'courseId':f['course_id'],'topicId':f['topic_id']}for f in v['files']}}
(base/'function-config.json').write_text(json.dumps(config,indent=2)+'\n')
print('Prepared deterministic identifiers for',len(v['files']),'files and',len({f['topic_id']for f in v['files']if f['topic_id']}),'topics; no credentials printed.')
