from pathlib import Path
import fitz,hashlib,json,csv,re,collections
root=Path('/workspace/scratch/material-import-20261024/extracted/Elzatona_Materials')
allowed={'study':{'slides','notes','reference','other'},'solve':{'question_bank','past_exam'}}
rows=[];errors=[];links=0
for p in sorted((root/'courses').rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(root);parts=rel.parts
 if p.suffix.lower()=='.csv':
  with p.open(encoding='utf-8-sig',newline='') as f:
   c=csv.DictReader(f);assert c.fieldnames==['title','url','type','description'],str(rel);ls=list(c);links+=len(ls)
  continue
 if len(parts)!=6 or p.suffix.lower()!='.pdf':errors.append(f'Unexpected path {rel}');continue
 _,course,topic,purpose,kind,filename=parts
 if kind not in allowed.get(purpose,set()):errors.append(f'Invalid category {rel}')
 data=p.read_bytes();title=p.stem
 if not 5<=len(data)<=3145728 or not data.startswith(b'%PDF-'):errors.append(f'Invalid PDF bytes/size {rel}')
 if not 4<=len(title)<=160:errors.append(f'Title length {rel}')
 try:
  doc=fitz.open(p)
  if doc.needs_pass or doc.page_count<1:raise ValueError('Encrypted/empty')
  for page in doc:page.get_text('text')
  sample=doc[0].get_text('text')[:900]
  pages=doc.page_count;doc.close()
 except Exception as e:errors.append(f'Unreadable PDF {rel}: {e}');continue
 m=re.match(r'^(\d+)\s*-\s*(.+)$',topic)
 rows.append({'archive_path':str(rel),'local_path':str(p),'course_slug':course,'topic':None if topic=='_general' else (m[2].strip() if m else topic),'topic_order':int(m[1]) if m else 0,'purpose':purpose,'type':kind,'title':title,'size':len(data),'pages':pages,'sha256':hashlib.sha256(data).hexdigest(),'first_page_text':sample})
keys=collections.defaultdict(list)
for r in rows:keys[r['sha256']].append(r['archive_path'])
dup=[v for v in keys.values() if len(v)>1]
result={'archive_sha256':'a8d01ba9e4f7f82f34c2e34ac523a3ab288072ec6cf578a551877c9b17066c1e','pdf_count':len(rows),'total_pdf_bytes':sum(r['size']for r in rows),'total_pages':sum(r['pages']for r in rows),'links':links,'by_course':dict(collections.Counter(r['course_slug']for r in rows)),'by_type':dict(collections.Counter(r['type']for r in rows)),'topic_count':len({(r['course_slug'],r['topic'])for r in rows if r['topic']}),'duplicate_hash_groups':dup,'errors':errors,'files':rows}
out=Path('/workspace/scratch/material-import-20261024/validated-pack.json');out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items()if k!='files'},ensure_ascii=False,indent=2))
for course in result['by_course']:
 print('\nSAMPLE',course)
 for r in [x for x in rows if x['course_slug']==course][:2]:print(r['title'],':',r['first_page_text'][:350].replace('\n',' '))
assert not errors and not dup and len(rows)==64
