import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

const LIGHT={bg:'#fafaf9',surface:'#fff',border:'#e8e6e3',text:'#1a1a1a',sub:'#666',muted:'#bbb',ib:'#ddd',ibg:'#fff',badge:'#f0eeec',bt:'#777',nav:'#fff',nb:'#eee'};
const DARK ={bg:'#0d0d0d',surface:'#1c1c1e',border:'#2c2c2e',text:'#f2f2f7',sub:'#98989f',muted:'#48484a',ib:'#3a3a3c',ibg:'#2c2c2e',badge:'#2c2c2e',bt:'#98989f',nav:'#111',nb:'#222'};
const DAYS_OF_WEEK=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DEFAULT_SEASONS=["Spring/Summer","Autumn/Winter","All Year Round","SS25","AW25","SS26","AW26"];
const BLANK={name:"",brand:"",price:"",paidPrice:"",color:"",imageUrl:"",description:"",category:"",productId:"",season:""};
const BLANK_WISH={name:"",brand:"",rrp:"",priceNow:"",color:"",imageUrl:"",description:"",url:"",notes:""};
const RATINGS=[{key:"love",icon:"👍",label:"Love it"},{key:"okay",icon:"😐",label:"Okay"},{key:"never",icon:"👎",label:"Never again"}];

const daysSince=d=>{if(!d)return null;return Math.floor((Date.now()-new Date(d).getTime())/(864e5));};
const wornLabel=item=>{
  const d=daysSince(item.lastWorn);
  if(d===null)return{text:"Never worn",col:"#aaa"};
  if(d===0)return{text:"Worn today",col:"#2d6a4f"};
  if(d===1)return{text:"Worn yesterday",col:"#2d6a4f"};
  if(d<7)return{text:`Worn ${d}d ago`,col:"#2d6a4f"};
  if(d<30)return{text:`Worn ${d}d ago`,col:"#92651a"};
  if(d<60)return{text:`${d}d since worn`,col:"#e67e22"};
  return{text:`Not worn in ${d}d`,col:"#c0392b"};
};

const ls={get:k=>{const v=localStorage.getItem(k);return v?{value:v}:null;},set:(k,v)=>localStorage.setItem(k,v),del:k=>localStorage.removeItem(k)};
const ikey=u=>`wd-items-${u}`,ckey=u=>`wd-cats-${u}`,skey=u=>`wd-seasons-${u}`,wlkey=u=>`wd-wish-${u}`,okey=u=>`wd-outfits-${u}`,pkey=u=>`wd-pic-${u}`,wpkey=u=>`wd-week-${u}`,ACCTS="wd-accounts";
const pp=s=>{if(!s)return 0;const n=parseFloat(s.replace(/[^0-9.]/g,""));return isNaN(n)?0:n;};
const symOf=arr=>{for(const it of arr){const p=it.price||it.rrp||it.paidPrice;if(p){const m=p.match(/^[^0-9]+/);if(m)return m[0].trim();}}return"£";};

async function fetchDetails(url){
  const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,tools:[{type:"web_search_20250305",name:"web_search"}],
      system:`Fashion assistant. Extract product details. Return ONLY JSON: {"name":"","brand":"","price":"with symbol","color":"","imageUrl":"https:// direct URL or empty","description":"1 sentence"}`,
      messages:[{role:"user",content:`Extract product details from: ${url}`}]})});
  if(!res.ok) throw new Error(`API ${res.status}`);
  const data=await res.json();
  const text=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  const clean=text.replace(/```json|```/g,"").trim();
  return JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1));
}

function resizeImg(file,MAX=800){
  return new Promise(res=>{
    const r=new FileReader();
    r.onload=ev=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",0.82));};img.src=ev.target.result;};
    r.readAsDataURL(file);
  });
}

function Img({src,alt,style}){
  const[f,setF]=useState(false);useEffect(()=>setF(false),[src]);
  if(!src||f)return<div style={{...style,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0eeec",fontSize:28,color:"#ccc"}}>👗</div>;
  return<img src={src} alt={alt} style={style} onError={()=>setF(true)}/>;
}

function Fld({label,T,...p}){
  return(<div style={{marginBottom:10}}>{label&&<label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>{label}</label>}<input style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.ib}`,fontSize:13,outline:"none",boxSizing:"border-box",background:T.ibg,color:T.text}} {...p}/></div>);
}

function PhotoField({value,onChange,T}){
  return(<div style={{marginBottom:10}}>
    <label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Photo</label>
    {value?(<div style={{position:"relative",borderRadius:8,overflow:"hidden",height:140,marginBottom:6}}>
      <Img src={value} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
      <button onClick={()=>onChange("")} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:"50%",width:24,height:24,cursor:"pointer",color:"#fff",fontSize:12}}>✕</button>
    </div>):(
      <label style={{display:"block",borderRadius:8,border:`2px dashed ${T.border}`,padding:"14px",textAlign:"center",color:T.muted,fontSize:12,cursor:"pointer",marginBottom:6,background:T.surface}}>
        <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files[0];if(f)onChange(await resizeImg(f));}}/>
        <div style={{fontSize:20,marginBottom:3}}>📷</div><div style={{fontWeight:600,color:T.sub}}>Upload photo</div>
      </label>
    )}
    <input value={value?.startsWith("data:")?"":(value||"")} onChange={e=>onChange(e.target.value)} placeholder="…or paste image URL"
      style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.ib}`,fontSize:13,outline:"none",boxSizing:"border-box",background:T.ibg,color:T.text}}/>
  </div>);
}

