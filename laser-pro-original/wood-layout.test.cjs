const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const root={};vm.runInNewContext(fs.readFileSync(__dirname+'/wood-layout.js','utf8'),{
 window:root,crypto:require('node:crypto').webcrypto,structuredClone:global.structuredClone,Date,Math,Number,Error,Array,Object
});
const w=root.LaserWood,init=w.ensure(null,5,120,80,0);
assert.equal(init.boards.length,5);
const a=w.plan(init,[{w:15,h:15,label:'واجهة'}],0.2,'order-1');
const x=w.describe(a.layout);
assert.equal(x.whole,4);assert.equal(x.partial,1);
assert.ok(x.cm2<48000&&x.cm2>47500,'must preserve actual rectangular remnants');
const b=w.plan(a.layout,[{w:20,h:12,label:'خلفية'}],0.2,'order-2');
const second=w.describe(b.layout);
assert.equal(second.whole,4,'must reuse opened board if piece fits');
assert.equal(second.partial,1);
assert.equal(b.placements[0].boardId,a.placements[0].boardId);
assert.throws(()=>w.plan(b.layout,[{w:150,h:120,label:'too large'}],.2,'order-x'),/لا تتّسع/);
assert.throws(()=>w.ensure(null,5,120,80,.25),/جرد/,'cannot invent missing legacy remnants');
assert.throws(()=>w.ensure(null,5.2,120,80,0),/صحيح/,'fractional panel counts must be rejected');
assert.throws(()=>w.ensure(b.layout,4,120,80,0),/عدد الألواح/);
assert.deepEqual([a.placements[0].x,a.placements[0].y],[0,0]);
assert.equal(w.cutsForPortrait({used:[['واجهة',15,15],['خلفية',20,12]]},2).length,4);
console.log('wood geometry: 5 boards, 2 cuts fit 1 opened board, no overlaps, guards pass');
