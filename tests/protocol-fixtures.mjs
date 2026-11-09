/** Independently serialized account fixtures. These are NOT on-chain accounts. */
import {createHash} from 'node:crypto';
import {identity,TEST_MINT} from './fixtures.mjs';
import {PROGRAM,MINT,b58decode,b58encode,u32,u64,concat} from '../shared/solana.mjs';
import {ata} from '../server/builders.mjs';
import {CPMM,poolKeys} from '../server/v4/liquidity.mjs';
import {SQUADS,proposalAddress,vaultAddress} from '../server/v4/governance.mjs';
import {transactionAddress,treasuryMessage} from '../server/v4/squads-transactions.mjs';
import {LAUNCH,launchKeys,vestingAddress} from '../server/v4/launchlab.mjs';
const D=n=>createHash('sha256').update('account:'+n).digest().subarray(0,8),pub=b58decode,byt=(...a)=>Uint8Array.from(a),u16=n=>byt(n&255,n>>8&255),pad=n=>new Uint8Array(n);
const v32=arr=>concat(u32(arr.length),...arr),bytes=b=>concat(u32(b.length),b);
export function protocolFixtures(service,owner){
 const original=service.up.rpc.bind(service.up),accounts=new Map(),controls={approved:false};
 const binary=(owner,data)=>({owner,data:[Buffer.from(data).toString('base64'),'base64'],lamports:50000000});
 const parsedMint=mint=>({owner:PROGRAM.token,data:{parsed:{type:'mint',info:{decimals:mint===MINT.SOL?9:6,supply:'1000000000000000',mintAuthority:null,freezeAuthority:null}}}});
 const parsedToken=(mint,authority,amount='1000000000000000')=>({owner:PROGRAM.token,data:{parsed:{type:'account',info:{owner:authority,mint,state:'initialized',tokenAmount:{amount,decimals:mint===MINT.SOL?9:6}}}}});
 const cfg=identity().owner;
 let [mintA,mintB]=[MINT.USDC,TEST_MINT].sort((a,b)=>Buffer.compare(Buffer.from(pub(a)),Buffer.from(pub(b))));
 const cp=poolKeys(CPMM.mainnet.program,cfg,mintA,mintB),cpData=concat(D('PoolState'),...[cfg,owner,cp.vaultA,cp.vaultB,cp.lp,mintA,mintB,PROGRAM.token,PROGRAM.token,cp.observation].map(pub),byt(1,0,6,6,6),...[1000000000000n,0n,0n,0n,0n,0n,0n].map(u64),byt(0,0),pad(6),u64(0),u64(0),pad(200));
 accounts.set(cp.pool,binary(CPMM.mainnet.program,cpData));
 accounts.set(cp.vaultA,parsedToken(mintA,cp.authority,'1000000000000'));accounts.set(cp.vaultB,parsedToken(mintB,cp.authority,'2000000000000'));
 for(const mint of [mintA,mintB,cp.lp,MINT.SOL])accounts.set(ata(owner,mint),parsedToken(mint,owner));
 const configData=concat(D('AmmConfig'),byt(1,0),u16(0),u64(2500),u64(0),u64(0),u64(150000000),pad(100));accounts.set(cfg,binary(CPMM.mainnet.program,configData));
 const ms=identity().owner,createKey=identity().owner,vault=vaultAddress(ms),destination=identity().owner;
 const msData=concat(byt(224,116,121,186,68,161,79,236),pub(createKey),pub(PROGRAM.system),u16(1),u32(0),u64(1),u64(0),byt(0,1),u32(1),pub(owner),byt(7));accounts.set(ms,binary(SQUADS,msData));
 const proposal=proposalAddress(ms,1),txId=transactionAddress(ms,1),m=treasuryMessage(vault,destination,MINT.SOL,'0.1');
 const txData=concat(byt(168,250,162,100,81,14,162,207),pub(ms),pub(owner),u64(1),byt(1,0,1),bytes(pad(0)),byt(m.numSigners,m.numWritableSigners,m.numWritableNonSigners),v32(m.accountKeys.map(pub)),v32(m.instructions.map(i=>concat(byt(i.programIdIndex),bytes(byt(...i.accountIndexes)),bytes(i.data)))),u32(0));accounts.set(txId,binary(SQUADS,txData));
 const launch=LAUNCH.mainnet,baseMint=identity().owner,ll=launchKeys(launch.program,baseMint,MINT.SOL);
 const globalData=concat(D('GlobalConfig'),u64(1),byt(0),u16(0),...[1000000000n,2500n,0n,1n,100000n,500000n,100000n,1000000000n].map(u64),...[MINT.SOL,owner,owner,owner,owner].map(pub),pad(128));accounts.set(launch.config,binary(launch.program,globalData));
 const platformData=concat(D('PlatformConfig'),u64(1),pub(owner),pub(owner),...[0n,0n,1000000n,0n].map(u64),Buffer.from('TEST FIXTURE'.padEnd(64,'\0')),pad(256),pad(256),pub(cfg),u64(0),pub(owner),pub(owner),u64(0),pub(owner),byt(0,0),pad(200));accounts.set(launch.platform,binary(launch.program,platformData));
 const poolData=status=>concat(D('PoolState'),u64(1),byt(1,status,6,9,0),...[1000000000000000n,800000000000000n,1000000000000000n,10000000000n,10000000000n,1000000000n,85000000000n,0n,0n,1000000000n].map(u64),...[100000000000000n,0n,1000n,BigInt(Math.floor(Date.now()/1000)-2000),1000000n].map(u64),...[launch.config,launch.platform,baseMint,MINT.SOL,ll.vaultA,ll.vaultB,owner].map(pub),byt(0,0),u64(0),pad(100));
 controls.graduated=false;controls.vested=false;
 accounts.set(ata(owner,baseMint),parsedToken(baseMint,owner));
 service.up.rpc=async(method,params=[],network)=>{
  if(method==='getSlot')return 1000;if(method==='getBlockTime')return Math.floor(Date.now()/1000);
  if(method==='getMultipleAccounts')return{value:params[0].map(key=>key===proposal?binary(SQUADS,concat(byt(26,94,189,187,116,136,53,33),pub(ms),u64(1),byt(controls.approved?3:1),u64(Math.floor(Date.now()/1000)-10000),byt(1),u32(0),u32(0),u32(0))):null)};
  if(method==='getAccountInfo'){
   const key=params[0];if(key===ll.pool)return{value:binary(launch.program,poolData(controls.graduated?2:0))};
   if(key===vestingAddress(launch.program,ll.pool,owner)&&controls.vested)return{value:binary(launch.program,concat(D('VestingRecord'),u64(1),pub(ll.pool),pub(owner),u64(0),u64(1000000),pad(64)))};
   if(accounts.has(key))return{value:accounts.get(key)};
   if(params[1]?.encoding==='jsonParsed')return{value:parsedMint(key)};
   return{value:null};
  }
  return original(method,params,network);
 };
 return{cp,cfg,mintA,mintB,ms,vault,destination,proposal,txId,launch,ll,baseMint,controls,accounts};
}
