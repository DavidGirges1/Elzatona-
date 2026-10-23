import { chromium } from '/workspace/elzatona/node_modules/playwright-core/index.mjs';
import { mkdir,writeFile,cp } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'ar-EG'});
for(const route of ['/','/courses','/login','/guidelines','/saved','/profile','/my-courses']){
 await page.goto('http://localhost:3000'+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{
  document.querySelectorAll('script,link[as="script"]').forEach(node=>node.remove());
  const notice=document.createElement('div');notice.setAttribute('role','note');notice.textContent='معاينة واجهة فقط · الدخول والمشاركة لسه محتاجين ربط Supabase';notice.style.cssText='background:var(--ez-sunshine);color:var(--ez-sunshine-ink);padding:12px 16px;text-align:center;font-size:14px;';document.body.prepend(notice);
 });
 const dir='dist'+(route==='/'?'':route);await mkdir(dir,{recursive:true});await writeFile(dir+'/index.html',await page.content());
 console.log('Captured',route);
}
await cp('/workspace/elzatona/.next/static','dist/_next/static',{recursive:true});
await browser.close();
