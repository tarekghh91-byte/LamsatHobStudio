const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1240]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:8765/laser-pro-original/',{waitUntil:'domcontentloaded'});
   await page.locator('[data-action="new-order"]').first().click();
   await page.locator('#editor[open]').waitFor();
   assert.equal(await page.locator('#f_hasBackground').isChecked(),false,'new order background default off');
   assert.equal(await page.locator('#f_hasBase').isChecked(),false,'new order base default off');
   assert.equal(await page.locator('#f_hasStand').isChecked(),false,'new order stand default off');
   const getCost=async()=>await page.locator('#formSummary').innerText();
   const old=await getCost();
   assert.match(old,/تكلفة الطلب المباشرة/);
   assert.match(old,/ربح/);
   await page.locator('#f_hasBackground').check();
   assert.equal(await page.locator('#dims_hasBackground').isVisible(),true);
   await page.locator('#f_backgroundWidthCm').fill('20');
   await page.locator('#f_backgroundHeightCm').fill('12');
   const withBackground=await getCost();
   assert.notEqual(old,withBackground,'background must change price calculation');
   await page.locator('#f_hasBase').check();
   await page.locator('#f_baseWidthCm').fill('5');
   await page.locator('#f_baseHeightCm').fill('6');
   await page.locator('#f_hasStand').check();
   await page.locator('#f_standWidthCm').fill('4');
   await page.locator('#f_standHeightCm').fill('7');
   const withAll=await getCost();
   assert.notEqual(withBackground,withAll,'base and stand must change cost calculation');
   await page.locator('#f_hasBackground').uncheck();
   await page.locator('#f_hasBase').uncheck();
   await page.locator('#f_hasStand').uncheck();
   await page.locator('#f_customerName').fill('زبون تجربة الفاتورة');
   await page.locator('#f_customerPhone').fill('70000000');
   await page.locator('#f_price').fill('10');
   await page.locator('#f_estimateMinutes').fill('120');
   await page.locator('#f_quickMinutes').fill('35');
   const baseSummary=await getCost();
   assert.ok(!baseSummary.includes('مصاريف تشغيل موزعة'),'Do not allocate rent to order');
   await page.locator('#editorForm button[type="submit"]').last().click();
   await page.waitForTimeout(150);
   const order=await page.evaluate(()=>{
    const db=JSON.parse(localStorage.getItem('LaserPro_Manager_v1_local'));
    return db.orders?.find(o=>o.customerName==='زبون تجربة الفاتورة')||null;
   });
   assert.ok(order,'Order must save locally');
   assert.equal(order.hasBackground,false);
   assert.equal(order.hasBase,false);
   assert.equal(order.hasStand,false);
   await page.evaluate(()=>{
    const key='LaserPro_Manager_v1_local';
    const db=JSON.parse(localStorage.getItem(key));
    db.expenses.push({id:'shop-electricity',date:'2026-10-21',category:'كهرباء',amount:900,note:'فواتير المحل',createdAt:1,updatedAt:1,deleted:false});
    db.settings.ownerCapital=12000;
    localStorage.setItem(key,JSON.stringify(db));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('[data-page="orders"]').first().click();
   const orderRecord=await page.evaluate(()=>{
    const db=JSON.parse(localStorage.getItem('LaserPro_Manager_v1_local'));
    return db.orders.find(o=>o.customerName==='زبون تجربة الفاتورة');
   });
   assert.ok(orderRecord);
   await page.locator('[data-page="capital"]').first().click();
   const finance=await page.locator('#capitalBreakdown').innerText();
   assert.match(finance,/ربح الطلبات|خسائر الطلبات/);
   assert.match(finance,/مصاريف المحل/);
   assert.ok(errors.length===0,'No browser errors: '+errors.join('; '));
   await page.close();
   console.log('Laser Pro classic pass at '+width+'px');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
