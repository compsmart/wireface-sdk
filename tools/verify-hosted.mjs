// Browser workflows with every payment, provider call and message mocked.
import assert from 'node:assert/strict';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { resolve, extname, join, sep } from 'node:path';
import { chromium } from 'playwright-core';
const root=resolve('../site/dist'),shots=resolve('shots/hosted'),base='http://wireface.test';
await mkdir(shots,{recursive:true});
const characters={};
for(const [kind,path] of [['2d','2d/characters/sora'],['3d','skins/sarah']]) characters[kind]=JSON.parse(await readFile(join(root,'assets/sdk/assets',path+'.wireface.json'),'utf8'));
const state={products:[],keys:[],licences:[],requests:[],sourceAccess:false,admin:true};
const me={publicId:'tester',name:'Release tester',email:'qa@example.invalid',google:true,created:1700000000,domains:[],voices:['Zephyr'],face:{},usage:{conversations:0,limit:10,seconds:0,maxSeconds:60},maxPersonality:5000};
const errors=[],external=[],posted=[];let fail=false,kind='2d',moderations=0;
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
try {
 const context=await browser.newContext({viewport:{width:1280,height:850}});
 context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname;const json=value=>route.fulfill({json:value});
  if(u.hostname==='www.paypal.com')return route.fulfill({contentType:'text/javascript',body:'window.paypal={Buttons(options){window.testPaypal=options;return {render(){}}}}'});
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='chat.wireface.dev')return route.fulfill({contentType:u.hostname.includes('fonts')?'text/css':'text/javascript',body:''});
  if(path.startsWith('/api/rigging/v1/')) {
   if(req.method()==='POST'){kind=path.endsWith('3d')?'3d':'2d';return json({id:'b'.repeat(32),status:'queued',stage:'queued',requestId:'test'});}
   return json(fail?{id:'b'.repeat(32),status:'failed',stage:'failed',error:{code:'poor_anchors',message:'Use a clearer image'},requestId:'test'}:{id:'b'.repeat(32),status:'completed',stage:'completed',character:characters[kind],requestId:'test'});
  }
  if(u.origin!==base){external.push(u.href);return route.abort();}
  if(path==='/api/account')return json(me);
  if(path==='/api/account/conversations')return json({conversations:[]});
  if(path==='/api/sdk/account')return json(state);
  if(path==='/api/sdk/products'){const product={id:'p1',...req.postDataJSON()};state.products.push(product);return json(product);}
  if(path==='/api/sdk/keys'){
   const body=req.postDataJSON();if(body.rotate)state.keys.find(k=>k.id===body.rotate).status='revoked';
   const key={id:'k'+state.keys.length,product:body.product,prefix:'wf_sk_mock',status:'active'};state.keys.push(key);return json({...key,key:'wf_sk_mock_release_test_only'});
  }
  if(path==='/api/sdk/token')return json({token:'wf_bt_mock_release_test_only'});
  if(path==='/api/rigging-admin/dashboard')return json({accounts:[{public_id:'tester',name:'Release tester'}],products:state.products,keys:state.keys,requests:[],audit:[]});
  if(path==='/api/rigging-admin/moderate'){moderations++;return json({ok:true});}
  if(path==='/api/pay/config')return json({checkout:true,env:'sandbox',clientId:'mock',currency:'GBP',amount:'25.00'});
  if(path==='/api/pay/paypal/orders'){posted.push(req.postDataJSON());return json({id:'MOCK1234567890'});}
  if(path.endsWith('/capture')){state.licences.push({id:'MOCK1234567890',product_id:'p1',status:'COMPLETED',term_end:Date.now()/1000+31536000});state.sourceAccess=true;return json({id:'MOCK1234567890',status:'COMPLETED'});}
  if(path.startsWith('/e/'))return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Mock account embed</title>'});
  if(path.startsWith('/api/'))return json({gemini:false,conversations:[]});
  let file=resolve(root,'.'+decodeURIComponent(path));if(file!==root&&!file.startsWith(root+sep))return route.abort();
  try {
   if((await stat(file)).isDirectory())file=join(file,'index.html');
   const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.m4a':'audio/mp4','.wasm':'application/wasm'};
   return route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:await readFile(file)});
  } catch {errors.push('404 '+path);return route.fulfill({status:404});}
 });
 const page=await context.newPage();
 await page.goto(base+'/account/#sdk');await page.getByLabel('Product name').fill('Example product');
 await page.getByRole('button',{name:'Create product and free rigging key'}).click();
 await page.getByRole('heading',{name:'Save this key now'}).waitFor();assert.equal(state.keys.length,1);
 await page.getByRole('button',{name:'Rotate',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#sdk-account').textContent.includes('revoked'));assert.equal(state.keys.length,2);
 await page.locator('#sdk-account').screenshot({path:join(shots,'account.png')});
 await page.goto(base+'/license/?product=p1');await page.waitForFunction(()=>window.testPaypal);
 await page.getByLabel('Developer or organisation name').fill('Example developer');await page.locator('#checkout input[type=checkbox]').check();
 const order=await page.evaluate(()=>window.testPaypal.createOrder());assert.equal(order,'MOCK1234567890');assert.equal(posted[0].plan,'hosted-annual');assert.equal(posted[0].product,'p1');
 await page.evaluate(()=>window.testPaypal.onApprove({orderID:'MOCK1234567890'},{}));
 await page.waitForURL('**/account/#sdk');await page.getByRole('link',{name:'Download SDK and integration source'}).waitFor();
 await page.goto(base+'/admin/');await page.getByLabel('Account or key ID').fill('tester');await page.getByLabel('Reason').fill('Mock moderation check');
 await page.getByRole('button',{name:'Apply action'}).click();await page.waitForTimeout(200);assert.equal(moderations,1);
 await page.screenshot({path:join(shots,'admin.png'),fullPage:true});
 await page.goto(base+'/2d/try/');await page.waitForTimeout(1000);fail=true;
 await page.locator('#file').setInputFiles(join(root,'assets/sdk/assets/2d/characters/sora.jpg'));
 await page.locator('#status').filter({hasText:'Use a clearer image'}).waitFor();
 let download=page.waitForEvent('download');await page.locator('#download-character').click();assert.ok((await download).suggestedFilename().endsWith('.wireface.json'));
 fail=false;await page.locator('#file').setInputFiles(join(root,'assets/sdk/assets/2d/characters/sora.jpg'));
 await page.locator('#status').filter({hasText:'Character ready'}).waitFor();await page.screenshot({path:join(shots,'remote-2d.png')});
 await page.goto(base+'/try/');await page.locator('#creation-mode').selectOption('hosted');
 await page.locator('#faces input[type=file]').setInputFiles(join(root,'assets/sdk/assets/skins/sarah.jpg'));
 await page.locator('#status').filter({hasText:'Hosted character ready'}).waitFor();await page.screenshot({path:join(shots,'remote-3d.png')});
 for(const path of ['/','/2d/']) {
  await page.goto(base+path);await page.locator(path==='/'?'#local-preview':'#detect-stage').scrollIntoViewIfNeeded();await page.waitForTimeout(1200);
  await page.screenshot({path:join(shots,path==='/'?'comparison.png':'prepared-2d.png')});
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('PASS account keys, mocked checkout, source access, moderation, hosted 2D/3D and failure-preserving export; no external calls');
} finally {await browser.close();}
