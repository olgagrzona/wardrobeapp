import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";

const LIGHT = {bg:'#fafaf9',surface:'#fff',border:'#e8e6e3',text:'#1a1a1a',sub:'#666',muted:'#bbb',ib:'#ddd',ibg:'#fff',badge:'#f0eeec',bt:'#777',nav:'#fff',nb:'#eee'};
const DARK  = {bg:'#0d0d0d',surface:'#1c1c1e',border:'#2c2c2e',text:'#f2f2f7',sub:'#98989f',muted:'#48484a',ib:'#3a3a3c',ibg:'#2c2c2e',badge:'#2c2c2e',bt:'#98989f',nav:'#111',nb:'#222'};

const DEFAULT_SEASONS=["Spring/Summer","Autumn/Winter","All Year Round","SS25","AW25","SS26","AW26"];
const BLANK={name:"",brand:"",price:"",paidPrice:"",color:"",imageUrl:"",description:"",category:"",productId:"",season:""};
const BLANK_WISH={name:"",brand:"",rrp:"",priceNow:"",color:"",imageUrl:"",description:"",url:"",notes:""};

const ls={get:k=>{const v=localStorage.getItem(k);return v?{value:v}:null;},set:(k,v)=>localStorage.setItem(k,v),del:k=>localStorage.removeItem(k)};
const ikey=u=>`wd-items-${u}`,ckey=u=>`wd-cats-${u}`,skey=u=>`wd-seasons-${u}`,wkey=u=>`wd-wish-${u}`,okey=u=>`wd-outfits-${u}`,pkey=u=>`wd-pic-${u}`,ACCTS="wd-accounts";

const pp=s=>{if(!s)return 0;const n=parseFloat(s.replace(/[^0-9.]/g,""));return isNaN(n)?0:n;};
const sym=arr=>{for(const it of arr){const p=it.price||it.rrp||it.paidPrice;if(p){const m=p.match(/^[^0-9]+/);if(m)return m[0].trim();}}return "£";};

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
  if(!src||f)return <div style={{...style,display:"flex",alignItems:"center",justifyContent:"center",background:"#f0eeec",fontSize:28,color:"#ccc"}}>👗</div>;
  return <img src={src} alt={alt} style={style} onError={()=>setF(true)}/>;
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
  const rrp=pp(data.rrp),now=pp(data.priceNow),saving=rrp>0&&now>0&&rrp>now?rrp-now:0;
  const ws=data.rrp?.match(/^[^0-9]+/)?.[0]||"£";
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