function ItemForm({data,onChange,cats,seasons,onAddSeason,T}){
  const[addS,setAddS]=useState(false);const[ns,setNs]=useState("");
  const f=(k,v)=>onChange({...data,[k]:v});
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
      <div style={{gridColumn:"1/-1"}}><Fld T={T} label="Name *" value={data.name||""} onChange={e=>f("name",e.target.value)} placeholder="e.g. Linen Blazer"/></div>
      <Fld T={T} label="Brand" value={data.brand||""} onChange={e=>f("brand",e.target.value)} placeholder="e.g. Zara"/>
      <Fld T={T} label="Product ID" value={data.productId||""} onChange={e=>f("productId",e.target.value)} placeholder="SKU"/>
      <Fld T={T} label="Listed Price" value={data.price||""} onChange={e=>f("price",e.target.value)} placeholder="£49.99"/>
      <Fld T={T} label="Paid Price" value={data.paidPrice||""} onChange={e=>f("paidPrice",e.target.value)} placeholder="£29.99"/>
    </div>
    <div style={{marginBottom:10}}>
      <label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Season</label>
      {addS?(<div style={{display:"flex",gap:8}}>
        <input autoFocus value={ns} onChange={e=>setNs(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&ns.trim()){onAddSeason(ns.trim());f("season",ns.trim());setNs("");setAddS(false);}if(e.key==="Escape")setAddS(false);}} placeholder="e.g. Resort 2026" style={{flex:1,padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.ib}`,fontSize:13,outline:"none",background:T.ibg,color:T.text}}/>
        <button onClick={()=>{if(ns.trim()){onAddSeason(ns.trim());f("season",ns.trim());}setNs("");setAddS(false);}} style={{padding:"8px 14px",borderRadius:7,border:"none",background:"#1a1a1a",color:"#fff",cursor:"pointer",fontSize:13}}>Add</button>
        <button onClick={()=>setAddS(false)} style={{padding:"8px 12px",borderRadius:7,border:`1.5px solid ${T.ib}`,background:T.surface,color:T.text,cursor:"pointer",fontSize:13}}>✕</button>
      </div>):(<div style={{display:"flex",gap:8}}>
        <select value={data.season||""} onChange={e=>f("season",e.target.value)} style={{flex:1,padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.ib}`,fontSize:13,outline:"none",background:T.ibg,color:T.text}}>
          <option value="">None</option>{seasons.map(s=><option key={s}>{s}</option>)}
        </select>
        <button onClick={()=>setAddS(true)} style={{padding:"0 12px",borderRadius:7,border:`1.5px solid ${T.ib}`,background:T.surface,cursor:"pointer",fontSize:18,color:T.sub}}>+</button>
      </div>)}
    </div>
    <Fld T={T} label="Colour" value={data.color||""} onChange={e=>f("color",e.target.value)} placeholder="e.g. Cream"/>
    <PhotoField value={data.imageUrl} onChange={v=>f("imageUrl",v)} T={T}/>
    <Fld T={T} label="Description" value={data.description||""} onChange={e=>f("description",e.target.value)} placeholder="Brief description…"/>
    <div style={{marginBottom:10}}>
      <label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Category *</label>
      <select value={data.category||""} onChange={e=>f("category",e.target.value)} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.ib}`,fontSize:13,outline:"none",background:T.ibg,color:T.text}}>
        <option value="">Select…</option>{cats.map(c=><option key={c}>{c}</option>)}
      </select>
    </div>
  </>);
}

function WishForm({data,onChange,T}){
  const f=(k,v)=>onChange({...data,[k]:v});
  const rrp=pp(data.rrp),now=pp(data.priceNow),saving=rrp>0&&now>0&&rrp>now?rrp-now:0,ws=data.rrp?.match(/^[^0-9]+/)?.[0]||"£";
  return(<>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
      <div style={{gridColumn:"1/-1"}}><Fld T={T} label="Name *" value={data.name||""} onChange={e=>f("name",e.target.value)} placeholder="e.g. Silk Dress"/></div>
      <div style={{gridColumn:"1/-1"}}><Fld T={T} label="Brand" value={data.brand||""} onChange={e=>f("brand",e.target.value)} placeholder="e.g. & Other Stories"/></div>
      <Fld T={T} label="RRP" value={data.rrp||""} onChange={e=>f("rrp",e.target.value)} placeholder="£120.00"/>
      <Fld T={T} label="Price Now" value={data.priceNow||""} onChange={e=>f("priceNow",e.target.value)} placeholder="£79.99"/>
    </div>
    {saving>0&&<div style={{background:"#f0faf4",border:"1px solid #c3e6cb",borderRadius:7,padding:"8px 12px",marginBottom:10,fontSize:13,color:"#2d6a4f",fontWeight:600}}>💰 You'd save {ws}{saving.toFixed(2)}!</div>}
    <Fld T={T} label="Colour" value={data.color||""} onChange={e=>f("color",e.target.value)} placeholder="e.g. Ivory"/>
    <PhotoField value={data.imageUrl} onChange={v=>f("imageUrl",v)} T={T}/>
    <Fld T={T} label="Notes" value={data.notes||""} onChange={e=>f("notes",e.target.value)} placeholder="e.g. Wait for sale…"/>
    <Fld T={T} label="Product URL" value={data.url||""} onChange={e=>f("url",e.target.value)} placeholder="https://…"/>
  </>);
}

// Shimmer component for loading states
function Shimmer({w="100%",h=16,r=6}){
  return<div style={{width:w,height:h,borderRadius:r,background:"linear-gradient(90deg,#f0eeec 25%,#e8e6e3 50%,#f0eeec 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>;
}

export default function App(){
  const[user,setUser]=useState(null);
  const[items,setItems]=useState([]);
  const[wishlist,setWishlist]=useState([]);
  const[cats,setCats]=useState([]);
  const[seasons,setSeasons]=useState(DEFAULT_SEASONS);
  const[outfits,setOutfits]=useState([]);
  const[profilePic,setProfilePic]=useState(null);
  const[displayName,setDisplayName]=useState("");
  const[darkMode,setDarkMode]=useState(false);
  const[weekPlan,setWeekPlan]=useState(Array(7).fill(null));
  const T=darkMode?DARK:LIGHT;

  const[view,setView]=useState("home");
  const[fCat,setFCat]=useState("All");
  const[fBrand,setFBrand]=useState("All");
  const[fSeason,setFSeason]=useState("All");
  const dragRef=useRef(null);
  const[dragOver,setDragOver]=useState(null);

  // Dress Me
  const[dressMeOpen,setDressMeOpen]=useState(false);
  const[dressMeItems,setDressMeItems]=useState([]);
  const[dressMeSaved,setDressMeSaved]=useState(false);

  // Micro-interaction
  const[popBtn,setPopBtn]=useState(null);
  const[savedFlash,setSavedFlash]=useState(false);

  // Add wardrobe
  const[addMode,setAddMode]=useState("url");
  const[addUrl,setAddUrl]=useState("");
  const[addCat,setAddCat]=useState("");
  const[fetchStep,setFetchStep]=useState("idle");
  const[fetchedData,setFetchedData]=useState(BLANK);
  const[manual,setManual]=useState(BLANK);
  const[addErr,setAddErr]=useState("");
  const[loadMsg,setLoadMsg]=useState("");

  // Add wishlist
  const[wishMode,setWishMode]=useState("url");
  const[wishUrl,setWishUrl]=useState("");
  const[wishFetchStep,setWishFetchStep]=useState("idle");
  const[wishFetched,setWishFetched]=useState(BLANK_WISH);
  const[wishManual,setWishManual]=useState(BLANK_WISH);
  const[wishErr,setWishErr]=useState("");
  const[wishLoadMsg,setWishLoadMsg]=useState("");

  // Outfits
  const[outfitTab,setOutfitTab]=useState("history");
  const[selItems,setSelItems]=useState([]);
  const[outfitName,setOutfitName]=useState("");
  const[outfitNotes,setOutfitNotes]=useState("");
  const[editOutfitId,setEditOutfitId]=useState(null);
  const[editOutfitForm,setEditOutfitForm]=useState({});
  const[genCats,setGenCats]=useState([]);
  const[genResult,setGenResult]=useState([]);
  const[genLocked,setGenLocked]=useState([]);
  const[genReasoning,setGenReasoning]=useState("");
  const[genLoading,setGenLoading]=useState(false);
  const[genErr,setGenErr]=useState("");
  const[genName,setGenName]=useState("");
  const[genStep,setGenStep]=useState("setup");

  // Week planner
  const[weekGenLoading,setWeekGenLoading]=useState(false);
  const[weekGenDay,setWeekGenDay]=useState(null);
  const[editWeekDay,setEditWeekDay]=useState(null);

  // Modals
  const[expanded,setExpanded]=useState(null);
  const[expandedWish,setExpandedWish]=useState(null);
  const[expandedOutfit,setExpandedOutfit]=useState(null);
  const[editId,setEditId]=useState(null);
  const[editForm,setEditForm]=useState({});
  const[editWishId,setEditWishId]=useState(null);
  const[editWishForm,setEditWishForm]=useState({});

  // Auth
  const[authMode,setAuthMode]=useState("login");
  const[authUser,setAuthUser]=useState("");
  const[authPass,setAuthPass]=useState("");
  const[authErr,setAuthErr]=useState("");
  const[changingUser,setChangingUser]=useState(false);
  const[newUsername,setNewUsername]=useState("");
  const[newCat,setNewCat]=useState("");

  // Inject global animations
  useEffect(()=>{
    const s=document.createElement("style");
    s.textContent=`
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes pop{0%{transform:scale(1)}40%{transform:scale(0.93)}70%{transform:scale(1.06)}100%{transform:scale(1)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes savedPulse{0%{background:#1a1a1a}50%{background:#2d6a4f}100%{background:#1a1a1a}}
      .pop-anim{animation:pop 0.25s ease}
      .slide-up{animation:slideUp 0.3s ease}
    `;
    document.head.appendChild(s);
    return()=>document.head.removeChild(s);
  },[]);

  const triggerPop=(id)=>{setPopBtn(id);setTimeout(()=>setPopBtn(null),300);};
  const triggerSaved=()=>{setSavedFlash(true);setTimeout(()=>setSavedFlash(false),1200);};

  useEffect(()=>{document.body.style.background=T.bg;},[darkMode]);
  useEffect(()=>{const s=localStorage.getItem("wd-session");if(s)loadUser(s);},[]);

  const loadUser=u=>{
    const ri=ls.get(ikey(u));setItems(ri?JSON.parse(ri.value):[]);
    const rc=ls.get(ckey(u));setCats(rc?JSON.parse(rc.value):[]);
    const rs=ls.get(skey(u));setSeasons(rs?JSON.parse(rs.value):DEFAULT_SEASONS);
    const rw=ls.get(wlkey(u));setWishlist(rw?JSON.parse(rw.value):[]);
    const ro=ls.get(okey(u));setOutfits(ro?JSON.parse(ro.value):[]);
    const rp=ls.get(pkey(u));setProfilePic(rp?rp.value:null);
    const dn=ls.get(`wd-dn-${u}`);setDisplayName(dn?dn.value:u.charAt(0).toUpperCase()+u.slice(1));
    const dm=ls.get(`wd-dark-${u}`);setDarkMode(dm?.value==="1");
    const rwp=ls.get(wpkey(u));setWeekPlan(rwp?JSON.parse(rwp.value):Array(7).fill(null));
    setUser(u);localStorage.setItem("wd-session",u);
  };

  const getAccts=()=>{const r=ls.get(ACCTS);return r?JSON.parse(r.value):{};};
  const handleAuth=()=>{
    setAuthErr("");
    const u=authUser.trim().toLowerCase(),p=authPass.trim();
    if(!u||!p){setAuthErr("Fill in both fields.");return;}
    const accts=getAccts();
    if(authMode==="login"){
      if(!accts[u]){setAuthErr("Account not found.");return;}
      if(accts[u]!==p){setAuthErr("Incorrect password.");return;}
    }else{
      if(accts[u]){setAuthErr("Username already taken.");return;}
      accts[u]=p;ls.set(ACCTS,JSON.stringify(accts));
    }
    loadUser(u);
  };
  const logout=()=>{setUser(null);setItems([]);setCats([]);setSeasons(DEFAULT_SEASONS);setWishlist([]);setOutfits([]);setProfilePic(null);ls.del("wd-session");};

  const saveItems   =v=>{setItems(v);   ls.set(ikey(user),JSON.stringify(v));};
  const saveCats    =v=>{setCats(v);    ls.set(ckey(user),JSON.stringify(v));};
  const saveSeasons =v=>{setSeasons(v); ls.set(skey(user),JSON.stringify(v));};
  const saveWishlist=v=>{setWishlist(v);ls.set(wlkey(user),JSON.stringify(v));};
  const saveOutfits =v=>{setOutfits(v); ls.set(okey(user),JSON.stringify(v));};
  const saveWeekPlan=v=>{setWeekPlan(v);ls.set(wpkey(user),JSON.stringify(v));};
  const addSeason   =s=>{if(!s||seasons.includes(s))return;saveSeasons([...seasons,s]);};
  const saveDisplayName=n=>{const cap=n.charAt(0).toUpperCase()+n.slice(1);setDisplayName(cap);ls.set(`wd-dn-${user}`,cap);};
  const toggleDark  =()=>{const d=!darkMode;setDarkMode(d);ls.set(`wd-dark-${user}`,d?"1":"0");};

  // Drag & drop
  const onDragStart=(e,id)=>{dragRef.current=id;e.dataTransfer.effectAllowed="move";};
  const onDragOver =(e,id)=>{e.preventDefault();setDragOver(id);};
  const onDrop     =(e,tid)=>{e.preventDefault();setDragOver(null);if(!dragRef.current||dragRef.current===tid)return;const a=[...items];const fi=a.findIndex(i=>i.id===dragRef.current),ti=a.findIndex(i=>i.id===tid);const[m]=a.splice(fi,1);a.splice(ti,0,m);saveItems(a);dragRef.current=null;};

  const markWorn=id=>{
    const updated=items.map(it=>it.id===id?{...it,lastWorn:new Date().toISOString(),wornCount:(it.wornCount||0)+1}:it);
    saveItems(updated);
    if(expanded?.id===id)setExpanded(updated.find(i=>i.id===id)||null);
  };

  // Dress Me
  const generateDressMe=()=>{
    if(items.length===0)return;
    const byCat={};
    items.forEach(i=>{if(!byCat[i.category])byCat[i.category]=[];byCat[i.category].push(i);});
    const outfit=Object.values(byCat).map(arr=>arr[Math.floor(Math.random()*arr.length)]);
    setDressMeItems(outfit);setDressMeSaved(false);
  };
  const wearThis=()=>{
    dressMeItems.forEach(item=>markWorn(item.id));
    triggerSaved();
    setDressMeOpen(false);
  };

  // Wardrobe CRUD
  const doFetch=async()=>{
    if(!addUrl.trim()||!addCat){setAddErr("URL and category required.");return;}
    setAddErr("");setFetchStep("loading");
    const msgs=["Fetching…","Extracting…","Finding image…","Almost done…"];
    let mi=0;setLoadMsg(msgs[0]);
    const iv=setInterval(()=>{mi=(mi+1)%msgs.length;setLoadMsg(msgs[mi]);},2200);
    try{const d=await fetchDetails(addUrl);setFetchedData({...BLANK,category:addCat,...d});setFetchStep("review");}
    catch(e){setAddErr(`Failed: ${e.message}. Try manually.`);setFetchStep("idle");}
    finally{clearInterval(iv);setLoadMsg("");}
  };
  const confirmFetched=()=>{
    if(!fetchedData.name.trim()||!fetchedData.category){setAddErr("Name and category required.");return;}
    saveItems([{id:Date.now(),url:addUrl,addedAt:new Date().toISOString(),...fetchedData},...items]);
    triggerSaved();setAddUrl("");setAddCat("");setFetchedData(BLANK);setFetchStep("idle");setView("grid");
  };
  const doAddManual=()=>{
    if(!manual.name.trim()||!manual.category){setAddErr("Name and category required.");return;}
    saveItems([{id:Date.now(),url:"",addedAt:new Date().toISOString(),...manual},...items]);
    triggerSaved();setManual(BLANK);setView("grid");
  };
  const deleteItem=id=>{saveItems(items.filter(i=>i.id!==id));setExpanded(null);};
  const openEdit  =item=>{setEditForm({...item});setEditId(item.id);setExpanded(null);};
  const saveEdit  =()=>{saveItems(items.map(i=>i.id===editId?{...i,...editForm}:i));triggerSaved();setEditId(null);};

  const doWishFetch=async()=>{
    if(!wishUrl.trim()){setWishErr("URL required.");return;}
    setWishErr("");setWishFetchStep("loading");
    const msgs=["Fetching…","Extracting…","Finding image…","Almost done…"];
    let mi=0;setWishLoadMsg(msgs[0]);
    const iv=setInterval(()=>{mi=(mi+1)%msgs.length;setWishLoadMsg(msgs[mi]);},2200);
    try{const d=await fetchDetails(wishUrl);setWishFetched({...BLANK_WISH,url:wishUrl,rrp:d.price||"",...d,price:undefined});setWishFetchStep("review");}
    catch(e){setWishErr(`Failed: ${e.message}.`);setWishFetchStep("idle");}
    finally{clearInterval(iv);setWishLoadMsg("");}
  };
  const confirmWishFetched=()=>{
    if(!wishFetched.name.trim()){setWishErr("Name required.");return;}
    saveWishlist([{id:Date.now(),addedAt:new Date().toISOString(),...wishFetched},...wishlist]);
    triggerSaved();setWishUrl("");setWishFetched(BLANK_WISH);setWishFetchStep("idle");setView("wishlist");
  };
  const doAddWishManual=()=>{
    if(!wishManual.name.trim()){setWishErr("Name required.");return;}
    saveWishlist([{id:Date.now(),addedAt:new Date().toISOString(),...wishManual},...wishlist]);
    triggerSaved();setWishManual(BLANK_WISH);setView("wishlist");
  };
  const deleteWish  =id=>{saveWishlist(wishlist.filter(w=>w.id!==id));setExpandedWish(null);};
  const openEditWish=item=>{setEditWishForm({...item});setEditWishId(item.id);setExpandedWish(null);};
  const saveEditWish=()=>{saveWishlist(wishlist.map(w=>w.id===editWishId?{...w,...editWishForm}:w));triggerSaved();setEditWishId(null);};
  const moveToWardrobe=item=>{
    if(cats.length===0){alert("Create a wardrobe category first!");return;}
    saveItems([{...item,category:cats[0],price:item.rrp||"",paidPrice:item.priceNow||"",productId:"",season:"",id:Date.now()},...items]);
    saveWishlist(wishlist.filter(w=>w.id!==item.id));setExpandedWish(null);
  };

  const toggleSel=id=>setSelItems(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const saveOutfit=()=>{
    if(!outfitName.trim()||selItems.length===0)return;
    const its=selItems.map(id=>items.find(i=>i.id===id)).filter(Boolean);
    saveOutfits([{id:Date.now(),name:outfitName,notes:outfitNotes,itemIds:[...selItems],totalPaid:its.reduce((s,i)=>s+pp(i.paidPrice||i.price),0),totalVal:its.reduce((s,i)=>s+pp(i.price),0),createdAt:new Date().toISOString(),rating:null},...outfits]);
    triggerSaved();setSelItems([]);setOutfitName("");setOutfitNotes("");setOutfitTab("history");
  };
  const rateOutfit=(id,rating)=>saveOutfits(outfits.map(o=>o.id===id?{...o,rating:o.rating===rating?null:rating}:o));
  const deleteOutfit=id=>{saveOutfits(outfits.filter(o=>o.id!==id));setExpandedOutfit(null);};
  const openEditOutfit=o=>{setEditOutfitForm({...o});setEditOutfitId(o.id);setExpandedOutfit(null);setOutfitTab("edit");};
  const saveEditOutfit=()=>{
    const its=editOutfitForm.itemIds.map(id=>items.find(i=>i.id===id)).filter(Boolean);
    saveOutfits(outfits.map(o=>o.id===editOutfitId?{...o,...editOutfitForm,totalPaid:its.reduce((s,i)=>s+pp(i.paidPrice||i.price),0),totalVal:its.reduce((s,i)=>s+pp(i.price),0)}:o));
    triggerSaved();setEditOutfitId(null);setOutfitTab("history");
  };

  const toggleGenCat=c=>setGenCats(s=>s.includes(c)?s.filter(x=>x!==c):[...s,c]);
  const toggleLock  =id=>setGenLocked(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const generateOutfit=async()=>{
    if(genCats.length===0){setGenErr("Select at least one category.");return;}
    const avail=items.filter(i=>genCats.includes(i.category)&&!genLocked.includes(i.id));
    if(avail.length===0){setGenErr("No unlocked items in selected categories.");return;}
    setGenLoading(true);setGenErr("");
    const locked=items.filter(i=>genLocked.includes(i.id));
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,
          system:`You are a fashion stylist. Select items to create a cohesive outfit, one per category. Consider color harmony and style. Return ONLY JSON: {"selectedIds":[numeric ids],"reasoning":"2-3 sentence style note"}`,
          messages:[{role:"user",content:`Create an outfit. Categories: ${genCats.join(", ")}. Locked items (keep): ${JSON.stringify(locked.map(i=>({id:i.id,name:i.name,color:i.color||"",category:i.category})))}. Choose from: ${JSON.stringify(avail.map(i=>({id:i.id,name:i.name,brand:i.brand||"",color:i.color||"",category:i.category,description:i.description||""})))}`}]})});
      if(!res.ok) throw new Error(`API ${res.status}`);
      const data=await res.json();
      const text=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      const clean=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1));
      setGenResult([...genLocked,...(parsed.selectedIds||[])]);
      setGenReasoning(parsed.reasoning||"");
      setGenStep("result");
    }catch(e){setGenErr(`Generation failed: ${e.message}`);}
    finally{setGenLoading(false);}
  };
  const saveGenOutfit=()=>{
    if(!genName.trim()||genResult.length===0)return;
    const its=genResult.map(id=>items.find(i=>i.id===id)).filter(Boolean);
    saveOutfits([{id:Date.now(),name:genName,notes:"✨ AI Generated",itemIds:[...genResult],totalPaid:its.reduce((s,i)=>s+pp(i.paidPrice||i.price),0),totalVal:its.reduce((s,i)=>s+pp(i.price),0),createdAt:new Date().toISOString(),rating:null},...outfits]);
    triggerSaved();setGenResult([]);setGenLocked([]);setGenReasoning("");setGenName("");setGenStep("setup");setOutfitTab("history");
  };

  // Weekly planner
  const getWeekDays=()=>{
    const now=new Date(),dow=now.getDay(),mon=new Date(now);
    mon.setDate(now.getDate()-(dow===0?6:dow-1));
    return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
  };
  const setDayOutfit=(dayIdx,outfit)=>{
    const wp=[...weekPlan];wp[dayIdx]=outfit;saveWeekPlan(wp);
  };
  const clearDay=(dayIdx)=>{
    const wp=[...weekPlan];wp[dayIdx]=null;saveWeekPlan(wp);
  };
  const generateDayOutfit=async(dayIdx)=>{
    if(items.length===0)return;
    setWeekGenLoading(true);setWeekGenDay(dayIdx);
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:400,
          system:`You are a fashion stylist. Create a cohesive daily outfit from the available items. Return ONLY JSON: {"selectedIds":[numeric ids],"name":"outfit name","reasoning":"1 sentence"}`,
          messages:[{role:"user",content:`Create an outfit for ${DAYS_OF_WEEK[dayIdx]}. Available items: ${JSON.stringify(items.map(i=>({id:i.id,name:i.name,color:i.color||"",category:i.category,brand:i.brand||""})))}`}]})});
      if(!res.ok) throw new Error(`API ${res.status}`);
      const data=await res.json();
      const text=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      const clean=text.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1));
      setDayOutfit(dayIdx,{itemIds:parsed.selectedIds||[],name:parsed.name||DAYS_OF_WEEK[dayIdx],reasoning:parsed.reasoning||""});
    }catch(e){console.error(e);}
    finally{setWeekGenLoading(false);setWeekGenDay(null);}
  };

  const doChangeUsername=()=>{
    const nu=newUsername.trim().toLowerCase();if(!nu)return;
    const accts=getAccts();if(accts[nu]){alert("Username taken.");return;}
    accts[nu]=accts[user];delete accts[user];ls.set(ACCTS,JSON.stringify(accts));
    ["items","cats","seasons","wish","outfits"].forEach(k=>{const r=ls.get(`wd-${k}-${user}`);if(r)ls.set(`wd-${k}-${nu}`,r.value);ls.del(`wd-${k}-${user}`);});
    const pic=ls.get(pkey(user));if(pic)ls.set(pkey(nu),pic.value);ls.del(pkey(user));
    const dm=ls.get(`wd-dark-${user}`);if(dm)ls.set(`wd-dark-${nu}`,dm.value);ls.del(`wd-dark-${user}`);
    setUser(nu);localStorage.setItem("wd-session",nu);setChangingUser(false);setNewUsername("");
  };

  const addCatFn=()=>{const t=newCat.trim();if(!t||cats.map(c=>c.toLowerCase()).includes(t.toLowerCase()))return;saveCats([...cats,t]);setNewCat("");};
  const delCat  =c=>{saveCats(cats.filter(x=>x!==c));if(fCat===c)setFCat("All");};

  // Computed
  const brands_f=["All",...Array.from(new Set(items.map(i=>i.brand).filter(Boolean))).sort()];
  const seasons_f=["All",...Array.from(new Set(items.map(i=>i.season).filter(Boolean))).sort()];
  const filtered=items.filter(i=>(fCat==="All"||i.category===fCat)&&(fBrand==="All"||i.brand===fBrand)&&(fSeason==="All"||i.season===fSeason));
  const SYM=symOf([...items,...wishlist]);
  const totalWorth=items.reduce((s,i)=>s+pp(i.price),0);
  const totalPaid =items.reduce((s,i)=>s+pp(i.paidPrice||i.price),0);
  const totalWish =wishlist.reduce((s,w)=>s+pp(w.priceNow||w.rrp),0);

  // Insights
  const nowDate=new Date();
  const monthStart=new Date(nowDate.getFullYear(),nowDate.getMonth(),1).toISOString();
  const weekStart=new Date(nowDate.getTime()-7*864e5).toISOString();
  const wornThisMonth=items.filter(i=>i.lastWorn&&i.lastWorn>=monthStart).length;
  const neverWorn=items.filter(i=>!i.lastWorn);
  const unworn60=items.filter(i=>daysSince(i.lastWorn)!==null&&daysSince(i.lastWorn)>=60||(!i.lastWorn&&items.length>0));
  const mostWornItem=[...items].sort((a,b)=>(b.wornCount||0)-(a.wornCount||0))[0];
  const leastWornItem=[...items].filter(i=>i.wornCount>0).sort((a,b)=>(a.wornCount||0)-(b.wornCount||0))[0];
  const outfitsThisWeek=outfits.filter(o=>o.createdAt>=weekStart).length;
  const favColour=(()=>{const cc={};items.forEach(i=>{if(i.color){const c=i.color.toLowerCase().trim();cc[c]=(cc[c]||0)+1;}});return Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0];})();
  const favBrand=(()=>{const bc={};items.forEach(i=>{if(i.brand){bc[i.brand]=(bc[i.brand]||0)+1;}});return Object.entries(bc).sort((a,b)=>b[1]-a[1])[0]?.[0];})();
  const avgCostPerWear=(()=>{const worn=items.filter(i=>i.wornCount>0&&pp(i.paidPrice||i.price)>0);if(worn.length===0)return null;return worn.reduce((s,i)=>s+pp(i.paidPrice||i.price)/(i.wornCount||1),0)/worn.length;})();
  const totalWears=items.reduce((s,i)=>s+(i.wornCount||0),0);

  // Styles
  const inp={width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.ib}`,fontSize:13,outline:"none",boxSizing:"border-box",background:T.ibg,color:T.text};
  const makePb=(id)=>({background:savedFlash&&id==="save"?"#2d6a4f":"#1a1a1a",color:"#fff",padding:"10px 20px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,transition:"background 0.3s",className:popBtn===id?"pop-anim":""});
  const pb={background:"#1a1a1a",color:"#fff",padding:"10px 20px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600};
  const sb={background:T.surface,color:T.text,padding:"9px 16px",borderRadius:7,border:`1.5px solid ${T.ib}`,cursor:"pointer",fontSize:13};
  const card={background:T.surface,borderRadius:11,overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"};
  const errS={color:"#c0392b",fontSize:13,marginBottom:11,padding:"8px 12px",background:"#fdf0ef",borderRadius:6};
  const badge={fontSize:10,padding:"2px 7px",borderRadius:9,background:T.badge,color:T.bt,display:"inline-block"};
  const tabS=a=>({flex:1,padding:"7px 0",border:"none",background:a?T.surface:"transparent",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:a?700:400,color:a?T.text:T.sub,boxShadow:a?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.15s"});
  const nb=a=>({padding:"6px 13px",borderRadius:18,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,background:a?"#1a1a1a":"transparent",color:a?"#fff":T.sub,transition:"all 0.15s"});
  const chip=a=>({padding:"4px 11px",borderRadius:13,border:`1.5px solid ${a?"#1a1a1a":T.ib}`,background:a?"#1a1a1a":T.surface,color:a?"#fff":T.sub,fontSize:12,cursor:"pointer",fontWeight:a?600:400,whiteSpace:"nowrap",transition:"all 0.15s"});
  const form={background:T.surface,borderRadius:14,padding:24,border:`1px solid ${T.border}`,maxWidth:510};
  const ov={position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16,animation:"fadeIn 0.2s ease"};
  const mod={background:T.surface,borderRadius:14,maxWidth:420,width:"100%",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",animation:"slideUp 0.25s ease"};

  if(!user)return(
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:16,padding:30,border:`1px solid ${T.border}`,width:"100%",maxWidth:330,boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        <div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:34}}>👗</div><div style={{fontSize:18,fontWeight:700,marginTop:8,color:T.text}}>Wardrobe</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>Your personal clothing directory</div></div>
        <div style={{display:"flex",background:T.badge,borderRadius:8,padding:3,marginBottom:18}}>
          {["login","signup"].map(m=><button key={m} style={tabS(authMode===m)} onClick={()=>{setAuthMode(m);setAuthErr("");}}>{m==="login"?"Log In":"Sign Up"}</button>)}
        </div>
        {authErr&&<div style={errS}>{authErr}</div>}
        <Fld T={T} label="Username" value={authUser} onChange={e=>setAuthUser(e.target.value)} placeholder="e.g. sarah" onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
        <Fld T={T} label="Password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
        <button style={{...pb,width:"100%",marginTop:4}} onClick={handleAuth}>{authMode==="login"?"Log In":"Create Account"}</button>
        <p style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:12,marginBottom:0}}>Data stored in your browser.</p>
      </div>
    </div>
  );

  const navs=[["home","My Wardrobe"],["add","+ Add Item"],["grid","Directory"],["wishlist","✨ Wishlist"],["outfits","👗 Outfits"],["stats","📊 Stats"],["manage","Categories"],["profile","Profile"]];
  const weekDays=getWeekDays();

  return(
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:T.bg,color:T.text}}>
      {/* SAVED FLASH */}
      {savedFlash&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"#2d6a4f",color:"#fff",padding:"10px 20px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:200,animation:"slideUp 0.2s ease",pointerEvents:"none"}}>✓ Saved!</div>}

      <div style={{background:T.nav,borderBottom:`1px solid ${T.nb}`,padding:"11px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {profilePic?<img src={profilePic} style={{width:30,height:30,borderRadius:"50%",objectFit:"cover"}} alt=""/>
            :<div style={{width:30,height:30,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff"}}>{user[0].toUpperCase()}</div>}
          <span style={{fontSize:15,fontWeight:700,color:T.text}}>{displayName}'s Wardrobe</span>
        </div>
        <div style={{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap"}}>
          {navs.map(([v,l])=><button key={v} style={nb(view===v)} onClick={()=>{triggerPop(v);setView(v);}}>{l}</button>)}
          <div style={{width:1,height:16,background:T.border,margin:"0 2px"}}/>
          <button onClick={toggleDark} style={{...nb(false),fontSize:14}}>{darkMode?"☀️":"🌙"}</button>
          <button style={{...nb(false),color:"#c0392b"}} onClick={logout}>Log out</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"18px 14px"}}>

        {/* ── HOME ── */}
        {view==="home"&&<div style={{maxWidth:680,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
            {profilePic?<img src={profilePic} style={{width:56,height:56,borderRadius:"50%",objectFit:"cover"}} alt=""/>
              :<div style={{width:56,height:56,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff"}}>{user[0].toUpperCase()}</div>}
            <div>
              <div style={{fontSize:22,fontWeight:800,color:T.text}}>Hi, {displayName} 👋</div>
              <div style={{fontSize:14,color:T.sub,marginTop:2}}>Welcome to your personal wardrobe assistant.</div>
            </div>
          </div>

          {/* DRESS ME */}
          {items.length>0&&<button onClick={()=>{generateDressMe();setDressMeOpen(true);triggerPop("dressme");}}
            style={{width:"100%",padding:"18px",borderRadius:14,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",fontSize:18,fontWeight:800,marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 4px 20px rgba(102,126,234,0.4)",transition:"transform 0.15s",animation:popBtn==="dressme"?"pop 0.25s ease":undefined}}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            <span style={{fontSize:28}}>✨</span> Dress Me
          </button>}

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24}}>
            {[{icon:"👗",label:"Items",value:items.length,action:"grid"},{icon:"✨",label:"Wishlist",value:wishlist.length,action:"wishlist"},{icon:"🎨",label:"Outfits",value:outfits.length,action:"outfits"}].map(({icon,label,value,action})=>(
              <div key={label} onClick={()=>setView(action)} style={{background:T.surface,borderRadius:12,padding:"16px 14px",border:`1px solid ${T.border}`,cursor:"pointer",textAlign:"center",transition:"transform 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="scale(1.03)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
                <div style={{fontSize:22,fontWeight:800,color:T.text}}>{value}</div>
                <div style={{fontSize:12,color:T.muted}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Insights */}
          {items.length>0&&<>
            <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>Wardrobe Insights</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
              <div style={{background:T.surface,borderRadius:12,padding:16,border:`1px solid ${T.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>Worn this month</div>
                  <div style={{fontSize:13,fontWeight:700,color:wornThisMonth/items.length>0.5?"#2d6a4f":"#e67e22"}}>{Math.round(wornThisMonth/items.length*100)||0}%</div>
                </div>
                <div style={{height:6,borderRadius:3,background:T.badge,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,background:wornThisMonth/items.length>0.5?"#2d6a4f":"#e67e22",width:`${Math.round(wornThisMonth/items.length*100)||0}%`,transition:"width 0.6s ease"}}/>
                </div>
                <div style={{fontSize:12,color:T.muted,marginTop:6}}>{wornThisMonth} of {items.length} items · {items.length-wornThisMonth} unworn this month</div>
              </div>
              {unworn60.length>0&&<div style={{background:T.surface,borderRadius:12,padding:16,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>⚠️ {unworn60.length} items not worn in 60+ days</div>
                <div style={{fontSize:12,color:T.muted,marginBottom:10}}>Consider donating or selling what you never reach for</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{unworn60.slice(0,5).map(item=>(
                  <div key={item.id} onClick={()=>setExpanded(item)} style={{cursor:"pointer",textAlign:"center"}}>
                    <Img src={item.imageUrl} alt={item.name} style={{width:48,height:48,objectFit:"cover",borderRadius:7,display:"block"}}/>
                    <div style={{fontSize:9,color:T.muted,marginTop:2,width:48,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                  </div>
                ))}{unworn60.length>5&&<div style={{width:48,height:48,borderRadius:7,background:T.badge,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:T.sub}}>+{unworn60.length-5}</div>}</div>
              </div>}
            </div>
          </>}

          <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>What you can do</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[{icon:"➕",title:"Add Items",desc:"Paste a product URL for auto-fetch, or add manually with photos.",action:"add",col:"#f0faf4"},{icon:"👗",title:"Outfit Directory",desc:"Browse in an Instagram-style gallery. Drag to reorder, filter by brand or season.",action:"grid",col:"#f0f4ff"},{icon:"✨",title:"Wishlist",desc:"Save items you want. Track RRP vs sale price and move to wardrobe once bought.",action:"wishlist",col:"#fdf0ef"},{icon:"🎨",title:"AI Outfit Generator",desc:"Let AI build outfits from your wardrobe. Lock pieces you love and regenerate the rest.",action:"outfits",col:"#f5f0ff"},{icon:"📊",title:"Your Stats",desc:"See your most worn items, favourite colours, cost per wear and more.",action:"stats",col:"#fff8f0"}].map(({icon,title,desc,action,col})=>(
              <div key={title} onClick={()=>setView(action)} style={{background:T.surface,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`,cursor:"pointer",display:"flex",gap:12,alignItems:"flex-start",transition:"transform 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.transform="translateX(4px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
                <div style={{width:38,height:38,borderRadius:9,background:col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{icon}</div>
                <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:2}}>{title}</div><div style={{fontSize:12,color:T.sub,lineHeight:1.5}}>{desc}</div></div>
                <div style={{color:T.muted,fontSize:18,alignSelf:"center"}}>›</div>
              </div>
            ))}
          </div>
          {items.length>0&&<div style={{background:"#1a1a1a",borderRadius:12,padding:20,marginTop:14,color:"#fff"}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",opacity:0.5,marginBottom:4}}>Total Wardrobe Value</div>
            <div style={{fontSize:30,fontWeight:800}}>{SYM}{totalWorth.toFixed(2)}</div>
            {totalWorth-totalPaid>0&&<div style={{fontSize:12,opacity:0.5,marginTop:3}}>Saved {SYM}{(totalWorth-totalPaid).toFixed(2)} vs listed prices</div>}
          </div>}
        </div>}

        {/* ── GRID ── */}
        {view==="grid"&&<>
          {(cats.length>0||brands_f.length>1||seasons_f.length>1)&&(
            <div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:8}}>
              {cats.length>0&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:5}}>Category</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{["All",...cats].map(c=><button key={c} style={chip(fCat===c)} onClick={()=>setFCat(c)}>{c}</button>)}</div></div>}
              {brands_f.length>1&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:5}}>Brand</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{brands_f.map(b=><button key={b} style={chip(fBrand===b)} onClick={()=>setFBrand(b)}>{b}</button>)}</div></div>}
              {seasons_f.length>1&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:5}}>Season</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{seasons_f.map(s=><button key={s} style={chip(fSeason===s)} onClick={()=>setFSeason(s)}>{s}</button>)}</div></div>}
            </div>
          )}
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>
              <div style={{fontSize:48,marginBottom:12}}>👚</div>
              <div style={{fontSize:16,fontWeight:700,color:T.sub,marginBottom:8}}>{items.length===0?"Your wardrobe is empty":"No items match"}</div>
              {items.length===0&&<><div style={{fontSize:13,marginBottom:16}}>Start building your digital wardrobe — add your first item 👇</div><button style={pb} onClick={()=>setView("add")}>+ Add your first item</button></>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
              {filtered.map(item=>{
                const wl=wornLabel(item),isDO=dragOver===item.id&&dragRef.current!==item.id;
                return(
                  <div key={item.id} draggable onDragStart={e=>onDragStart(e,item.id)} onDragOver={e=>onDragOver(e,item.id)} onDrop={e=>onDrop(e,item.id)} onDragLeave={()=>setDragOver(null)}
                    style={{aspectRatio:"1",position:"relative",overflow:"hidden",cursor:"grab",outline:isDO?"3px solid #6c63ff":"none",borderRadius:2,opacity:dragRef.current===item.id?0.5:1,transition:"opacity 0.2s"}}>
                    {item.imageUrl?<img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",pointerEvents:"none"}} onError={e=>e.target.style.display="none"}/>
                      :<div style={{width:"100%",height:"100%",background:T.badge,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>👗</div>}
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 40%,rgba(0,0,0,0.85))",opacity:0,transition:"opacity 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}
                      onClick={()=>setExpanded(item)}>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 10px"}}>
                        <div style={{color:"#fff",fontSize:12,fontWeight:600,lineHeight:1.3}}>{item.name}</div>
                        {(item.paidPrice||item.price)&&<div style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>{item.paidPrice||item.price}</div>}
                        <div style={{fontSize:10,marginTop:2,color:wl.col,fontWeight:500}}>{wl.text}</div>
                      </div>
                    </div>
                    <div style={{position:"absolute",bottom:4,left:4,background:"rgba(0,0,0,0.55)",borderRadius:6,padding:"2px 6px",fontSize:9,color:wl.col,fontWeight:600,pointerEvents:"none"}}>{wl.text}</div>
                    <div style={{position:"absolute",top:4,right:4,display:"flex",gap:3}}>
                      <button onClick={e=>{e.stopPropagation();triggerPop(`w${item.id}`);markWorn(item.id);}} title="Mark worn today" style={{background:"rgba(0,0,0,0.55)",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",color:"#fff",fontSize:10,animation:popBtn===`w${item.id}`?"pop 0.25s ease":undefined}}>👗</button>
                      <button onClick={e=>{e.stopPropagation();openEdit(item);}} style={{background:"rgba(0,0,0,0.55)",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",color:"#fff",fontSize:10}}>✏️</button>
                      <button onClick={e=>{e.stopPropagation();deleteItem(item.id);}} style={{background:"rgba(0,0,0,0.55)",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",color:"#fff",fontSize:10}}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {filtered.length>0&&<div style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:10}}>Drag to reorder · hover for details · 👗 to log worn</div>}
        </>}

        {/* ── WISHLIST ── */}
        {view==="wishlist"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><h2 style={{margin:0,fontSize:18,color:T.text}}>✨ Wishlist</h2><div style={{fontSize:13,color:T.muted,marginTop:2}}>{wishlist.length} items · {SYM}{totalWish.toFixed(2)}</div></div>
            <button style={pb} onClick={()=>setView("wishadd")}>+ Add to Wishlist</button>
          </div>
          {wishlist.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>
              <div style={{fontSize:48,marginBottom:12}}>✨</div>
              <div style={{fontSize:16,fontWeight:700,color:T.sub,marginBottom:8}}>Your wishlist is empty</div>
              <div style={{fontSize:13,marginBottom:16}}>Save items you're eyeing up and track prices 🛍️</div>
              <button style={pb} onClick={()=>setView("wishadd")}>+ Add your first wish</button>
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:13}}>
              {wishlist.map(item=>{
                const rrp=pp(item.rrp),now2=pp(item.priceNow),saving=rrp>0&&now2>0&&rrp>now2?rrp-now2:0,ws=item.rrp?.match(/^[^0-9]+/)?.[0]||"£";
                return(<div key={item.id} style={{...card,border:"1px solid #e8dff5"}}>
                  <div onClick={()=>setExpandedWish(item)} style={{cursor:"pointer"}}><Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:200,objectFit:"cover",display:"block"}}/></div>
                  <div style={{padding:"10px 12px 0",cursor:"pointer"}} onClick={()=>setExpandedWish(item)}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:T.text}}>{item.name}</div>
                    {item.brand&&<div style={{fontSize:11,color:T.sub,marginBottom:2}}>{item.brand}</div>}
                    <div style={{display:"flex",gap:5,alignItems:"baseline",marginBottom:2}}>
                      {item.priceNow&&<span style={{fontSize:13,fontWeight:700,color:T.text}}>{item.priceNow}</span>}
                      {item.rrp&&item.rrp!==item.priceNow&&<span style={{fontSize:11,color:T.muted,textDecoration:item.priceNow?"line-through":"none"}}>{item.rrp}</span>}
                    </div>
                    {saving>0&&<div style={{fontSize:11,color:"#2d6a4f",fontWeight:600,marginBottom:6}}>Save {ws}{saving.toFixed(2)}</div>}
                  </div>
                  <div style={{borderTop:`1px solid ${T.border}`,display:"flex"}}>
                    <button onClick={()=>openEditWish(item)} style={{flex:1,padding:"8px 0",border:"none",background:"none",cursor:"pointer",fontSize:12,color:T.sub}}>✏️ Edit</button>
                    <button onClick={()=>deleteWish(item.id)} style={{flex:1,padding:"8px 0",border:"none",background:"none",cursor:"pointer",fontSize:12,color:"#c0392b",borderLeft:`1px solid ${T.border}`}}>🗑</button>
                  </div>
                </div>);
              })}
            </div>
          )}
        </>}

        {/* ── ADD WISHLIST ── */}
        {view==="wishadd"&&<div style={form}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <button onClick={()=>setView("wishlist")} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:T.muted}}>←</button>
            <h2 style={{margin:0,fontSize:18,color:T.text}}>Add to Wishlist</h2>
          </div>
          <div style={{display:"flex",background:T.badge,borderRadius:8,padding:3,marginBottom:16}}>
            <button style={tabS(wishMode==="url")} onClick={()=>{setWishMode("url");setWishErr("");setWishFetchStep("idle");}}>From URL</button>
            <button style={tabS(wishMode==="manual")} onClick={()=>{setWishMode("manual");setWishErr("");}}>Manually</button>
          </div>
          {wishErr&&<div style={errS}>{wishErr}</div>}
          {wishMode==="url"&&<>
            {wishFetchStep==="idle"&&<><Fld T={T} label="Product URL" placeholder="https://…" value={wishUrl} onChange={e=>setWishUrl(e.target.value)}/><button style={{...pb,width:"100%"}} onClick={doWishFetch}>Fetch Details</button></>}
            {wishFetchStep==="loading"&&<div style={{padding:"20px 0"}}><Shimmer h={12} r={6}/><div style={{marginTop:10}}><Shimmer w="60%" h={10}/></div><div style={{marginTop:8}}><Shimmer w="80%" h={10}/></div></div>}
            {wishFetchStep==="review"&&<><div style={{background:"#f0faf4",border:"1px solid #c3e6cb",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:13,color:"#2d6a4f"}}>✅ Fetched! Fill in the prices.</div><WishForm data={wishFetched} onChange={setWishFetched} T={T}/><div style={{display:"flex",gap:8,marginTop:6}}><button style={{...pb,flex:1}} onClick={confirmWishFetched}>Save to Wishlist</button><button style={sb} onClick={()=>{setWishFetchStep("idle");setWishErr("");}}>← Back</button></div></>}
          </>}
          {wishMode==="manual"&&<><WishForm data={wishManual} onChange={setWishManual} T={T}/><button style={{...pb,width:"100%",marginTop:4}} onClick={doAddWishManual}>Add to Wishlist</button></>}
        </div>}

        {/* ── OUTFITS ── */}
        {view==="outfits"&&<>
          <div style={{display:"flex",background:T.badge,borderRadius:10,padding:3,marginBottom:20,maxWidth:600}}>
            {[["generate","✨ Generate"],["create","🎨 Create"],["history","📋 History"],["week","📅 Week"]].map(([t,l])=><button key={t} style={tabS(outfitTab===t)} onClick={()=>setOutfitTab(t)}>{l}</button>)}
          </div>

          {/* GENERATE */}
          {outfitTab==="generate"&&<>
            {items.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>
                <div style={{fontSize:48,marginBottom:12}}>✨</div>
                <div style={{fontSize:16,fontWeight:700,color:T.sub,marginBottom:8}}>No items yet</div>
                <button style={pb} onClick={()=>setView("add")}>+ Add your first item</button>
              </div>
            ):<>
              {genStep==="setup"&&<div style={{maxWidth:560}}>
                <div style={{fontSize:14,color:T.sub,marginBottom:14}}>Pick categories and let AI build the best outfit from your wardrobe.</div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:8}}>Categories</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{cats.map(c=><button key={c} style={chip(genCats.includes(c))} onClick={()=>toggleGenCat(c)}>{c} <span style={{opacity:0.6,fontSize:11}}>({items.filter(i=>i.category===c).length})</span></button>)}</div>
                </div>
                {genErr&&<div style={errS}>{genErr}</div>}
                {genLoading?(
                  <div style={{borderRadius:12,overflow:"hidden",padding:16,background:T.badge}}>
                    <Shimmer h={14} r={6}/><div style={{marginTop:8}}><Shimmer w="70%" h={10}/></div><div style={{marginTop:6}}><Shimmer w="50%" h={10}/></div>
                  </div>
                ):(
                  <button style={{...pb,display:"flex",alignItems:"center",gap:8,justifyContent:"center",width:"100%",opacity:genCats.length===0?0.4:1}} onClick={generateOutfit} disabled={genCats.length===0}>
                    <span style={{fontSize:18}}>✨</span>Generate Outfit
                  </button>
                )}
              </div>}
              {genStep==="result"&&<div style={{maxWidth:700}}>
                <div style={{background:"linear-gradient(135deg,#667eea,#764ba2)",borderRadius:12,padding:18,marginBottom:20,color:"#fff"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",marginBottom:6,opacity:0.8}}>✨ STYLIST NOTE</div>
                  <div style={{fontSize:14,lineHeight:1.6}}>{genReasoning}</div>
                </div>
                <div style={{fontSize:12,color:T.muted,marginBottom:10}}>🔒 Lock pieces to keep, regenerate for new suggestions on the rest</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:20}}>
                  {genResult.map(id=>{
                    const item=items.find(i=>i.id===id);if(!item)return null;
                    const locked=genLocked.includes(id);
                    return(<div key={id} style={{borderRadius:10,overflow:"hidden",border:`2px solid ${locked?"#6c63ff":T.border}`,position:"relative",background:T.surface,transition:"border-color 0.2s"}}>
                      <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:150,objectFit:"cover",display:"block"}}/>
                      <button onClick={()=>toggleLock(id)} style={{position:"absolute",top:6,right:6,background:locked?"#6c63ff":"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>{locked?"🔒":"🔓"}</button>
                      <div style={{padding:"8px 10px"}}>
                        <div style={{fontSize:12,fontWeight:600,color:T.text,lineHeight:1.3,marginBottom:2}}>{item.name}</div>
                        <div style={{fontSize:10,color:T.muted}}>{item.category}{item.color?` · ${item.color}`:""}</div>
                        {(item.paidPrice||item.price)&&<div style={{fontSize:11,fontWeight:700,color:"#2d6a4f",marginTop:2}}>{item.paidPrice||item.price}</div>}
                      </div>
                    </div>);
                  })}
                </div>
                <div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>Save this outfit</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8}}>
                    <input style={inp} value={genName} onChange={e=>setGenName(e.target.value)} placeholder="Outfit name…" onKeyDown={e=>e.key==="Enter"&&saveGenOutfit()}/>
                    <button style={{...pb,whiteSpace:"nowrap",opacity:!genName.trim()?0.4:1}} onClick={saveGenOutfit} disabled={!genName.trim()}>💾 Save</button>
                    <button style={{...sb,whiteSpace:"nowrap"}} onClick={generateOutfit} disabled={genLoading}>{genLoading?"…":"↻ Regenerate"}</button>
                  </div>
                  <button style={{...sb,marginTop:10,fontSize:12}} onClick={()=>{setGenStep("setup");setGenResult([]);setGenLocked([]);setGenReasoning("");}}>← Change Categories</button>
                </div>
              </div>}
            </>}
          </>}

          {/* CREATE */}
          {outfitTab==="create"&&<>
            {items.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>
                <div style={{fontSize:48,marginBottom:12}}>🎨</div>
                <div style={{fontSize:16,fontWeight:700,color:T.sub,marginBottom:8}}>Nothing to put together yet</div>
                <button style={pb} onClick={()=>setView("add")}>+ Add your first item</button>
              </div>
            ):<div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 300px",minWidth:280}}>
                <div style={{fontSize:13,fontWeight:600,color:T.sub,marginBottom:10}}>Select items from your wardrobe</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8,maxHeight:480,overflowY:"auto"}}>
                  {items.map(item=>{
                    const sel=selItems.includes(item.id);
                    return(<div key={item.id} onClick={()=>{toggleSel(item.id);triggerPop(`sel${item.id}`);}} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden",cursor:"pointer",position:"relative",border:`3px solid ${sel?"#6c63ff":"transparent"}`,boxSizing:"border-box",transition:"border-color 0.15s",animation:popBtn===`sel${item.id}`?"pop 0.25s ease":undefined}}>
                      <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      {sel&&<div style={{position:"absolute",top:4,right:4,background:"#6c63ff",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>✓</div>}
                      <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.5)",padding:"3px 5px"}}><div style={{color:"#fff",fontSize:9,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{item.name}</div></div>
                    </div>);
                  })}
                </div>
              </div>
              <div style={{flex:"0 0 260px"}}>
                <div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`,position:"sticky",top:20}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12}}>Your Outfit</div>
                  {selItems.length===0?<div style={{color:T.muted,fontSize:13,marginBottom:16}}>Select items on the left →</div>:(
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                      {selItems.map(id=>{const item=items.find(i=>i.id===id);if(!item)return null;return(
                        <div key={id} style={{position:"relative"}}>
                          <Img src={item.imageUrl} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:7,display:"block"}}/>
                          <button onClick={()=>toggleSel(id)} style={{position:"absolute",top:-4,right:-4,background:"#c0392b",border:"none",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",fontSize:9,padding:0}}>✕</button>
                        </div>
                      );})}
                    </div>
                  )}
                  {selItems.length>0&&<div style={{background:T.badge,borderRadius:8,padding:"10px 12px",marginBottom:14}}>
                    <div style={{fontSize:11,color:T.muted,marginBottom:2}}>Total cost</div>
                    <div style={{fontSize:22,fontWeight:800,color:T.text}}>{SYM}{selItems.map(id=>items.find(i=>i.id===id)).filter(Boolean).reduce((s,i)=>s+pp(i.paidPrice||i.price),0).toFixed(2)}</div>
                  </div>}
                  <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Outfit Name *</label><input style={inp} value={outfitName} onChange={e=>setOutfitName(e.target.value)} placeholder="e.g. Casual Friday"/></div>
                  <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Notes</label><input style={inp} value={outfitNotes} onChange={e=>setOutfitNotes(e.target.value)} placeholder="e.g. Summer wedding…"/></div>
                  <button style={{...pb,width:"100%",opacity:(!outfitName.trim()||selItems.length===0)?0.4:1}} onClick={saveOutfit} disabled={!outfitName.trim()||selItems.length===0}>Save Outfit</button>
                </div>
              </div>
            </div>}
          </>}

          {/* EDIT OUTFIT */}
          {outfitTab==="edit"&&editOutfitId&&<>
            <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Edit Outfit</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 300px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8,maxHeight:400,overflowY:"auto"}}>
                  {items.map(item=>{const sel=(editOutfitForm.itemIds||[]).includes(item.id);return(
                    <div key={item.id} onClick={()=>setEditOutfitForm(f=>({...f,itemIds:sel?f.itemIds.filter(x=>x!==item.id):[...(f.itemIds||[]),item.id]}))} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden",cursor:"pointer",position:"relative",border:`3px solid ${sel?"#6c63ff":"transparent"}`,boxSizing:"border-box"}}>
                      <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      {sel&&<div style={{position:"absolute",top:4,right:4,background:"#6c63ff",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12}}>✓</div>}
                    </div>);})}
                </div>
              </div>
              <div style={{flex:"0 0 260px"}}>
                <div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`}}>
                  <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Name</label><input style={inp} value={editOutfitForm.name||""} onChange={e=>setEditOutfitForm(f=>({...f,name:e.target.value}))}/></div>
                  <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Notes</label><input style={inp} value={editOutfitForm.notes||""} onChange={e=>setEditOutfitForm(f=>({...f,notes:e.target.value}))}/></div>
                  <div style={{display:"flex",gap:8}}><button style={{...pb,flex:1}} onClick={saveEditOutfit}>Save</button><button style={sb} onClick={()=>{setEditOutfitId(null);setOutfitTab("history");}}>Cancel</button></div>
                </div>
              </div>
            </div>
          </>}

          {/* HISTORY */}
          {outfitTab==="history"&&<>
            {outfits.length===0?(
              <div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>
                <div style={{fontSize:48,marginBottom:12}}>📋</div>
                <div style={{fontSize:16,fontWeight:700,color:T.sub,marginBottom:8}}>No outfits saved yet</div>
                <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                  <button style={pb} onClick={()=>setOutfitTab("generate")}>✨ Generate with AI</button>
                  <button style={sb} onClick={()=>setOutfitTab("create")}>🎨 Create manually</button>
                </div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {outfits.map(outfit=>{
                  const its=outfit.itemIds.map(id=>items.find(i=>i.id===id)).filter(Boolean);
                  const isOpen=expandedOutfit?.id===outfit.id;
                  return(<div key={outfit.id} style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden",transition:"box-shadow 0.2s"}}>
                    <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setExpandedOutfit(isOpen?null:outfit)}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{fontSize:15,fontWeight:700,color:T.text}}>{outfit.name}</div>
                            {outfit.rating&&<span style={{fontSize:16}}>{RATINGS.find(r=>r.key===outfit.rating)?.icon}</span>}
                          </div>
                          <div style={{fontSize:11,color:T.muted,marginTop:2}}>{new Date(outfit.createdAt).toLocaleDateString()} · {outfit.itemIds.length} items</div>
                          {outfit.notes&&<div style={{fontSize:12,color:T.sub,marginTop:3,fontStyle:"italic"}}>{outfit.notes}</div>}
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:18,fontWeight:800,color:T.text}}>{SYM}{(outfit.totalPaid||0).toFixed(2)}</div>
                          {outfit.totalVal>outfit.totalPaid&&<div style={{fontSize:11,color:T.muted,textDecoration:"line-through"}}>{SYM}{(outfit.totalVal||0).toFixed(2)}</div>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {its.slice(0,8).map(item=><Img key={item.id} src={item.imageUrl} alt={item.name} style={{width:50,height:50,objectFit:"cover",borderRadius:7,flexShrink:0}}/>)}
                        {its.length>8&&<div style={{width:50,height:50,borderRadius:7,background:T.badge,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.sub}}>+{its.length-8}</div>}
                      </div>
                    </div>
                    {isOpen&&<div style={{borderTop:`1px solid ${T.border}`,padding:"12px 16px",animation:"slideUp 0.2s ease"}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                        {its.map(item=><div key={item.id} style={{textAlign:"center"}}>
                          <Img src={item.imageUrl} alt={item.name} style={{width:64,height:64,objectFit:"cover",borderRadius:8,display:"block"}}/>
                          <div style={{fontSize:9,color:T.sub,marginTop:3,width:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div>
                          <div style={{fontSize:9,color:T.muted}}>{item.paidPrice||item.price}</div>
                        </div>)}
                      </div>
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:12,fontWeight:600,color:T.sub,marginBottom:8}}>Rate this outfit</div>
                        <div style={{display:"flex",gap:8}}>
                          {RATINGS.map(r=>(
                            <button key={r.key} onClick={()=>{rateOutfit(outfit.id,r.key);triggerPop(`rate${r.key}`);}}
                              style={{flex:1,padding:"8px 6px",borderRadius:8,border:`2px solid ${outfit.rating===r.key?"#6c63ff":T.border}`,background:outfit.rating===r.key?"#6c63ff":T.surface,color:outfit.rating===r.key?"#fff":T.text,cursor:"pointer",fontSize:12,fontWeight:outfit.rating===r.key?700:400,display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.2s",animation:popBtn===`rate${r.key}`?"pop 0.25s ease":undefined}}>
                              <span style={{fontSize:16}}>{r.icon}</span>{r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>openEditOutfit(outfit)} style={sb}>✏️ Edit</button>
                        <button onClick={()=>deleteOutfit(outfit.id)} style={{...sb,color:"#c0392b",borderColor:"#fcc"}}>🗑 Delete</button>
                      </div>
                    </div>}
                  </div>);
                })}
              </div>
            )}
          </>}

          {/* WEEKLY PLANNER */}
          {outfitTab==="week"&&<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <h2 style={{margin:0,fontSize:18,color:T.text}}>📅 Weekly Outfit Planner</h2>
                <div style={{fontSize:13,color:T.muted,marginTop:2}}>{weekDays[0].toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – {weekDays[6].toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
              </div>
              <button style={{...sb,fontSize:12}} onClick={()=>saveWeekPlan(Array(7).fill(null))}>Clear week</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
              {weekDays.map((date,i)=>{
                const plan=weekPlan[i];
                const planItems=(plan?.itemIds||[]).map(id=>items.find(it=>it.id===id)).filter(Boolean);
                const isToday=date.toDateString()===nowDate.toDateString();
                const isLoading=weekGenLoading&&weekGenDay===i;
                return(
                  <div key={i} style={{background:T.surface,borderRadius:12,border:`2px solid ${isToday?"#6c63ff":T.border}`,overflow:"hidden",transition:"border-color 0.2s"}}>
                    <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,background:isToday?"#6c63ff":T.badge}}>
                      <div style={{fontSize:12,fontWeight:700,color:isToday?"#fff":T.text}}>{DAYS_OF_WEEK[i]}</div>
                      <div style={{fontSize:10,color:isToday?"rgba(255,255,255,0.7)":T.muted}}>{date.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
                    </div>
                    <div style={{padding:10,minHeight:120}}>
                      {isLoading?(
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          <Shimmer h={60} r={8}/><Shimmer w="70%" h={8}/><Shimmer w="50%" h={8}/>
                        </div>
                      ):plan?(
                        <>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,marginBottom:8}}>
                            {planItems.slice(0,4).map(item=><Img key={item.id} src={item.imageUrl} alt={item.name} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:5,display:"block"}}/>)}
                          </div>
                          <div style={{fontSize:11,fontWeight:600,color:T.text,marginBottom:2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{plan.name}</div>
                          {plan.reasoning&&<div style={{fontSize:9,color:T.muted,lineHeight:1.4,marginBottom:6}}>{plan.reasoning}</div>}
                          <div style={{display:"flex",gap:4}}>
                            <button onClick={()=>generateDayOutfit(i)} style={{flex:1,padding:"5px 0",border:`1px solid ${T.border}`,borderRadius:5,background:T.surface,cursor:"pointer",fontSize:10,color:T.sub}}>↻</button>
                            <button onClick={()=>clearDay(i)} style={{flex:1,padding:"5px 0",border:`1px solid ${T.border}`,borderRadius:5,background:T.surface,cursor:"pointer",fontSize:10,color:"#c0392b"}}>✕</button>
                          </div>
                        </>
                      ):(
                        <div style={{textAlign:"center",padding:"14px 0"}}>
                          <div style={{fontSize:24,marginBottom:8}}>+</div>
                          <button onClick={()=>generateDayOutfit(i)} disabled={items.length===0}
                            style={{width:"100%",padding:"6px 0",borderRadius:7,border:"none",background:items.length===0?T.badge:"#1a1a1a",color:items.length===0?T.muted:"#fff",cursor:items.length===0?"not-allowed":"pointer",fontSize:11,fontWeight:600}}>
                            {items.length===0?"Add items first":"✨ Generate"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>}
        </>}

        {/* ── ADD ── */}
        {view==="add"&&<div style={form}>
          <h2 style={{margin:"0 0 14px",fontSize:18,color:T.text}}>Add Item</h2>
          <div style={{display:"flex",background:T.badge,borderRadius:8,padding:3,marginBottom:16}}>
            <button style={tabS(addMode==="url")} onClick={()=>{setAddMode("url");setAddErr("");setFetchStep("idle");}}>From URL</button>
            <button style={tabS(addMode==="manual")} onClick={()=>{setAddMode("manual");setAddErr("");}}>Manually</button>
          </div>
          {cats.length===0&&<div style={{...errS,background:"#fffbea",color:"#92651a"}}>👉 No categories yet — <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setView("manage")}>create one first →</span></div>}
          {addErr&&<div style={errS}>{addErr}</div>}
          {addMode==="url"&&<>
            {fetchStep==="idle"&&<><Fld T={T} label="Product URL" placeholder="https://…" value={addUrl} onChange={e=>setAddUrl(e.target.value)}/><div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Category</label><select value={addCat} onChange={e=>setAddCat(e.target.value)} style={{...inp,marginBottom:0}}><option value="">Select…</option>{cats.map(c=><option key={c}>{c}</option>)}</select></div><button style={{...pb,width:"100%"}} onClick={doFetch}>Fetch Details</button></>}
            {fetchStep==="loading"&&<div style={{padding:"20px 0"}}><Shimmer h={14} r={6}/><div style={{marginTop:10}}><Shimmer w="60%" h={10}/></div><div style={{marginTop:8}}><Shimmer w="80%" h={10}/></div><div style={{marginTop:8}}><Shimmer w="40%" h={10}/></div></div>}
            {fetchStep==="review"&&<><div style={{background:"#f0faf4",border:"1px solid #c3e6cb",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:13,color:"#2d6a4f"}}>✅ Fetched! Check details and photo.</div><ItemForm data={fetchedData} onChange={setFetchedData} cats={cats} seasons={seasons} onAddSeason={addSeason} T={T}/><div style={{display:"flex",gap:8}}><button style={{...pb,flex:1}} onClick={confirmFetched}>Save to Wardrobe</button><button style={sb} onClick={()=>{setFetchStep("idle");setAddErr("");}}>← Back</button></div></>}
          </>}
          {addMode==="manual"&&<><ItemForm data={manual} onChange={setManual} cats={cats} seasons={seasons} onAddSeason={addSeason} T={T}/><button style={{...pb,width:"100%",marginTop:4}} onClick={doAddManual}>Add Item</button></>}
        </div>}

        {/* ── CATEGORIES ── */}
        {view==="manage"&&<div style={form}>
          <h2 style={{margin:"0 0 4px",fontSize:18,color:T.text}}>Categories</h2>
          <p style={{fontSize:13,color:T.muted,margin:"0 0 16px"}}>Organise your wardrobe.</p>
          {cats.length===0?<p style={{fontSize:13,color:T.muted,marginBottom:16}}>No categories yet — create your first one below 👇</p>:(
            <div style={{marginBottom:16}}>{cats.map(c=>(
              <div key={c} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:7,border:`1px solid ${T.border}`,marginBottom:6,background:T.bg}}>
                <span style={{fontSize:13,fontWeight:500,color:T.text}}>{c}</span>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:11,color:T.muted}}>{items.filter(i=>i.category===c).length} items</span>
                  <button onClick={()=>delCat(c)} style={{background:"none",border:"none",cursor:"pointer",color:"#c0392b",fontSize:13}}>✕</button>
                </div>
              </div>
            ))}</div>
          )}
          <label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>New Category</label>
          <div style={{display:"flex",gap:8}}>
            <input style={{...inp,flex:1}} placeholder="e.g. Tops, Shoes…" value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCatFn()}/>
            <button style={pb} onClick={addCatFn}>Add</button>
          </div>
        </div>}

        {/* ── STATS ── */}
        {view==="stats"&&<div style={{maxWidth:560}}>
          <h2 style={{margin:"0 0 20px",fontSize:18,color:T.text}}>📊 Your Stats</h2>
          {items.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",color:T.muted}}>
              <div style={{fontSize:48,marginBottom:12}}>📊</div>
              <div style={{fontSize:16,fontWeight:700,color:T.sub,marginBottom:8}}>No data yet</div>
              <div style={{fontSize:13,marginBottom:16}}>Add items and start wearing them to see your stats</div>
              <button style={pb} onClick={()=>setView("add")}>+ Add your first item</button>
            </div>
          ):<div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* Big numbers */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[{label:"Total Items",value:items.length,icon:"👗"},{label:"Total Wears",value:totalWears,icon:"✨"},{label:"Never Worn",value:neverWorn.length,icon:"🏷️"},{label:"Outfits This Week",value:outfitsThisWeek,icon:"🗓️"}].map(({label,value,icon})=>(
                <div key={label} style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`,textAlign:"center"}}>
                  <div style={{fontSize:28,marginBottom:4}}>{icon}</div>
                  <div style={{fontSize:26,fontWeight:800,color:T.text}}>{value}</div>
                  <div style={{fontSize:12,color:T.muted}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Most & Least worn */}
            {mostWornItem&&<div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>Worn the Most</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Img src={mostWornItem.imageUrl} alt={mostWornItem.name} style={{width:60,height:60,objectFit:"cover",borderRadius:9,display:"block",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.text}}>{mostWornItem.name}</div>
                  {mostWornItem.brand&&<div style={{fontSize:12,color:T.sub}}>{mostWornItem.brand}</div>}
                  <div style={{fontSize:12,color:"#2d6a4f",fontWeight:600,marginTop:3}}>Worn {mostWornItem.wornCount} times · {wornLabel(mostWornItem).text}</div>
                </div>
                <div style={{fontSize:28}}>🏆</div>
              </div>
            </div>}

            {leastWornItem&&<div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>Worn the Least</div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Img src={leastWornItem.imageUrl} alt={leastWornItem.name} style={{width:60,height:60,objectFit:"cover",borderRadius:9,display:"block",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:T.text}}>{leastWornItem.name}</div>
                  {leastWornItem.brand&&<div style={{fontSize:12,color:T.sub}}>{leastWornItem.brand}</div>}
                  <div style={{fontSize:12,color:"#e67e22",fontWeight:600,marginTop:3}}>Only worn {leastWornItem.wornCount} time{leastWornItem.wornCount!==1?"s":""}</div>
                </div>
                <div style={{fontSize:28}}>😴</div>
              </div>
            </div>}

            {/* Personal style */}
            <div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:14}}>Your Style Profile</div>
              {[favColour&&{icon:"🎨",label:"Favourite Colour",value:favColour.charAt(0).toUpperCase()+favColour.slice(1)},favBrand&&{icon:"🏷️",label:"Favourite Brand",value:favBrand},avgCostPerWear!==null&&{icon:"💰",label:"Avg Cost Per Wear",value:`${SYM}${avgCostPerWear.toFixed(2)}`},{icon:"📦",label:"Wardrobe Value",value:`${SYM}${totalWorth.toFixed(2)}`},{icon:"💳",label:"Total Paid",value:`${SYM}${totalPaid.toFixed(2)}`},totalWorth-totalPaid>0&&{icon:"✨",label:"Total Saved",value:`${SYM}${(totalWorth-totalPaid).toFixed(2)}`}].filter(Boolean).map(({icon,label,value})=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:16}}>{icon}</span><span style={{fontSize:13,color:T.sub}}>{label}</span></div>
                  <span style={{fontSize:14,fontWeight:700,color:T.text}}>{value}</span>
                </div>
              ))}
            </div>

            {/* This month */}
            <div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:10}}>This Month</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,color:T.sub}}>Items worn</span>
                <span style={{fontSize:14,fontWeight:700,color:T.text}}>{wornThisMonth} / {items.length}</span>
              </div>
              <div style={{height:8,borderRadius:4,background:T.badge,overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:wornThisMonth/items.length>0.5?"#2d6a4f":"#e67e22",width:`${Math.round(wornThisMonth/items.length*100)||0}%`,transition:"width 0.6s ease"}}/>
              </div>
              <div style={{fontSize:12,color:T.muted,marginTop:6}}>{Math.round(wornThisMonth/items.length*100)||0}% of wardrobe used this month</div>
            </div>

            {/* Outfit ratings breakdown */}
            {outfits.filter(o=>o.rating).length>0&&<div style={{background:T.surface,borderRadius:12,padding:18,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>Outfit Ratings</div>
              {RATINGS.map(r=>{const count=outfits.filter(o=>o.rating===r.key).length;return count>0&&(
                <div key={r.key} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontSize:20}}>{r.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{height:8,borderRadius:4,background:T.badge,overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:4,background:"#6c63ff",width:`${Math.round(count/outfits.length*100)}%`,transition:"width 0.6s ease"}}/>
                    </div>
                  </div>
                  <span style={{fontSize:13,fontWeight:700,color:T.text,minWidth:20}}>{count}</span>
                </div>
              );})}
            </div>}
          </div>}
        </div>}

        {/* ── PROFILE ── */}
        {view==="profile"&&<div style={{maxWidth:500}}>
          <div style={{background:T.surface,borderRadius:13,padding:22,border:`1px solid ${T.border}`,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
              <label style={{cursor:"pointer",flexShrink:0}}>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files[0];if(f){const d=await resizeImg(f,200);setProfilePic(d);ls.set(pkey(user),d);}}}/>
                {profilePic?<img src={profilePic} style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.border}`}} alt=""/>
                  :<div style={{width:60,height:60,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",border:`3px solid ${T.border}`}}>{user[0].toUpperCase()}</div>}
                <div style={{fontSize:10,color:T.muted,textAlign:"center",marginTop:3}}>Tap to change</div>
              </label>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:T.text}}>{displayName}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:1}}>@{user}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{items.length} items · {wishlist.length} on wishlist · {outfits.length} outfits</div>
                <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                  <button onClick={()=>setChangingUser(!changingUser)} style={{...sb,fontSize:12,padding:"5px 12px"}}>✏️ Edit profile</button>
                  <button onClick={toggleDark} style={{...sb,fontSize:12,padding:"5px 12px"}}>{darkMode?"☀️ Light":"🌙 Dark"}</button>
                </div>
              </div>
            </div>
            {changingUser&&<div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
              <div style={{fontSize:12,fontWeight:600,color:T.sub,marginBottom:6}}>Display Name</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...inp,flex:1}} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="e.g. Olga"/>
                <button style={pb} onClick={()=>saveDisplayName(displayName)}>Save</button>
              </div>
              <div style={{fontSize:12,fontWeight:600,color:T.sub,marginBottom:6}}>Username <span style={{color:T.muted,fontWeight:400}}>(login)</span></div>
              <div style={{display:"flex",gap:8}}>
                <input style={{...inp,flex:1}} value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="new username" onKeyDown={e=>e.key==="Enter"&&doChangeUsername()}/>
                <button style={pb} onClick={doChangeUsername}>Save</button>
                <button style={sb} onClick={()=>{setChangingUser(false);setNewUsername("");}}>✕</button>
              </div>
            </div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[{label:"Listed Value",value:`${SYM}${totalWorth.toFixed(2)}`,sub:`${items.filter(i=>pp(i.price)>0).length} priced items`,dark:true},{label:"Total Paid",value:`${SYM}${totalPaid.toFixed(2)}`,sub:totalWorth-totalPaid>0?`Saved ${SYM}${(totalWorth-totalPaid).toFixed(2)}`:"",dark:false}].map(({label,value,sub,dark})=>(
              <div key={label} style={{background:dark?"#1a1a1a":T.surface,color:dark?"#fff":T.text,borderRadius:12,padding:18,border:dark?"none":`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:dark?"rgba(255,255,255,0.45)":T.muted,marginBottom:5}}>{label}</div>
                <div style={{fontSize:24,fontWeight:800}}>{value}</div>
                {sub&&<div style={{fontSize:11,color:dark?"rgba(255,255,255,0.35)":T.muted,marginTop:3}}>{sub}</div>}
              </div>
            ))}
          </div>
          {cats.length>0&&<div style={{background:T.surface,borderRadius:13,padding:20,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>By Category</div>
            {cats.map(c=>{const ci=items.filter(i=>i.category===c),cw=ci.reduce((s,i)=>s+pp(i.paidPrice||i.price),0);return(<div key={c} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}`}}><div><span style={{fontSize:13,fontWeight:500,color:T.text}}>{c}</span><span style={{fontSize:11,color:T.muted,marginLeft:8}}>{ci.length}</span></div><span style={{fontSize:13,fontWeight:700,color:cw>0?"#2d6a4f":T.muted}}>{cw>0?`${SYM}${cw.toFixed(2)}`:"-"}</span></div>);})}
          </div>}
        </div>}
      </div>

      {/* ── DRESS ME MODAL ── */}
      {dressMeOpen&&<div style={ov} onClick={()=>setDressMeOpen(false)}>
        <div style={{...mod,maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div style={{background:"linear-gradient(135deg,#667eea,#764ba2)",padding:"20px 22px",color:"#fff"}}>
            <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>✨ Today's Outfit</div>
            <div style={{fontSize:13,opacity:0.8}}>Here's what to wear today</div>
          </div>
          <div style={{padding:20}}>
            {dressMeItems.length===0?(
              <div style={{textAlign:"center",padding:"20px",color:T.muted}}>
                <div style={{fontSize:13}}>No items in your wardrobe yet.</div>
              </div>
            ):(
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:10,marginBottom:20}}>
                  {dressMeItems.map(item=>(
                    <div key={item.id} style={{borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`}}>
                      <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:110,objectFit:"cover",display:"block"}}/>
                      <div style={{padding:"6px 8px"}}>
                        <div style={{fontSize:11,fontWeight:600,color:T.text,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{item.name}</div>
                        <div style={{fontSize:9,color:T.muted}}>{item.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{background:T.badge,borderRadius:8,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,color:T.sub}}>Total value</span>
                  <span style={{fontSize:14,fontWeight:700,color:T.text}}>{SYM}{dressMeItems.reduce((s,i)=>s+pp(i.paidPrice||i.price),0).toFixed(2)}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <button onClick={()=>{generateDressMe();triggerPop("shuffle");}} style={{...sb,padding:"12px",textAlign:"center",fontSize:14,fontWeight:600,animation:popBtn==="shuffle"?"pop 0.25s ease":undefined}}>🔀 Shuffle</button>
                  <button onClick={wearThis} style={{...pb,padding:"12px",textAlign:"center",fontSize:14,animation:savedFlash?"savedPulse 0.6s ease":undefined}}>
                    {savedFlash?"✓ Logged!":"👗 Wear This"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>}

      {/* ── WARDROBE ITEM MODAL ── */}
      {expanded&&<div style={ov} onClick={()=>setExpanded(null)}>
        <div style={mod} onClick={e=>e.stopPropagation()}>
          <Img src={expanded.imageUrl} alt={expanded.name} style={{width:"100%",height:240,objectFit:"cover",display:"block"}}/>
          <div style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div style={{fontSize:16,fontWeight:700,color:T.text}}>{expanded.name}</div>{expanded.brand&&<div style={{color:T.sub,fontSize:13}}>{expanded.brand}</div>}</div>
              <div style={{textAlign:"right"}}>{expanded.paidPrice&&<div style={{fontSize:16,fontWeight:700,color:"#2d6a4f"}}>{expanded.paidPrice}</div>}{expanded.price&&expanded.price!==expanded.paidPrice&&<div style={{fontSize:12,color:T.muted,textDecoration:"line-through"}}>{expanded.price}</div>}</div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              <span style={badge}>{expanded.category}</span>
              {expanded.season&&<span style={badge}>{expanded.season}</span>}
              {expanded.color&&<span style={badge}>🎨 {expanded.color}</span>}
              {expanded.productId&&<span style={badge}>ID: {expanded.productId}</span>}
            </div>
            {expanded.description&&<div style={{fontSize:13,color:T.sub,marginBottom:12,lineHeight:1.5}}>{expanded.description}</div>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,padding:"10px 13px",background:T.badge,borderRadius:9}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:wornLabel(expanded).col}}>{wornLabel(expanded).text}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:1}}>{expanded.wornCount?`Worn ${expanded.wornCount} time${expanded.wornCount!==1?"s":""}`:"Not logged yet"}</div>
              </div>
              <button onClick={()=>markWorn(expanded.id)} style={{...pb,padding:"7px 14px",fontSize:12}}>👗 Worn today</button>
            </div>
            <div style={{display:"flex",gap:8}}>
              {expanded.url&&<a href={expanded.url} target="_blank" rel="noreferrer" style={{flex:1,textAlign:"center",padding:"9px",borderRadius:7,background:"#1a1a1a",color:"#fff",textDecoration:"none",fontSize:13,fontWeight:600}}>View Product →</a>}
              <button onClick={()=>openEdit(expanded)} style={sb}>✏️ Edit</button>
            </div>
          </div>
        </div>
      </div>}

      {/* ── WISHLIST MODAL ── */}
      {expandedWish&&(()=>{
        const item=expandedWish,rrp=pp(item.rrp),now3=pp(item.priceNow),saving=rrp>0&&now3>0&&rrp>now3?rrp-now3:0,ws=item.rrp?.match(/^[^0-9]+/)?.[0]||"£";
        return(<div style={ov} onClick={()=>setExpandedWish(null)}>
          <div style={{...mod,border:"2px solid #e8dff5"}} onClick={e=>e.stopPropagation()}>
            <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:240,objectFit:"cover",display:"block"}}/>
            <div style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><div style={{fontSize:16,fontWeight:700,color:T.text}}>{item.name}</div>{item.brand&&<div style={{color:T.sub,fontSize:13}}>{item.brand}</div>}</div>
                <div style={{textAlign:"right"}}>{item.priceNow&&<div style={{fontSize:16,fontWeight:700,color:T.text}}>{item.priceNow} <span style={{fontSize:11,color:T.sub}}>now</span></div>}{item.rrp&&<div style={{fontSize:12,color:T.muted}}>RRP {item.rrp}</div>}{saving>0&&<div style={{fontSize:12,color:"#2d6a4f",fontWeight:700}}>Save {ws}{saving.toFixed(2)}</div>}</div>
              </div>
              {item.notes&&<div style={{fontSize:13,color:T.sub,marginBottom:10,fontStyle:"italic"}}>"{item.notes}"</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {item.url&&<a href={item.url} target="_blank" rel="noreferrer" style={{flex:1,textAlign:"center",padding:"9px",borderRadius:7,background:"#1a1a1a",color:"#fff",textDecoration:"none",fontSize:13,fontWeight:600,minWidth:100}}>View →</a>}
                <button onClick={()=>moveToWardrobe(item)} style={{...sb,color:"#2d6a4f",borderColor:"#c3e6cb",fontSize:12}}>👗 Move to Wardrobe</button>
                <button onClick={()=>openEditWish(item)} style={sb}>✏️</button>
              </div>
            </div>
          </div>
        </div>);
      })()}

      {/* ── EDIT WARDROBE MODAL ── */}
      {editId&&<div style={ov} onClick={()=>setEditId(null)}>
        <div style={{...mod,maxWidth:460,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:"15px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.surface,zIndex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:T.text}}>Edit Item</div>
            <button onClick={()=>setEditId(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:17,color:T.muted}}>✕</button>
          </div>
          <div style={{padding:20}}>
            <ItemForm data={editForm} onChange={setEditForm} cats={cats} seasons={seasons} onAddSeason={addSeason} T={T}/>
            <Fld T={T} label="Product URL" value={editForm.url||""} onChange={e=>setEditForm({...editForm,url:e.target.value})} placeholder="https://…"/>
            <div style={{display:"flex",gap:8,marginTop:12}}><button style={{...pb,flex:1}} onClick={saveEdit}>Save</button><button style={sb} onClick={()=>setEditId(null)}>Cancel</button></div>
          </div>
        </div>
      </div>}

      {/* ── EDIT WISHLIST MODAL ── */}
      {editWishId&&<div style={ov} onClick={()=>setEditWishId(null)}>
        <div style={{...mod,maxWidth:460,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:"15px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:T.surface,zIndex:1}}>
            <div style={{fontSize:15,fontWeight:700,color:T.text}}>Edit Wishlist Item</div>
            <button onClick={()=>setEditWishId(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:17,color:T.muted}}>✕</button>
          </div>
          <div style={{padding:20}}><WishForm data={editWishForm} onChange={setEditWishForm} T={T}/><div style={{display:"flex",gap:8,marginTop:12}}><button style={{...pb,flex:1}} onClick={saveEditWish}>Save</button><button style={sb} onClick={()=>setEditWishId(null)}>Cancel</button></div></div>
        </div>
      </div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);