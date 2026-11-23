const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
const output = require('path').resolve(__dirname, '../../docs/evidence/issue-1040');
const SELLER='GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const invoice={id:'display-name-example',sellerPublicKey:SELLER,sellerName:'Studio & Co',amount:12.5,assetCode:'XLM',memo:'DESIGN-001',status:'PENDING',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()};
(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  for(const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
   const page=await browser.newPage({viewport});
   await page.route('http://localhost:3001/api/**',async route=>{
    const url=route.request().url();
    await route.fulfill({json:{success:true,data:url.endsWith('payment-info')?{paymentUrl:'http://127.0.0.1:3101/pay/display-name-example'}:invoice}});
   });
   for(const path of ['pay','invoice']) {
    await page.goto(`http://127.0.0.1:3101/${path}/${invoice.id}`);
    await expect(page.getByText('Studio & Co',{exact:true})).toBeVisible({timeout:60000});
    await expect(page.getByText(`${SELLER.slice(0,8)}…${SELLER.slice(-8)}`,{exact:true})).toBeVisible();
    await page.screenshot({path:`${output}/${path}-${device}.png`,fullPage:true});
   }
   await page.addInitScript(seller=>localStorage.setItem('wallet-storage',JSON.stringify({state:{publicKey:seller,balance:'100',connected:true},version:0})),SELLER);
   await page.goto('http://127.0.0.1:3101/');
   await expect(page.getByLabel('Your display name (optional)')).toBeVisible({timeout:60000});
   await page.getByLabel('Your display name (optional)').fill('Studio & Co');
   await page.getByLabel('Your display name (optional)').scrollIntoViewIfNeeded();
   await page.screenshot({path:`${output}/form-${device}.png`});
   await page.close();
  }
  console.log('Seller labels, destination keys and create-form field verified on desktop/mobile; six screenshots saved.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
