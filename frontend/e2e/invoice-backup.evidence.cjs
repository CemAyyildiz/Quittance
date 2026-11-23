const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
const output=require('path').resolve(__dirname,'../../docs/evidence/issue-1038');
const SELLER='GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const records=[{id:'backup-example',sellerPublicKey:SELLER,amount:12.5,assetCode:'XLM',memo:'BACKUP',status:'PENDING',customerEmail:'private@example.com',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()}];
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
   const page=await browser.newPage({viewport});
   page.setDefaultTimeout(20000);
   await page.addInitScript(seller=>localStorage.setItem('wallet-storage',JSON.stringify({state:{publicKey:seller,balance:'100',connected:true},version:0})),SELLER);
   await page.route('http://localhost:3001/api/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/api/invoices/export') {
     if(url.searchParams.get('sellerPublicKey')!==SELLER)throw new Error('Wrong export wallet');
     const backup=records.map(({customerEmail,...rest})=>({...rest,...(url.searchParams.get('includeCustomerEmail')==='true'?{customerEmail}:{})}));
     await route.fulfill({json:backup});
    } else await route.fulfill({json:{success:true,data:url.pathname.endsWith('/stats')?[{total_invoices:1}]:records}});
   });
   await page.goto('http://127.0.0.1:3103/dashboard',{waitUntil:'domcontentloaded'});
   const section=page.getByRole('region',{name:'Invoice JSON backup'});
   await expect(section).toBeVisible({timeout:60000});
   await expect(section.getByRole('checkbox')).not.toBeChecked();
   const first=page.waitForEvent('download');
   await section.getByRole('button',{name:'Download JSON backup'}).click();
   const download=await first;
   expect(download.suggestedFilename()).toMatch(/\.json$/);
   const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
   expect(backup).toHaveLength(1);
   expect(backup[0].sellerPublicKey).toBe(SELLER);
   expect(backup[0]).not.toHaveProperty('customerEmail');
   await section.getByRole('checkbox').check();
   const second=page.waitForEvent('download');
   await section.getByRole('button',{name:'Download JSON backup'}).click();
   expect(JSON.parse(fs.readFileSync(await (await second).path(),'utf8'))[0].customerEmail).toBe('private@example.com');
   await section.screenshot({path:`${output}/backup-${device}.png`,animations:'disabled'});
   await page.close();
  }
  console.log('JSON download, wallet scope, default email exclusion and explicit consent verified on desktop/mobile.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