export default function App(){
  const[user,setUser]=useState(null);
  const[items,setItems]=useState([]);
  const[wishlist,setWishlist]=useState([]);
  const[cats,setCats]=useState([]);
  const[seasons,setSeasons]=useState(DEFAULT_SEASONS);
  const[outfits,setOutfits]=useState([]);
  const[profilePic,setProfilePic]=useState(null);
  const[darkMode,setDarkMode]=useState(false);
  const T=darkMode?DARK:LIGHT;

  const[view,setView]=useState("home");
  const[fCat,setFCat]=useState("All");
  const[fBrand,setFBrand]=useState("All");
  const[fSeason,setFSeason]=useState("All");
  const[dragOver,setDragOver]=useState(null);
  const dragRef=useRef(null);

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

  // Profile editing
  const[changingUser,setChangingUser]=useState(false);
  const[newUsername,setNewUsername]=useState("");
  const[newCat,setNewCat]=useState("");

  useEffect(()=>{document.body.style.background=T.bg;},[darkMode]);
  useEffect(()=>{const s=localStorage.getItem("wd-session");if(s)loadUser(s);},[]);

  const loadUser=u=>{
    const ri=ls.get(ikey(u));setItems(ri?JSON.parse(ri.value):[]);
    const rc=ls.get(ckey(u));setCats(rc?JSON.parse(rc.value):[]);
    const rs=ls.get(skey(u));setSeasons(rs?JSON.parse(rs.value):DEFAULT_SEASONS);
    const rw=ls.get(wkey(u));setWishlist(rw?JSON.parse(rw.value):[]);
    const ro=ls.get(okey(u));setOutfits(ro?JSON.parse(ro.value):[]);
    const rp=ls.get(pkey(u));setProfilePic(rp?rp.value:null);
    const dm=ls.get(`wd-dark-${u}`);setDarkMode(dm?.value==="1");
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
  const saveWishlist=v=>{setWishlist(v);ls.set(wkey(user),JSON.stringify(v));};
  const saveOutfits =v=>{setOutfits(v); ls.set(okey(user),JSON.stringify(v));};
  const addSeason   =s=>{if(!s||seasons.includes(s))return;saveSeasons([...seasons,s]);};
  const toggleDark  =()=>{const d=!darkMode;setDarkMode(d);ls.set(`wd-dark-${user}`,d?"1":"0");};

  // Drag & Drop
  const onDragStart=(e,id)=>{dragRef.current=id;e.dataTransfer.effectAllowed="move";};
  const onDragOver=(e,id)=>{e.preventDefault();setDragOver(id);};
  const onDrop=(e,targetId)=>{
    e.preventDefault();setDragOver(null);
    if(!dragRef.current||dragRef.current===targetId)return;
    const arr=[...items];
    const fi=arr.findIndex(i=>i.id===dragRef.current),ti=arr.findIndex(i=>i.id===targetId);
    const[m]=arr.splice(fi,1);arr.splice(ti,0,m);
    saveItems(arr);dragRef.current=null;
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
    setAddUrl("");setAddCat("");setFetchedData(BLANK);setFetchStep("idle");setView("grid");
  };
  const doAddManual=()=>{
    if(!manual.name.trim()||!manual.category){setAddErr("Name and category required.");return;}
    saveItems([{id:Date.now(),url:"",addedAt:new Date().toISOString(),...manual},...items]);
    setManual(BLANK);setView("grid");
  };
  const deleteItem=id=>{saveItems(items.filter(i=>i.id!==id));setExpanded(null);};
  const openEdit=item=>{setEditForm({...item});setEditId(item.id);setExpanded(null);};
  const saveEdit=()=>{saveItems(items.map(i=>i.id===editId?{...i,...editForm}:i));setEditId(null);};

  // Wishlist CRUD
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
    setWishUrl("");setWishFetched(BLANK_WISH);setWishFetchStep("idle");setView("wishlist");
  };
  const doAddWishManual=()=>{
    if(!wishManual.name.trim()){setWishErr("Name required.");return;}
    saveWishlist([{id:Date.now(),addedAt:new Date().toISOString(),...wishManual},...wishlist]);
    setWishManual(BLANK_WISH);setView("wishlist");
  };
  const deleteWish=id=>{saveWishlist(wishlist.filter(w=>w.id!==id));setExpandedWish(null);};
  const openEditWish=item=>{setEditWishForm({...item});setEditWishId(item.id);setExpandedWish(null);};
  const saveEditWish=()=>{saveWishlist(wishlist.map(w=>w.id===editWishId?{...w,...editWishForm}:w));setEditWishId(null);};
  const moveToWardrobe=item=>{
    if(cats.length===0){alert("Create a wardrobe category first!");return;}
    saveItems([{...item,category:cats[0],price:item.rrp||"",paidPrice:item.priceNow||"",productId:"",season:"",id:Date.now()},...items]);
    saveWishlist(wishlist.filter(w=>w.id!==item.id));setExpandedWish(null);
  };

  // Outfit CRUD
  const toggleSel=id=>setSelItems(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const saveOutfit=()=>{
    if(!outfitName.trim()||selItems.length===0)return;
    const its=selItems.map(id=>items.find(i=>i.id===id)).filter(Boolean);
    const totalPaid=its.reduce((s,i)=>s+pp(i.paidPrice||i.price),0);
    const totalVal=its.reduce((s,i)=>s+pp(i.price),0);
    saveOutfits([{id:Date.now(),name:outfitName,notes:outfitNotes,itemIds:[...selItems],totalPaid,totalVal,createdAt:new Date().toISOString()},...outfits]);
    setSelItems([]);setOutfitName("");setOutfitNotes("");setOutfitTab("history");
  };
  const deleteOutfit=id=>{saveOutfits(outfits.filter(o=>o.id!==id));setExpandedOutfit(null);};
  const openEditOutfit=o=>{setEditOutfitForm({...o,name:o.name,notes:o.notes||""});setEditOutfitId(o.id);setExpandedOutfit(null);setOutfitTab("edit");};
  const saveEditOutfit=()=>{
    const its=editOutfitForm.itemIds.map(id=>items.find(i=>i.id===id)).filter(Boolean);
    const totalPaid=its.reduce((s,i)=>s+pp(i.paidPrice||i.price),0);
    const totalVal=its.reduce((s,i)=>s+pp(i.price),0);
    saveOutfits(outfits.map(o=>o.id===editOutfitId?{...o,...editOutfitForm,totalPaid,totalVal}:o));
    setEditOutfitId(null);setOutfitTab("history");
  };

  // Outfit generator
  const toggleGenCat=c=>setGenCats(s=>s.includes(c)?s.filter(x=>x!==c):[...s,c]);
  const toggleLock=id=>setGenLocked(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const generateOutfit=async()=>{
    if(genCats.length===0){setGenErr("Select at least one category.");return;}
    const avail=items.filter(i=>genCats.includes(i.category)&&!genLocked.includes(i.id));
    if(avail.length===0){setGenErr("No unlocked items in selected categories.");return;}
    setGenLoading(true);setGenErr("");
    const locked=items.filter(i=>genLocked.includes(i.id));
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,
          system:`You are a fashion stylist. Select items from the available list to create a cohesive outfit, picking one item per category. Consider color harmony, style consistency and occasion. Return ONLY valid JSON: {"selectedIds":[array of numeric item ids],"reasoning":"2-3 sentence style note explaining why these pieces work together"}`,
          messages:[{role:"user",content:`Create a cohesive outfit. Categories needed: ${genCats.join(", ")}. Already locked in (must keep): ${JSON.stringify(locked.map(i=>({id:i.id,name:i.name,color:i.color||"",category:i.category})))}. Choose from available: ${JSON.stringify(avail.map(i=>({id:i.id,name:i.name,brand:i.brand||"",color:i.color||"",category:i.category,description:i.description||""}}))}`}]})});
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
    if(!genName.trim()||genResult.length===0) return;
    const its=genResult.map(id=>items.find(i=>i.id===id)).filter(Boolean);
    const totalPaid=its.reduce((s,i)=>s+pp(i.paidPrice||i.price),0);
    const totalVal=its.reduce((s,i)=>s+pp(i.price),0);
    saveOutfits([{id:Date.now(),name:genName,notes:"AI Generated",itemIds:[...genResult],totalPaid,totalVal,createdAt:new Date().toISOString()},...outfits]);
    setGenResult([]);setGenLocked([]);setGenReasoning("");setGenName("");setGenStep("setup");setOutfitTab("history");
  };

  // Change username
  const doChangeUsername=()=>{
    const nu=newUsername.trim().toLowerCase();
    if(!nu)return;
    const accts=getAccts();
    if(accts[nu]){alert("Username taken.");return;}
    accts[nu]=accts[user];delete accts[user];
    ls.set(ACCTS,JSON.stringify(accts));
    // Move all data
    ["items","cats","seasons","wish","outfits"].forEach(k=>{
      const r=ls.get(`wd-${k}-${user}`);if(r)ls.set(`wd-${k}-${nu}`,r.value);ls.del(`wd-${k}-${user}`);
    });
    const pic=ls.get(pkey(user));if(pic)ls.set(pkey(nu),pic.value);ls.del(pkey(user));
    const dm=ls.get(`wd-dark-${user}`);if(dm)ls.set(`wd-dark-${nu}`,dm.value);ls.del(`wd-dark-${user}`);
    setUser(nu);localStorage.setItem("wd-session",nu);setChangingUser(false);setNewUsername("");
  };

  const cats_filter=["All",...cats];
  const brands_filter=["All",...Array.from(new Set(items.map(i=>i.brand).filter(Boolean))).sort()];
  const seasons_filter=["All",...Array.from(new Set(items.map(i=>i.season).filter(Boolean))).sort()];
  const filtered=items.filter(i=>(fCat==="All"||i.category===fCat)&&(fBrand==="All"||i.brand===fBrand)&&(fSeason==="All"||i.season===fSeason));
  const S=sym([...items,...wishlist]);
  const totalWorth=items.reduce((s,i)=>s+pp(i.price),0);
  const totalPaid=items.reduce((s,i)=>s+pp(i.paidPrice||i.price),0);
  const totalWish=wishlist.reduce((s,w)=>s+pp(w.priceNow||w.rrp),0);

  const inp={width:"100%",padding:"8px 11px",borderRadius:7,border:`1.5px solid ${T.ib}`,fontSize:13,outline:"none",boxSizing:"border-box",background:T.ibg,color:T.text};
  const pb={background:"#1a1a1a",color:"#fff",padding:"10px 20px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600};
  const sb={background:T.surface,color:T.text,padding:"9px 16px",borderRadius:7,border:`1.5px solid ${T.ib}`,cursor:"pointer",fontSize:13};
  const card={background:T.surface,borderRadius:11,overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"};
  const err={color:"#c0392b",fontSize:13,marginBottom:11,padding:"8px 12px",background:"#fdf0ef",borderRadius:6};
  const badge={fontSize:10,padding:"2px 7px",borderRadius:9,background:T.badge,color:T.bt,display:"inline-block"};
  const tabS=a=>({flex:1,padding:"7px 0",border:"none",background:a?T.surface:"transparent",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:a?700:400,color:a?T.text:T.sub,boxShadow:a?"0 1px 4px rgba(0,0,0,0.08)":"none"});
  const nb=a=>({padding:"6px 13px",borderRadius:18,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,background:a?"#1a1a1a":"transparent",color:a?"#fff":T.sub});
  const chip=a=>({padding:"4px 11px",borderRadius:13,border:`1.5px solid ${a?"#1a1a1a":T.ib}`,background:a?"#1a1a1a":T.surface,color:a?"#fff":T.sub,fontSize:12,cursor:"pointer",fontWeight:a?600:400,whiteSpace:"nowrap"});
  const form={background:T.surface,borderRadius:14,padding:24,border:`1px solid ${T.border}`,maxWidth:510};
  const ov={position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16};
  const mod={background:T.surface,borderRadius:14,maxWidth:420,width:"100%",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"};

  // AUTH
  if(!user)return(
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surface,borderRadius:16,padding:30,border:`1px solid ${T.border}`,width:"100%",maxWidth:330,boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
        <div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:34}}>👗</div><div style={{fontSize:18,fontWeight:700,marginTop:8,color:T.text}}>Wardrobe</div><div style={{fontSize:12,color:T.muted,marginTop:3}}>Your personal clothing directory</div></div>
        <div style={{display:"flex",background:T.badge,borderRadius:8,padding:3,marginBottom:18}}>
          {["login","signup"].map(m=><button key={m} style={tabS(authMode===m)} onClick={()=>{setAuthMode(m);setAuthErr("");}}>{m==="login"?"Log In":"Sign Up"}</button>)}
        </div>
        {authErr&&<div style={err}>{authErr}</div>}
        <Fld T={T} label="Username" value={authUser} onChange={e=>setAuthUser(e.target.value)} placeholder="e.g. sarah" onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
        <Fld T={T} label="Password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleAuth()}/>
        <button style={{...pb,width:"100%",marginTop:4}} onClick={handleAuth}>{authMode==="login"?"Log In":"Create Account"}</button>
        <p style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:12,marginBottom:0}}>Data stored in your browser.</p>
      </div>
    </div>
  );

  const navs=[["home","My Wardrobe"],["add","+ Add Item"],["grid","Outfit Directory"],["wishlist","✨ Wishlist"],["outfits","👗 Outfits"],["manage","Categories"],["profile","Your Profile"]];

  return(
    <div style={{fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:T.bg,color:T.text}}>
      {/* HEADER */}
      <div style={{background:T.nav,borderBottom:`1px solid ${T.nb}`,padding:"11px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {profilePic
            ?<img src={profilePic} style={{width:30,height:30,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt=""/>
            :<div style={{width:30,height:30,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",flexShrink:0}}>{user[0].toUpperCase()}</div>
          }
          <span style={{fontSize:15,fontWeight:700,color:T.text}}>Wardrobe</span>
        </div>
        <div style={{display:"flex",gap:3,alignItems:"center",flexWrap:"wrap"}}>
          {navs.map(([v,l])=><button key={v} style={nb(view===v)} onClick={()=>setView(v)}>{l}</button>)}
          <div style={{width:1,height:16,background:T.border,margin:"0 2px"}}/>
          <button onClick={toggleDark} style={{...nb(false),fontSize:14}}>{darkMode?"☀️":"🌙"}</button>
          <button style={{...nb(false),color:"#c0392b"}} onClick={logout}>Log out</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"18px 14px"}}>

        {/* ── HOME ── */}
        {view==="home"&&<>
          <div style={{maxWidth:680,margin:"0 auto"}}>
            {/* Welcome */}
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
              {profilePic
                ?<img src={profilePic} style={{width:56,height:56,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt=""/>
                :<div style={{width:56,height:56,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",flexShrink:0}}>{user[0].toUpperCase()}</div>
              }
              <div>
                <div style={{fontSize:22,fontWeight:800,color:T.text}}>Hi, {user} 👋</div>
                <div style={{fontSize:14,color:T.sub,marginTop:2}}>Welcome to your personal wardrobe assistant.</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:28}}>
              {[
                {icon:"👗",label:"Items",value:items.length,action:"grid"},
                {icon:"✨",label:"Wishlist",value:wishlist.length,action:"wishlist"},
                {icon:"🎨",label:"Outfits",value:outfits.length,action:"outfits"},
              ].map(({icon,label,value,action})=>(
                <div key={label} onClick={()=>setView(action)} style={{background:T.surface,borderRadius:12,padding:"16px 14px",border:`1px solid ${T.border}`,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
                  <div style={{fontSize:26,marginBottom:4}}>{icon}</div>
                  <div style={{fontSize:22,fontWeight:800,color:T.text}}>{value}</div>
                  <div style={{fontSize:12,color:T.muted}}>{label}</div>
                </div>
              ))}
            </div>

            {/* Feature cards */}
            <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>What you can do</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                {icon:"👗",title:"Outfit Directory",desc:"Browse your wardrobe in an Instagram-style gallery. Drag and drop to reorder, filter by category, brand or season.",action:"grid",color:"#f0f4ff"},
                {icon:"➕",title:"Add Items",desc:"Add clothes by pasting a product URL and letting AI fetch the details automatically, or add them manually with photos.",action:"add",color:"#f0faf4"},
                {icon:"✨",title:"Wishlist",desc:"Save items you want to buy. Track RRP vs current price to spot savings, and move items to your wardrobe once purchased.",action:"wishlist",color:"#fdf0ef"},
                {icon:"🎨",title:"Outfit Generator",desc:"Let AI build outfits from your wardrobe. Lock pieces you love, regenerate the rest, and save your favourite combinations.",action:"outfits",color:"#f5f0ff"},
                {icon:"📋",title:"Outfit History",desc:"All your saved outfits in one place. See the total cost, edit or delete them anytime.",action:"outfits",color:"#fff8f0"},
              ].map(({icon,title,desc,action,color})=>(
                <div key={title} onClick={()=>setView(action)} style={{background:T.surface,borderRadius:12,padding:"16px 18px",border:`1px solid ${T.border}`,cursor:"pointer",display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:10,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{icon}</div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:3}}>{title}</div>
                    <div style={{fontSize:13,color:T.sub,lineHeight:1.5}}>{desc}</div>
                  </div>
                  <div style={{color:T.muted,fontSize:18,marginLeft:"auto",alignSelf:"center"}}>›</div>
                </div>
              ))}
            </div>

            {/* Wardrobe worth if items exist */}
            {items.length>0&&<div style={{background:"#1a1a1a",borderRadius:12,padding:20,marginTop:16,color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",opacity:0.5,marginBottom:4}}>Total Wardrobe Value</div>
              <div style={{fontSize:30,fontWeight:800}}>{S}{totalWorth.toFixed(2)}</div>
              {totalWorth-totalPaid>0&&<div style={{fontSize:12,opacity:0.5,marginTop:3}}>Saved {S}{(totalWorth-totalPaid).toFixed(2)} vs listed prices</div>}
            </div>}
          </div>
        </>}

        {/* ── INSTAGRAM GRID ── */}
        {view==="grid"&&<>
          {(cats.length>0||brands_filter.length>1||seasons_filter.length>1)&&(
            <div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:8}}>
              {cats.length>0&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:5}}>Category</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{cats_filter.map(c=><button key={c} style={chip(fCat===c)} onClick={()=>setFCat(c)}>{c}</button>)}</div></div>}
              {brands_filter.length>1&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:5}}>Brand</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{brands_filter.map(b=><button key={b} style={chip(fBrand===b)} onClick={()=>setFBrand(b)}>{b}</button>)}</div></div>}
              {seasons_filter.length>1&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:5}}>Season</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{seasons_filter.map(s=><button key={s} style={chip(fSeason===s)} onClick={()=>setFSeason(s)}>{s}</button>)}</div></div>}
            </div>
          )}
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"48px 20px",color:T.muted}}>
              <div style={{fontSize:38,marginBottom:9}}>👚</div>
              <div style={{fontSize:14,fontWeight:600,color:T.sub,marginBottom:5}}>{items.length===0?"Your wardrobe is empty":"No items match"}</div>
              {items.length===0&&cats.length===0&&<button style={{...pb,marginTop:12}} onClick={()=>setView("manage")}>Create a Category</button>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3}}>
              {filtered.map(item=>{
                const isDragOver=dragOver===item.id&&dragRef.current!==item.id;
                return(
                  <div key={item.id} draggable onDragStart={e=>onDragStart(e,item.id)} onDragOver={e=>onDragOver(e,item.id)} onDrop={e=>onDrop(e,item.id)} onDragLeave={()=>setDragOver(null)}
                    style={{aspectRatio:"1",position:"relative",overflow:"hidden",cursor:"grab",outline:isDragOver?`3px solid #6c63ff`:"none",borderRadius:2,opacity:dragRef.current===item.id?0.5:1}}>
                    {item.imageUrl?<img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",pointerEvents:"none"}} onError={e=>e.target.style.display="none"}/>
                      :<div style={{width:"100%",height:"100%",background:T.badge,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>👗</div>}
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 40%,rgba(0,0,0,0.75))",opacity:0,transition:"opacity 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}
                      onClick={()=>setExpanded(item)}>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 10px"}}>
                        <div style={{color:"#fff",fontSize:12,fontWeight:600,lineHeight:1.3}}>{item.name}</div>
                        {(item.paidPrice||item.price)&&<div style={{color:"rgba(255,255,255,0.8)",fontSize:11}}>{item.paidPrice||item.price}</div>}
                      </div>
                    </div>
                    {/* edit/delete buttons always visible at top */}
                    <div style={{position:"absolute",top:4,right:4,display:"flex",gap:3}}>
                      <button onClick={e=>{e.stopPropagation();openEdit(item);}} style={{background:"rgba(0,0,0,0.5)",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",color:"#fff",fontSize:10}}>✏️</button>
                      <button onClick={e=>{e.stopPropagation();deleteItem(item.id);}} style={{background:"rgba(0,0,0,0.5)",border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",color:"#fff",fontSize:10}}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {filtered.length>0&&<div style={{fontSize:11,color:T.muted,textAlign:"center",marginTop:10}}>Drag items to reorder · hover to see details</div>}
        </>}

        {/* ── WISHLIST ── */}
        {view==="wishlist"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div><h2 style={{margin:0,fontSize:18,color:T.text}}>✨ Wishlist</h2><div style={{fontSize:13,color:T.muted,marginTop:2}}>{wishlist.length} items · {S}{totalWish.toFixed(2)}</div></div>
            <button style={pb} onClick={()=>setView("wishadd")}>+ Add to Wishlist</button>
          </div>
          {wishlist.length===0?<div style={{textAlign:"center",padding:"48px 20px",color:T.muted}}><div style={{fontSize:38,marginBottom:9}}>✨</div><div style={{fontSize:14,fontWeight:600,color:T.sub,marginBottom:5}}>Wishlist is empty</div><button style={{...pb,marginTop:12}} onClick={()=>setView("wishadd")}>Add first item</button></div>:(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:13}}>
              {wishlist.map(item=>{
                const rrp=pp(item.rrp),now=pp(item.priceNow),saving=rrp>0&&now>0&&rrp>now?rrp-now:0;
                const ws=item.rrp?.match(/^[^0-9]+/)?.[0]||"£";
                return(<div key={item.id} style={{...card,border:`1px solid #e8dff5`}}>
                  <div onClick={()=>setExpandedWish(item)} style={{cursor:"pointer"}}><Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:200,objectFit:"cover",display:"block"}}/></div>
                  <div style={{padding:"10px 12px 0",cursor:"pointer"}} onClick={()=>setExpandedWish(item)}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:T.text}}>{item.name||"Unnamed"}</div>
                    {item.brand&&<div style={{fontSize:11,color:T.sub,marginBottom:2}}>{item.brand}</div>}
                    <div style={{display:"flex",gap:5,alignItems:"baseline",marginBottom:2}}>
                      {item.priceNow&&<span style={{fontSize:13,fontWeight:700,color:T.text}}>{item.priceNow}</span>}
                      {item.rrp&&item.rrp!==item.priceNow&&<span style={{fontSize:11,color:T.muted,textDecoration:item.priceNow?"line-through":"none"}}>{item.rrp}</span>}
                    </div>
                    {saving>0&&<div style={{fontSize:11,color:"#2d6a4f",fontWeight:600}}>Save {ws}{saving.toFixed(2)}</div>}
                    {item.notes&&<div style={{fontSize:11,color:T.muted,marginTop:2,marginBottom:8,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{item.notes}</div>}
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
          {wishErr&&<div style={err}>{wishErr}</div>}
          {wishMode==="url"&&<>
            {wishFetchStep==="idle"&&<><Fld T={T} label="Product URL" placeholder="https://…" value={wishUrl} onChange={e=>setWishUrl(e.target.value)}/><button style={{...pb,width:"100%"}} onClick={doWishFetch}>Fetch Details</button></>}
            {wishFetchStep==="loading"&&<div style={{textAlign:"center",padding:"28px 0",color:T.sub}}><div style={{fontSize:24,marginBottom:8}}>⏳</div><div style={{fontSize:13}}>{wishLoadMsg}</div></div>}
            {wishFetchStep==="review"&&<><div style={{background:"#f0faf4",border:"1px solid #c3e6cb",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:13,color:"#2d6a4f"}}>✅ Fetched! Fill in the prices.</div><WishForm data={wishFetched} onChange={setWishFetched} T={T}/><div style={{display:"flex",gap:8,marginTop:6}}><button style={{...pb,flex:1}} onClick={confirmWishFetched}>Save to Wishlist</button><button style={sb} onClick={()=>{setWishFetchStep("idle");setWishErr("");}}>← Back</button></div></>}
          </>}
          {wishMode==="manual"&&<><WishForm data={wishManual} onChange={setWishManual} T={T}/><button style={{...pb,width:"100%",marginTop:4}} onClick={doAddWishManual}>Add to Wishlist</button></>}
        </div>}

        {/* ── OUTFITS ── */}
        {view==="outfits"&&<>
          <div style={{display:"flex",background:T.badge,borderRadius:10,padding:3,marginBottom:20,maxWidth:500}}>
            {[["generate","✨ Generate"],["create","🎨 Create"],["history","📋 History"]].map(([t,l])=><button key={t} style={tabS(outfitTab===t)} onClick={()=>setOutfitTab(t)}>{l}</button>)}
          </div>

          {/* GENERATE */}
          {outfitTab==="generate"&&<>
            {items.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:T.muted}}><div style={{fontSize:36,marginBottom:8}}>👗</div><div style={{fontSize:14,color:T.sub}}>Add items to your wardrobe first</div></div>:<>
              {genStep==="setup"&&<div style={{maxWidth:560}}>
                <div style={{fontSize:14,color:T.sub,marginBottom:14}}>Select which categories to build your outfit from, then let AI pick the best combination from your wardrobe.</div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:8}}>Categories</div>
                  {cats.length===0?<div style={{color:T.muted,fontSize:13}}>No categories yet.</div>:(
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{cats.map(c=><button key={c} style={chip(genCats.includes(c))} onClick={()=>toggleGenCat(c)}>{c} <span style={{opacity:0.6,fontSize:11}}>({items.filter(i=>i.category===c).length})</span></button>)}</div>
                  )}
                </div>
                {genErr&&<div style={err}>{genErr}</div>}
                <button style={{...pb,opacity:genCats.length===0||genLoading?0.4:1,display:"flex",alignItems:"center",gap:8,justifyContent:"center",width:"100%"}} onClick={generateOutfit} disabled={genCats.length===0||genLoading}>
                  {genLoading?<><span style={{fontSize:18}}>⏳</span> Generating your outfit…</>:<><span style={{fontSize:18}}>✨</span> Generate Outfit</>}
                </button>
              </div>}

              {genStep==="result"&&<div style={{maxWidth:700}}>
                <div style={{background:"linear-gradient(135deg,#667eea,#764ba2)",borderRadius:12,padding:18,marginBottom:20,color:"#fff"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",marginBottom:6,opacity:0.8}}>✨ STYLIST NOTE</div>
                  <div style={{fontSize:14,lineHeight:1.6}}>{genReasoning}</div>
                </div>
                <div style={{fontSize:12,color:T.muted,marginBottom:10}}>🔒 Lock items you want to keep, then regenerate for new suggestions on the rest</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12,marginBottom:20}}>
                  {genResult.map(id=>{
                    const item=items.find(i=>i.id===id);if(!item)return null;
                    const locked=genLocked.includes(id);
                    return(<div key={id} style={{borderRadius:10,overflow:"hidden",border:`2px solid ${locked?"#6c63ff":T.border}`,position:"relative",background:T.surface}}>
                      <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:150,objectFit:"cover",display:"block"}}/>
                      <button onClick={()=>toggleLock(id)} title={locked?"Unlock":"Lock"} style={{position:"absolute",top:6,right:6,background:locked?"#6c63ff":"rgba(0,0,0,0.5)",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {locked?"🔒":"🔓"}
                      </button>
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
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"start"}}>
                    <input style={inp} value={genName} onChange={e=>setGenName(e.target.value)} placeholder="Outfit name e.g. Smart Casual…" onKeyDown={e=>e.key==="Enter"&&saveGenOutfit()}/>
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
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 300px",minWidth:280}}>
                <div style={{fontSize:13,fontWeight:600,color:T.sub,marginBottom:10}}>Select items from your wardrobe</div>
                {items.length===0?<div style={{color:T.muted,fontSize:13}}>No wardrobe items yet.</div>:(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8,maxHeight:480,overflowY:"auto"}}>
                    {items.map(item=>{
                      const sel=selItems.includes(item.id);
                      return(<div key={item.id} onClick={()=>toggleSel(item.id)} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden",cursor:"pointer",position:"relative",border:`3px solid ${sel?"#6c63ff":"transparent"}`,boxSizing:"border-box"}}>
                        <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                        {sel&&<div style={{position:"absolute",top:4,right:4,background:"#6c63ff",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>✓</div>}
                        <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.5)",padding:"3px 5px"}}><div style={{color:"#fff",fontSize:9,lineHeight:1.2,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{item.name}</div></div>
                      </div>);
                    })}
                  </div>
                )}
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
                      );})}</div>
                  )}
                  {selItems.length>0&&<>
                    <div style={{background:T.badge,borderRadius:8,padding:"10px 12px",marginBottom:14}}>
                      <div style={{fontSize:11,color:T.muted,marginBottom:2}}>Total cost</div>
                      <div style={{fontSize:22,fontWeight:800,color:T.text}}>{S}{selItems.map(id=>items.find(i=>i.id===id)).filter(Boolean).reduce((s,i)=>s+pp(i.paidPrice||i.price),0).toFixed(2)}</div>
                      <div style={{fontSize:10,color:T.muted,marginTop:1}}>{selItems.length} items</div>
                    </div>
                  </>}
                  <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Outfit Name *</label><input style={inp} value={outfitName} onChange={e=>setOutfitName(e.target.value)} placeholder="e.g. Casual Friday"/></div>
                  <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Notes</label><input style={inp} value={outfitNotes} onChange={e=>setOutfitNotes(e.target.value)} placeholder="e.g. Summer wedding…"/></div>
                  <button style={{...pb,width:"100%",opacity:(!outfitName.trim()||selItems.length===0)?0.4:1}} onClick={saveOutfit} disabled={!outfitName.trim()||selItems.length===0}>Save Outfit</button>
                </div>
              </div>
            </div>
          </>}

          {/* EDIT OUTFIT */}
          {outfitTab==="edit"&&editOutfitId&&<>
            <div style={{fontSize:15,fontWeight:700,color:T.text,marginBottom:14}}>Edit Outfit</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{flex:"1 1 300px"}}>
                <div style={{fontSize:13,fontWeight:600,color:T.sub,marginBottom:10}}>Select items</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8,maxHeight:400,overflowY:"auto"}}>
                  {items.map(item=>{
                    const sel=(editOutfitForm.itemIds||[]).includes(item.id);
                    return(<div key={item.id} onClick={()=>setEditOutfitForm(f=>({...f,itemIds:sel?f.itemIds.filter(x=>x!==item.id):[...(f.itemIds||[]),item.id]}))} style={{aspectRatio:"1",borderRadius:8,overflow:"hidden",cursor:"pointer",position:"relative",border:`3px solid ${sel?"#6c63ff":"transparent"}`,boxSizing:"border-box"}}>
                      <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                      {sel&&<div style={{position:"absolute",top:4,right:4,background:"#6c63ff",borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12}}>✓</div>}
                    </div>);
                  })}
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
            {outfits.length===0?<div style={{textAlign:"center",padding:"40px 20px",color:T.muted}}><div style={{fontSize:36,marginBottom:8}}>👗</div><div style={{fontSize:14,fontWeight:600,color:T.sub,marginBottom:5}}>No outfits saved yet</div><button style={{...pb,marginTop:10}} onClick={()=>setOutfitTab("create")}>Create your first outfit</button></div>:(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {outfits.map(outfit=>{
                  const its=outfit.itemIds.map(id=>items.find(i=>i.id===id)).filter(Boolean);
                  const missing=outfit.itemIds.length-its.length;
                  return(<div key={outfit.id} style={{background:T.surface,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
                    <div style={{padding:"14px 16px",cursor:"pointer"}} onClick={()=>setExpandedOutfit(expandedOutfit?.id===outfit.id?null:outfit)}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div><div style={{fontSize:15,fontWeight:700,color:T.text}}>{outfit.name}</div><div style={{fontSize:11,color:T.muted,marginTop:2}}>{new Date(outfit.createdAt).toLocaleDateString()} · {outfit.itemIds.length} items{missing>0?` (${missing} removed)`:""}</div>{outfit.notes&&<div style={{fontSize:12,color:T.sub,marginTop:3,fontStyle:"italic"}}>{outfit.notes}</div>}</div>
                        <div style={{textAlign:"right"}}><div style={{fontSize:18,fontWeight:800,color:T.text}}>{S}{(outfit.totalPaid||0).toFixed(2)}</div>{outfit.totalVal>outfit.totalPaid&&<div style={{fontSize:11,color:T.muted,textDecoration:"line-through"}}>{S}{(outfit.totalVal||0).toFixed(2)}</div>}</div>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {its.slice(0,8).map(item=><Img key={item.id} src={item.imageUrl} alt={item.name} style={{width:50,height:50,objectFit:"cover",borderRadius:7,flexShrink:0}}/>)}
                        {its.length>8&&<div style={{width:50,height:50,borderRadius:7,background:T.badge,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.sub}}>+{its.length-8}</div>}
                      </div>
                    </div>
                    {expandedOutfit?.id===outfit.id&&<div style={{borderTop:`1px solid ${T.border}`,padding:"12px 16px"}}>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                        {its.map(item=><div key={item.id} style={{textAlign:"center"}}><Img src={item.imageUrl} alt={item.name} style={{width:64,height:64,objectFit:"cover",borderRadius:8,display:"block"}}/><div style={{fontSize:9,color:T.sub,marginTop:3,width:64,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</div><div style={{fontSize:9,color:T.muted}}>{item.paidPrice||item.price}</div></div>)}
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
        </>}

        {/* ── ADD TO WARDROBE ── */}
        {view==="add"&&<div style={form}>
          <h2 style={{margin:"0 0 14px",fontSize:18,color:T.text}}>Add Item</h2>
          <div style={{display:"flex",background:T.badge,borderRadius:8,padding:3,marginBottom:16}}>
            <button style={tabS(addMode==="url")} onClick={()=>{setAddMode("url");setAddErr("");setFetchStep("idle");}}>From URL</button>
            <button style={tabS(addMode==="manual")} onClick={()=>{setAddMode("manual");setAddErr("");}}>Manually</button>
          </div>
          {cats.length===0&&<div style={{...err,background:"#fffbea",color:"#92651a"}}>No categories yet. <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setView("manage")}>Create one first →</span></div>}
          {addErr&&<div style={err}>{addErr}</div>}
          {addMode==="url"&&<>
            {fetchStep==="idle"&&<><Fld T={T} label="Product URL" placeholder="https://…" value={addUrl} onChange={e=>setAddUrl(e.target.value)}/><div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>Category</label><select value={addCat} onChange={e=>setAddCat(e.target.value)} style={{...inp,marginBottom:0}}><option value="">Select…</option>{cats.map(c=><option key={c}>{c}</option>)}</select></div><button style={{...pb,width:"100%"}} onClick={doFetch}>Fetch Details</button></>}
            {fetchStep==="loading"&&<div style={{textAlign:"center",padding:"28px 0",color:T.sub}}><div style={{fontSize:24,marginBottom:8}}>⏳</div><div style={{fontSize:13}}>{loadMsg}</div></div>}
            {fetchStep==="review"&&<><div style={{background:"#f0faf4",border:"1px solid #c3e6cb",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:13,color:"#2d6a4f"}}>✅ Fetched! Check details and photo.</div><ItemForm data={fetchedData} onChange={setFetchedData} cats={cats} seasons={seasons} onAddSeason={addSeason} T={T}/><div style={{display:"flex",gap:8}}><button style={{...pb,flex:1}} onClick={confirmFetched}>Save to Wardrobe</button><button style={sb} onClick={()=>{setFetchStep("idle");setAddErr("");}}>← Back</button></div></>}
          </>}
          {addMode==="manual"&&<><ItemForm data={manual} onChange={setManual} cats={cats} seasons={seasons} onAddSeason={addSeason} T={T}/><button style={{...pb,width:"100%",marginTop:4}} onClick={doAddManual}>Add Item</button></>}
        </div>}

        {/* ── CATEGORIES ── */}
        {view==="manage"&&<div style={form}>
          <h2 style={{margin:"0 0 4px",fontSize:18,color:T.text}}>Categories</h2>
          <p style={{fontSize:13,color:T.muted,margin:"0 0 16px"}}>Organise your wardrobe.</p>
          {cats.length===0?<p style={{fontSize:13,color:T.muted,marginBottom:16}}>No categories yet.</p>:(
            <div style={{marginBottom:16}}>{cats.map(c=>(
              <div key={c} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:7,border:`1px solid ${T.border}`,marginBottom:6,background:T.bg}}>
                <span style={{fontSize:13,fontWeight:500,color:T.text}}>{c}</span>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:11,color:T.muted}}>{items.filter(i=>i.category===c).length} items</span>
                  <button onClick={()=>{saveCats(cats.filter(x=>x!==c));if(fCat===c)setFCat("All");}} style={{background:"none",border:"none",cursor:"pointer",color:"#c0392b",fontSize:13}}>✕</button>
                </div>
              </div>
            ))}</div>
          )}
          <label style={{fontSize:12,fontWeight:600,color:T.sub,display:"block",marginBottom:3}}>New Category</label>
          <div style={{display:"flex",gap:8}}><input style={{...inp,flex:1}} placeholder="e.g. Tops, Shoes…" value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(()=>{const t=newCat.trim();if(t&&!cats.map(c=>c.toLowerCase()).includes(t.toLowerCase())){saveCats([...cats,t]);setNewCat("");}})()}/><button style={pb} onClick={()=>{const t=newCat.trim();if(t&&!cats.map(c=>c.toLowerCase()).includes(t.toLowerCase())){saveCats([...cats,t]);setNewCat("");}}}>Add</button></div>
        </div>}

        {/* ── PROFILE ── */}
        {view==="profile"&&<div style={{maxWidth:500}}>
          {/* Profile card */}
          <div style={{background:T.surface,borderRadius:13,padding:22,border:`1px solid ${T.border}`,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
              <label style={{cursor:"pointer",flexShrink:0}}>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{const f=e.target.files[0];if(f){const d=await resizeImg(f,200);setProfilePic(d);ls.set(pkey(user),d);}}}/>
                {profilePic
                  ?<img src={profilePic} style={{width:60,height:60,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.border}`}} alt=""/>
                  :<div style={{width:60,height:60,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",border:`3px solid ${T.border}`}}>{user[0].toUpperCase()}</div>
                }
                <div style={{fontSize:10,color:T.muted,textAlign:"center",marginTop:3}}>Tap to change</div>
              </label>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:T.text}}>{user}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:2}}>{items.length} items · {wishlist.length} on wishlist · {outfits.length} outfits</div>
                <div style={{display:"flex",gap:8,marginTop:8}}>
                  <button onClick={()=>setChangingUser(!changingUser)} style={{...sb,fontSize:12,padding:"5px 12px"}}>✏️ Change username</button>
                  <button onClick={toggleDark} style={{...sb,fontSize:12,padding:"5px 12px"}}>{darkMode?"☀️ Light":"🌙 Dark"}</button>
                </div>
              </div>
            </div>
            {changingUser&&<div style={{borderTop:`1px solid ${T.border}`,paddingTop:14}}>
              <div style={{fontSize:12,fontWeight:600,color:T.sub,marginBottom:6}}>New Username</div>
              <div style={{display:"flex",gap:8}}><input style={{...inp,flex:1}} value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="new username" onKeyDown={e=>e.key==="Enter"&&doChangeUsername()}/><button style={pb} onClick={doChangeUsername}>Save</button><button style={sb} onClick={()=>{setChangingUser(false);setNewUsername("");}}>Cancel</button></div>
            </div>}
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[{label:"Listed Value",value:`${S}${totalWorth.toFixed(2)}`,sub:`${items.filter(i=>pp(i.price)>0).length} priced items`,dark:true},{label:"Total Paid",value:`${S}${totalPaid.toFixed(2)}`,sub:totalWorth-totalPaid>0?`Saved ${S}${(totalWorth-totalPaid).toFixed(2)}`:"",dark:false}].map(({label,value,sub,dark})=>(
              <div key={label} style={{background:dark?"#1a1a1a":T.surface,color:dark?"#fff":T.text,borderRadius:12,padding:18,border:dark?"none":`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:dark?"rgba(255,255,255,0.4)":T.muted,marginBottom:5}}>{label}</div>
                <div style={{fontSize:24,fontWeight:800}}>{value}</div>
                {sub&&<div style={{fontSize:11,color:dark?"rgba(255,255,255,0.35)":T.muted,marginTop:3}}>{sub}</div>}
              </div>
            ))}
          </div>
          {wishlist.length>0&&<div style={{background:T.surface,borderRadius:13,padding:20,border:`1px solid #e8dff5`,marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:5}}>Wishlist Total</div>
            <div style={{fontSize:24,fontWeight:800,color:T.text}}>{S}{totalWish.toFixed(2)}</div>
            <div style={{fontSize:11,color:T.muted,marginTop:3}}>{wishlist.length} items saved</div>
          </div>}
          {cats.length>0&&<div style={{background:T.surface,borderRadius:13,padding:20,border:`1px solid ${T.border}`}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:T.muted,marginBottom:12}}>By Category</div>
            {cats.map(c=>{const ci=items.filter(i=>i.category===c),cw=ci.reduce((s,i)=>s+pp(i.paidPrice||i.price),0);return(<div key={c} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}`}}><div><span style={{fontSize:13,fontWeight:500,color:T.text}}>{c}</span><span style={{fontSize:11,color:T.muted,marginLeft:8}}>{ci.length}</span></div><span style={{fontSize:13,fontWeight:700,color:cw>0?"#2d6a4f":T.muted}}>{cw>0?`${S}${cw.toFixed(2)}`:"-"}</span></div>);})}
          </div>}
        </div>}

      </div>

      {/* ── WARDROBE ITEM MODAL ── */}
      {expanded&&<div style={ov} onClick={()=>setExpanded(null)}>
        <div style={mod} onClick={e=>e.stopPropagation()}>
          <Img src={expanded.imageUrl} alt={expanded.name} style={{width:"100%",height:240,objectFit:"cover",display:"block"}}/>
          <div style={{padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div style={{fontSize:16,fontWeight:700,color:T.text}}>{expanded.name}</div>{expanded.brand&&<div style={{color:T.sub,fontSize:13}}>{expanded.brand}</div>}</div>
              <div style={{textAlign:"right"}}>{expanded.paidPrice&&<div style={{fontSize:16,fontWeight:700,color:"#2d6a4f"}}>{expanded.paidPrice}</div>}{expanded.price&&expanded.price!==expanded.paidPrice&&<div style={{fontSize:12,color:T.muted,textDecoration:"line-through"}}>{expanded.price}</div>}</div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
              <span style={badge}>{expanded.category}</span>
              {expanded.season&&<span style={badge}>{expanded.season}</span>}
              {expanded.color&&<span style={badge}>🎨 {expanded.color}</span>}
              {expanded.productId&&<span style={badge}>ID: {expanded.productId}</span>}
            </div>
            {expanded.description&&<div style={{fontSize:13,color:T.sub,marginBottom:14,lineHeight:1.5}}>{expanded.description}</div>}
            <div style={{display:"flex",gap:8}}>
              {expanded.url&&<a href={expanded.url} target="_blank" rel="noreferrer" style={{flex:1,textAlign:"center",padding:"9px",borderRadius:7,background:"#1a1a1a",color:"#fff",textDecoration:"none",fontSize:13,fontWeight:600}}>View Product →</a>}
              <button onClick={()=>openEdit(expanded)} style={sb}>✏️ Edit</button>
            </div>
          </div>
        </div>
      </div>}

      {/* ── WISHLIST ITEM MODAL ── */}
      {expandedWish&&(()=>{
        const item=expandedWish,rrp=pp(item.rrp),now=pp(item.priceNow),saving=rrp>0&&now>0&&rrp>now?rrp-now:0,ws=item.rrp?.match(/^[^0-9]+/)?.[0]||"£";
        return(<div style={ov} onClick={()=>setExpandedWish(null)}>
          <div style={{...mod,border:"2px solid #e8dff5"}} onClick={e=>e.stopPropagation()}>
            <Img src={item.imageUrl} alt={item.name} style={{width:"100%",height:240,objectFit:"cover",display:"block"}}/>
            <div style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><div style={{fontSize:16,fontWeight:700,color:T.text}}>{item.name}</div>{item.brand&&<div style={{color:T.sub,fontSize:13}}>{item.brand}</div>}</div>
                <div style={{textAlign:"right"}}>{item.priceNow&&<div style={{fontSize:16,fontWeight:700,color:T.text}}>{item.priceNow} <span style={{fontSize:11,color:T.sub,fontWeight:400}}>now</span></div>}{item.rrp&&<div style={{fontSize:12,color:T.muted}}>RRP {item.rrp}</div>}{saving>0&&<div style={{fontSize:12,color:"#2d6a4f",fontWeight:700}}>Save {ws}{saving.toFixed(2)}</div>}</div>
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
