const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1240]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
   await page.goto('http://127.0.0.1:8765/laser-pro-original/',{waitUntil:'domcontentloaded'});
   await page.evaluate(()=>{
    const key='LaserPro_Manager_v1_local',db=JSON.parse(localStorage.getItem(key));
    db.stocks.push({id:'wood-demo',name:'لوح خشب طبيعي 3 ملم',category:'خشب',unit:'لوح',qty:5,minimum:1,unitCost:6,
      boardWidth:120,boardHeight:80,kerfMm:0.2,createdAt:1,updatedAt:1,deleted:false});
    db.products.push({id:'manual-cut-product',name:'مجسم قص حسب الطلب',size:'مخصص',price:10,cost:0,
      portraitSide:null,createdAt:1,updatedAt:1,deleted:false});
    localStorage.setItem(key,JSON.stringify(db));
   });
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('[data-page="inventory"]').first().click();
   const firstCard=page.locator('[data-stock-card="wood-demo"]');
   // The new cards don't use a stock-specific attribute; match the title instead.
   await assert.doesNotReject(async()=>await page.getByText('5 ألواح كاملة').first().waitFor());
   await page.locator('[data-page="dashboard"]').first().click();
   await page.locator('[data-action="new-order"]').first().click();
   await page.locator('#editor[open]').waitFor();
   await page.locator('#f_productId').selectOption('manual-cut-product');
   await page.locator('#f_customerName').fill('تجربة قص متعدد');
   await page.locator('#f_price').fill('10');
   const row=page.locator('.pick-material[data-sid="wood-demo"]');
   await row.locator('.material-check').check();
   await row.locator('.wood-w').first().fill('15');
   await row.locator('.wood-h').first().fill('15');
   await row.locator('.wood-count').first().fill('1');
   await row.locator('[data-add-cut]').click();
   await row.locator('.wood-w').last().fill('20');
   await row.locator('.wood-h').last().fill('12');
   await row.locator('.wood-count').last().fill('1');
   const woodQty=Number(await row.locator('.material-qty').inputValue());
   assert.ok(woodQty>0.04&&woodQty<0.06,'two real cut dimensions should drive fractional board reserve');
   await page.locator('#editorForm button[type="submit"]').last().click();
   await page.waitForTimeout(180);
   const pending=await page.evaluate(()=>{
     const d=JSON.parse(localStorage.getItem('LaserPro_Manager_v1_local'));
     const o=d.orders.find(v=>v.customerName==='تجربة قص متعدد');
     return {id:o?.id,used:d.usages.find(u=>u.orderId===o?.id&&u.stockId==='wood-demo'),layout:d.stocks.find(s=>s.id==='wood-demo')?.woodLayout};
   });
   assert.ok(pending.id&&pending.used,'order and wood usage saved');
   assert.equal(pending.used.cutPieces.length,2,'both cut sizes are saved');
   assert.equal(pending.used.state,'reserved','save does not consume');
   assert.equal(pending.layout,undefined,'no actual board cut before confirmation');
   await page.locator('[data-page="costing"]').first().click();
   await page.locator('#costOrder').selectOption(pending.id);
   page.once('dialog',dialog=>dialog.accept());
   await page.locator('[data-action="consume-order"]').first().click();
   await page.waitForTimeout(130);
   const consumed=await page.evaluate(()=>{
    const d=JSON.parse(localStorage.getItem('LaserPro_Manager_v1_local'));
    const m=d.stocks.find(s=>s.id==='wood-demo');
    const u=d.usages.find(v=>v.orderId===d.orders.find(o=>o.customerName==='تجربة قص متعدد').id&&v.stockId==='wood-demo');
    return {boardCount:m.woodLayout?.boards?.length,boardCuts:m.woodLayout?.boards?.map(b=>b.cuts.length),
      state:u.state,placements:u.woodPlacements?.length,inventory:d.stocks.find(s=>s.id==='wood-demo')};
   });
   assert.equal(consumed.boardCount,5);
   assert.equal(consumed.boardCuts.reduce((a,b)=>a+b,0),2,'both shapes placed physically');
   assert.equal(consumed.boardCuts.filter(n=>n>0).length,1,'cuts share same opened panel');
   assert.equal(consumed.placements,2);
   assert.equal(consumed.state,'consumed');
   await page.locator('[data-action="consume-order"]').first().click();
   const second=await page.evaluate(()=>{
     const d=JSON.parse(localStorage.getItem('LaserPro_Manager_v1_local'));
     return d.stocks.find(s=>s.id==='wood-demo').woodLayout.boards.reduce((t,b)=>t+b.cuts.length,0);
   });
   assert.equal(second,2,'confirm must not deduct same cut twice');
   await page.locator('[data-page="inventory"]').first().click();
   await page.getByText('4 ألواح كاملة').first().waitFor();
   await page.locator('[data-action="board-details"][data-id="wood-demo"]').click();
   await page.locator('.wood-board-dialog[open]').waitFor();
   assert.ok((await page.locator('.wood-board-dialog svg').count())>=1);
   await page.locator('.wood-board-dialog [data-close-board]').last().click();
   assert.deepEqual(pageErrors,[]);
   console.log('browser '+width+'px: order with 15x15 and 20x12, reserve, confirm, no duplicate, map ✓');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
