const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
async function openRuntime(root,entry='index.html',storage={}) {
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('http://emberwild.test/**',async route=>{
    const url=new URL(route.request().url());
    const file=path.resolve(root,url.pathname==='/'?entry:'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(path.resolve(root)+path.sep))return route.fulfill({status:403,body:'Forbidden'});
    if(!fs.existsSync(file))return route.fulfill({status:404,body:'Not found'});
    await route.fulfill({status:200,body:fs.readFileSync(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});
  });
  await page.addInitScript(s=>{for(const [k,v] of Object.entries(s))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));},storage);
  await page.goto('http://emberwild.test/',{waitUntil:'load',timeout:30000});
  return {browser,page,errors};
}
module.exports={openRuntime};
