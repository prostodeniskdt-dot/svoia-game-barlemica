(function(global){
'use strict';
const DENOMS=[
 {id:'bundle5000',points:5000,label:'Литровая бутылка ×5',product:'syrup1000',asset:'bundle-5000.svg',volume:'1 л с кольцом ×5'},
 {id:'syrup1000',points:1000,label:'Сироп',asset:'syrup-1000.svg',volume:'1 л'},
 {id:'cordial700',points:700,label:'Кордиал',asset:'cordial-700.svg',volume:'0,7 л'},
 {id:'puree500',points:500,label:'Пюре',asset:'puree-500.svg',volume:'500 г'},
 {id:'syrup250',points:250,label:'Сироп',asset:'syrup-250.svg',volume:'250 мл'},
 {id:'syrup100',points:100,label:'Сироп',asset:'syrup-100.svg',volume:'100 мл'},
 {id:'cap50',points:50,label:'Картонный жетон',asset:'cap-50.svg',volume:'разменная фишка, не продукт'}
];
const DEFAULT_RULES={auctionMin:50,auctionStep:50,stealFactor:0.5,useBundle5000:true,debtCardMode:false};
const copy=x=>JSON.parse(JSON.stringify(x));
const sum=c=>DENOMS.reduce((n,d)=>n+d.points*(c?.[d.id]||0),0);
const eq=(a,b)=>DENOMS.every(d=>(a?.[d.id]||0)===(b?.[d.id]||0));
const count=c=>DENOMS.reduce((n,d)=>n+(c?.[d.id]||0),0);
function validAmount(x){return Number.isSafeInteger(x)&&x%50===0;}
// Exact branch-and-bound knapsack. The lower bound is admissible; ties are
// compared by movement count, then descending denomination counts. Tested
// against independent dynamic programming for every sum 0..10000 / 50.
function compose(score,options={}){
 if(!validAmount(score))throw new Error('Баланс должен быть целым и кратным 50');
 const sign=Math.sign(score),target=Math.abs(score),previous=options.previous||{};
 if(!target)return {composition:{},sign:0,totalItems:0,exact:true};
 const ds=DENOMS.filter(d=>options.useBundle5000!==false||d.id!=='bundle5000');
 const limits=ds.map(d=>{const n=options.stock?.[d.id];return n===null||n===undefined?Math.floor(target/d.points):Math.max(0,Math.min(n,Math.floor(target/d.points)));});
 const gcd=(a,b)=>b?gcd(b,a%b):a;const suffixGcd=ds.map((_,i)=>ds.slice(i).reduce((n,d,j)=>limits[i+j]?gcd(n,d.points):n,0));
 const suffix=ds.map((_,i)=>ds.slice(i).reduce((n,d,j)=>n+d.points*limits[i+j],0));
 let best=null,bestCount=Infinity,bestMoves=Infinity;
 const quantities=Array(ds.length).fill(0);
 function consider(items){
  const c={};ds.forEach((d,i)=>{if(quantities[i])c[d.id]=quantities[i];});
  const moves=DENOMS.reduce((n,d)=>n+Math.abs((c[d.id]||0)-(previous[d.id]||0)),0);
  const larger=best&&DENOMS.find(d=>(c[d.id]||0)!==(best[d.id]||0));
  if(items<bestCount||(items===bestCount&&(moves<bestMoves||(moves===bestMoves&&larger&&(c[larger.id]||0)>(best[larger.id]||0))))){best=c;bestCount=items;bestMoves=moves;}
 }
 function solve(i,remaining,items){
  if(!remaining){for(let j=i;j<ds.length;j++)quantities[j]=0;consider(items);return;}
  if(i>=ds.length||remaining>suffix[i]||!suffixGcd[i]||remaining%suffixGcd[i])return;
  const d=ds[i],max=Math.min(limits[i],Math.floor(remaining/d.points));
  if(i===ds.length-1){if(remaining%d.points)return;const n=remaining/d.points;if(n<=max&&items+n<=bestCount){quantities[i]=n;consider(items+n);}return;}
  const next=ds[i+1].points;
  for(let n=max;n>=0;n--){const rest=remaining-n*d.points;const lower=items+n+Math.ceil(rest/next);if(lower>bestCount)break;if(rest>suffix[i+1])continue;quantities[i]=n;solve(i+1,rest,items+n);}
  quantities[i]=0;
 }
 solve(0,target,0);
 return best?{composition:best,sign,totalItems:bestCount,exact:true}:null;
}
function physicalComposition(s,b){return s.rules.debtCardMode&&b.targetSign<0?{}:b.targetComposition;}
function reconcile(s){
 s.physicalBank ||= {};s.physicalStock ||= {};s.rules ||= copy(DEFAULT_RULES);
 for(const t of s.teams){s.physicalBank[t.id] ||= {confirmedComposition:{},confirmedSign:0,confirmedDebtCard:0,needsReview:false};}
 const reserved={};
 for(const t of s.teams){
  const b=s.physicalBank[t.id],sign=Math.sign(t.score),old=sign===b.confirmedSign?b.confirmedComposition:{};
  const stock={};
  for(const d of DENOMS){const total=s.physicalStock[d.id];if(total==null){stock[d.id]=null;continue;}const other=s.teams.filter(x=>x.id!==t.id).reduce((n,x)=>n+(s.physicalBank[x.id].confirmedComposition[d.id]||0),0);stock[d.id]=Math.max(0,total-other-(reserved[d.id]||0));}
  const theoretical=compose(t.score,{...s.rules,previous:old});
  const card=s.rules.debtCardMode&&sign<0;
  const feasible=card?theoretical:compose(t.score,{...s.rules,previous:old,stock});
  b.targetComposition=(feasible||theoretical).composition;b.targetSign=sign;b.targetDebtCard=card?Math.abs(t.score):0;b.available=!!feasible;
  const physical=physicalComposition(s,b);
  b.pending=!!b.needsReview||!b.available||b.confirmedSign!==sign||b.confirmedDebtCard!==b.targetDebtCard||!eq(b.confirmedComposition,physical);
  if(b.available)for(const d of DENOMS)reserved[d.id]=(reserved[d.id]||0)+Math.max(0,(physical[d.id]||0)-(b.confirmedComposition[d.id]||0));
 }
 return s.physicalBank;
}
function plan(s,teamId){
 const b=s.physicalBank[teamId],target=physicalComposition(s,b),differentZone=b.confirmedSign!==b.targetSign;
 const remove=[],add=[];
 for(const d of DENOMS){const a=b.confirmedComposition[d.id]||0,n=target[d.id]||0,r=differentZone?a:Math.max(0,a-n),p=differentZone?n:Math.max(0,n-a);if(r)remove.push({id:d.id,points:d.points,quantity:r});if(p)add.push({id:d.id,points:d.points,quantity:p});}
 return {remove,add,sign:b.targetSign,removeDebtCard:!!b.confirmedDebtCard&&b.confirmedDebtCard!==b.targetDebtCard,debtCard:b.targetDebtCard,changeZone:differentZone,available:b.available,pending:b.pending};
}
function confirm(s,teamId){reconcile(s);const b=s.physicalBank[teamId];if(!b.available)throw new Error('Нет доступной точной раскладки');b.confirmedComposition=copy(physicalComposition(s,b));b.confirmedSign=b.targetSign;b.confirmedDebtCard=b.targetDebtCard;b.needsReview=false;reconcile(s);}
function validateStock(x){return x&&typeof x==='object'&&!Array.isArray(x)&&DENOMS.every(d=>x[d.id]===null||x[d.id]===undefined||(Number.isSafeInteger(x[d.id])&&x[d.id]>=0));}
global.BarlemicaBottles={DENOMS,DEFAULT_RULES,compose,reconcile,plan,confirm,sum,eq,count,validAmount,validateStock,physicalComposition};
})(window);
