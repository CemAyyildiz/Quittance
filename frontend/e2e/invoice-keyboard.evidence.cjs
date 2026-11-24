const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
const output = require('path').resolve(__dirname, '../../docs/evidence/issue-1033');
const SELLER = 'GC4VWBK5QSJCBSRWIZJYWCF2SJAPCKU3OFHH4XK7ZBTZ5HCK7VYLU6FL';
const invoice = {id:'keyboard-example',sellerPublicKey:SELLER,amount:12.5,assetCode:'XLM',memo:'KEYBOARD',status:'PENDING',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()};

(async()=>{
 fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  for (const [device,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]) {
   const page=await browser.newPage({viewport});
   page.setDefaultTimeout(20000);
   page.setDefaultNavigationTimeout(20000);
   await page.addInitScript(seller=>localStorage.setItem('wallet-storage',JSON.stringify({state:{publicKey:seller,balance:'100',connected:true},version:0})),SELLER);
   await page.route('http://localhost:3001/api/**',async route=>{
    const url=new URL(route.request().url());
    let data=invoice;
    if(url.pathname.endsWith('/stats'))data=[{total_invoices:1}];
    else if(url.pathname==='/api/invoices'&&route.request().method()==='GET')data=[invoice];
    else if(route.request().method()==='POST')data={invoice};
    else if(url.pathname.endsWith('/payment-info'))data={paymentUrl:'http://127.0.0.1:3102/pay/keyboard-example'};
    await route.fulfill({json:{success:true,data}});
   });
   await page.goto('http://127.0.0.1:3102/',{waitUntil:'domcontentloaded'});
   console.log(device, 'create route loaded');
   const submit=page.getByRole('button',{name:'Create Invoice',exact:true});
   await expect(submit).toBeVisible({timeout:60000});
   await submit.focus();
   await page.keyboard.press('Enter');
   const amount=page.getByLabel('Invoice Amount *');
   await expect(amount).toBeFocused();
   await expect(page.locator('form').getByRole('alert')).toHaveText('Enter a valid amount');
   await expect(amount).toHaveCSS('outline-style','solid');
   await page.locator('form').screenshot({path:`${output}/invalid-form-${device}.png`,animations:'disabled'});
   await amount.fill('12.5');
   await page.keyboard.press('Tab');
   await expect(page.getByLabel('Asset',{exact:true})).toBeFocused();
   await page.goto('http://127.0.0.1:3102/dashboard',{waitUntil:'domcontentloaded'});
   await expect(page.getByLabel('Search invoices')).toBeVisible({timeout:60000});
   await expect(page.locator('label[for="invoice-search"]')).toBeVisible();
   await page.screenshot({path:`${output}/dashboard-${device}.png`});
   await page.goto('http://127.0.0.1:3102/pay/keyboard-example',{waitUntil:'domcontentloaded'});
   const pay=page.getByRole('button',{name:'Pay with Freighter'});
   await expect(pay).toBeVisible({timeout:60000});
   await expect(pay).toHaveAttribute('type','button');
   await pay.focus();
   await expect(pay).toBeFocused();
   await expect(pay).toHaveCSS('outline-style','solid');
   await page.close();
  }
  console.log('Keyboard submit/focus, visible labels, tab order and pay-button focus verified at desktop/mobile widths.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
