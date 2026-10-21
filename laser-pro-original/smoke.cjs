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
   // Theme switch is presentation-only: no new app install, no order changes.
   assert.equal(await page.locator('html').getAttribute('data-ui-theme'),'light');
   await page.locator('[data-theme-toggle]').click();
   assert.equal(await page.locator('html').getAttribute('data-ui-theme'),'dark');
   const darkBackground=await page.evaluate(()=>getComputedStyle(document.body).backgroundColor);
   assert.equal(darkBackground,'rgb(19, 21, 24)','Dark theme must change actual page background');
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('html').getAttribute('data-ui-theme'),'dark','Theme persists after reload');
   assert.equal(await page.locator('[data-theme-toggle]').innerText(),'☀ فاتح');
   await page.locator('[data-page="settings"]').first().click();
   await page.locator('[data-theme-choice="light"]').click();
   assert.equal(await page.locator('html').getAttribute('data-ui-theme'),'light');
   assert.equal(await page.locator('[data-theme-choice="light"]').getAttribute('aria-pressed'),'true');
   await page.locator('[data-theme-choice="dark"]').click();
   assert.equal(await page.locator('html').getAttribute('data-ui-theme'),'dark');
   await page.locator('[data-theme-choice="light"]').click();
   await page.reload({waitUntil:'domcontentloaded'});
   assert.equal(await page.locator('html').getAttribute('data-ui-theme'),'light','Light theme persists after reload');
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
   // Stock cards must be concise, honest about equivalent wood area and
   // consistent with confirmed versus reserved physical inventory.
   await page.evaluate(()=>{
    const key='LaserPro_Manager_v1_local';
    const db=JSON.parse(localStorage.getItem(key));
    const order=db.orders.find(o=>o.customerName==='زبون تجربة الفاتورة');
    db.stocks.push({id:'test-stock-board',name:'MDF خشب طبيعي اختبار',category:'خشب',unit:'لوح',
      qty:5,unitCost:6,minimum:.2,boardWidth:80,boardHeight:120,supplier:'',
      createdAt:Date.now(),updatedAt:Date.now(),deleted:false});
    db.usages.push({id:'test-usage-consumed',orderId:order.id,stockId:'test-stock-board',
      stockName:'MDF خشب طبيعي اختبار',role:'خشب',qty:.025,costPerUnit:6,
      state:'consumed',createdAt:Date.now(),updatedAt:Date.now(),deleted:false});
    db.usages.push({id:'test-usage-reserved',orderId:order.id,stockId:'test-stock-board',
      stockName:'MDF خشب طبيعي اختبار',role:'خشب',qty:.01,costPerUnit:6,
      state:'reserved',createdAt:Date.now(),updatedAt:Date.now(),deleted:false});
    localStorage.setItem(key,JSON.stringify(db));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('[data-page="inventory"]').first().click();
   const inventoryCard=page.locator('[data-stock-card="test-stock-board"]');
   assert.match(await inventoryCard.innerText(),/4.98 لوح مساحة تقريبية/);
   assert.match(await inventoryCard.innerText(),/محجوز للطلبات/);
   assert.match(await inventoryCard.innerText(),/تقدير|تقريبية|مكافئة|مساحة/);
   if(width<850){
     assert.equal(await inventoryCard.isVisible(),true,'Mobile inventory is shown as compact cards');
     assert.equal(await page.locator('.stock-classic-table').isVisible(),false,'Hide technical table on phone');
   }else{
     assert.equal(await inventoryCard.isVisible(),false,'Desktop shows editable detailed stock table');
     assert.equal(await page.locator('.stock-classic-table').isVisible(),true);
   }
   await page.locator('[data-page="costing"]').first().click();
   const confirmation=page.locator('[data-action="consume-order"]').first();
   await confirmation.click();
   let after=await page.evaluate(()=>{
     const db=JSON.parse(localStorage.getItem('LaserPro_Manager_v1_local'));
     return db.usages.find(u=>u.id==='test-usage-reserved')?.state;
   });
   assert.equal(after,'consumed','Explicit confirmation deducts pending material');
   await page.locator('[data-action="consume-order"]').first().click();
   after=await page.evaluate(()=>{
     const db=JSON.parse(localStorage.getItem('LaserPro_Manager_v1_local'));
     return db.usages.filter(u=>u.stockId==='test-stock-board'&&u.state==='consumed').length;
   });
   assert.equal(after,2,'Confirming twice does not deduct material twice');
   assert.ok(errors.length===0,'No browser errors: '+errors.join('; '));
   await page.close();
   console.log('Laser Pro classic pass at '+width+'px');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
