import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

const storage = {
  get: (key) => { const v = localStorage.getItem(key); return v ? { value: v } : null; },
  set: (key, val) => localStorage.setItem(key, val),
};

function Img({ src, alt, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return (
    <div style={{ ...style, display:"flex", alignItems:"center", justifyContent:"center", background:"#f0eeec", fontSize:34, color:"#ccc" }}>👗</div>
  );
  return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
}

async function fetchDetails(url) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: `You are a fashion assistant. Search for the given product URL and extract clothing details.
Return ONLY valid JSON (no markdown, no backticks):
{"name":"","brand":"","price":"price with symbol e.g. £45.00","color":"","imageUrl":"best direct publicly accessible image URL, full https:// or empty string","description":"1 sentence"}`,
      messages: [{ role: "user", content: `Extract product details from: ${url}` }]
    })
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(s, e + 1));
}

const parsePrice = s => { if (!s) return 0; const n = parseFloat(s.replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };
const symOf = items => { for (const it of items) { if (it.price) { const m = it.price.match(/^[^0-9]+/); if (m) return m[0].trim(); } } return "£"; };

const ikey = u => `wd-items-${u}`;
const ckey = u => `wd-cats-${u}`;
const skey = u => `wd-seasons-${u}`;
const ACCTS = "wd-accounts";
const DEFAULT_SEASONS = ["Spring/Summer","Autumn/Winter","All Year Round","SS25","AW25","SS26","AW26"];
const BLANK = { name:"", brand:"", price:"", paidPrice:"", color:"", imageUrl:"", description:"", category:"", productId:"", season:"" };

function Fld({ label, ...p }) {
  return (
    <div style={{ marginBottom:10 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:3 }}>{label}</label>}
      <input style={{ width:"100%", padding:"8px 11px", borderRadius:7, border:"1.5px solid #ddd", fontSize:13, outline:"none", boxSizing:"border-box" }} {...p} />
    </div>
  );
}

function ItemForm({ data, onChange, cats, seasons, onAddSeason }) {
  const [addingSeason, setAddingSeason] = useState(false);
  const [newSeason, setNewSeason] = useState("");
  const f = (k, v) => onChange({ ...data, [k]: v });
  return (
    <>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
        <div style={{ gridColumn:"1/-1" }}><Fld label="Name *" value={data.name||""} onChange={e=>f("name",e.target.value)} placeholder="e.g. Linen Blazer" /></div>
        <Fld label="Brand" value={data.brand||""} onChange={e=>f("brand",e.target.value)} placeholder="e.g. Zara" />
        <Fld label="Product ID" value={data.productId||""} onChange={e=>f("productId",e.target.value)} placeholder="SKU / ref" />
        <Fld label="Listed Price" value={data.price||""} onChange={e=>f("price",e.target.value)} placeholder="£49.99" />
        <Fld label="Paid Price" value={data.paidPrice||""} onChange={e=>f("paidPrice",e.target.value)} placeholder="£29.99" />
      </div>
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:3 }}>Season</label>
        {addingSeason ? (
          <div style={{ display:"flex", gap:8 }}>
            <input autoFocus value={newSeason} onChange={e=>setNewSeason(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&newSeason.trim()){onAddSeason(newSeason.trim());f("season",newSeason.trim());setNewSeason("");setAddingSeason(false);}if(e.key==="Escape")setAddingSeason(false);}}
              placeholder="e.g. Resort 2026" style={{ flex:1, padding:"8px 11px", borderRadius:7, border:"1.5px solid #6c63ff", fontSize:13, outline:"none" }} />
            <button onClick={()=>{if(newSeason.trim()){onAddSeason(newSeason.trim());f("season",newSeason.trim());}setNewSeason("");setAddingSeason(false);}}
              style={{ padding:"8px 14px", borderRadius:7, border:"none", background:"#1a1a1a", color:"#fff", cursor:"pointer", fontSize:13 }}>Add</button>
            <button onClick={()=>setAddingSeason(false)} style={{ padding:"8px 12px", borderRadius:7, border:"1.5px solid #ddd", background:"#fff", cursor:"pointer", fontSize:13 }}>✕</button>
          </div>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            <select value={data.season||""} onChange={e=>f("season",e.target.value)} style={{ flex:1, padding:"8px 11px", borderRadius:7, border:"1.5px solid #ddd", fontSize:13, outline:"none", background:"#fff" }}>
              <option value="">None</option>
              {seasons.map(s=><option key={s}>{s}</option>)}
            </select>
            <button onClick={()=>setAddingSeason(true)} title="Add custom season"
              style={{ padding:"0 12px", borderRadius:7, border:"1.5px solid #ddd", background:"#fff", cursor:"pointer", fontSize:18, color:"#888" }}>+</button>
          </div>
        )}
      </div>
      <Fld label="Colour" value={data.color||""} onChange={e=>f("color",e.target.value)} placeholder="e.g. Cream" />
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:3 }}>Photo</label>
        {data.imageUrl ? (
          <div style={{ position:"relative", borderRadius:8, overflow:"hidden", height:160, background:"#f0eeec", marginBottom:6 }}>
            <Img src={data.imageUrl} alt="preview" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
            <button onClick={()=>f("imageUrl","")} style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.55)", border:"none", borderRadius:"50%", width:24, height:24, cursor:"pointer", color:"#fff", fontSize:13 }}>✕</button>
          </div>
        ) : (
          <label style={{ display:"block", borderRadius:8, border:"2px dashed #e0dedd", padding:"22px 16px", textAlign:"center", color:"#bbb", fontSize:12, cursor:"pointer", marginBottom:6, background:"#fafaf9" }}>
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
              const file=e.target.files[0]; if(!file) return;
              const reader=new FileReader();
              reader.onload=ev=>{
                const img=new Image();
                img.onload=()=>{
                  const MAX=800; let w=img.width,h=img.height;
                  if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
                  const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
                  canvas.getContext("2d").drawImage(img,0,0,w,h);
                  f("imageUrl",canvas.toDataURL("image/jpeg",0.82));
                };
                img.src=ev.target.result;
              };
              reader.readAsDataURL(file);
            }} />
            <div style={{ fontSize:24, marginBottom:6 }}>📷</div>
            <div style={{ fontWeight:600, color:"#888", marginBottom:2 }}>Upload from device</div>
            <div style={{ fontSize:11 }}>Click to choose a photo</div>
          </label>
        )}
        <input value={data.imageUrl?.startsWith("data:") ? "" : (data.imageUrl||"")}
          onChange={e=>f("imageUrl",e.target.value)} placeholder="…or paste an image URL"
          style={{ width:"100%", padding:"8px 11px", borderRadius:7, border:"1.5px solid #ddd", fontSize:13, outline:"none", boxSizing:"border-box" }} />
      </div>
      <Fld label="Description" value={data.description||""} onChange={e=>f("description",e.target.value)} placeholder="Brief description…" />
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:3 }}>Category *</label>
        <select value={data.category||""} onChange={e=>f("category",e.target.value)} style={{ width:"100%", padding:"8px 11px", borderRadius:7, border:"1.5px solid #ddd", fontSize:13, outline:"none", background:"#fff" }}>
          <option value="">Select…</option>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [seasons, setSeasons] = useState(DEFAULT_SEASONS);
  const [view, setView] = useState("grid");
  const [fCat, setFCat] = useState("All");
  const [fBrand, setFBrand] = useState("All");
  const [fSeason, setFSeason] = useState("All");
  const [addMode, setAddMode] = useState("url");
  const [addUrl, setAddUrl] = useState("");
  const [addCat, setAddCat] = useState("");
  const [fetchStep, setFetchStep] = useState("idle");
  const [fetchedData, setFetchedData] = useState(BLANK);
  const [manual, setManual] = useState(BLANK);
  const [addErr, setAddErr] = useState("");
  const [loadMsg, setLoadMsg] = useState("");
  const [newCat, setNewCat] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [authMode, setAuthMode] = useState("login");
  const [authUser, setAuthUser] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authErr, setAuthErr] = useState("");

  useEffect(() => { const s = sessionStorage.getItem("wd-session"); if (s) loadUser(s); }, []);

  const loadUser = u => {
    const ri = storage.get(ikey(u)); setItems(ri ? JSON.parse(ri.value) : []);
    const rc = storage.get(ckey(u)); setCats(rc ? JSON.parse(rc.value) : []);
    const rs = storage.get(skey(u)); setSeasons(rs ? JSON.parse(rs.value) : DEFAULT_SEASONS);
    setUser(u); sessionStorage.setItem("wd-session", u);
  };

  const getAccts = () => { const r = storage.get(ACCTS); return r ? JSON.parse(r.value) : {}; };

  const handleAuth = () => {
    setAuthErr("");
    const u = authUser.trim().toLowerCase(), p = authPass.trim();
    if (!u || !p) { setAuthErr("Fill in both fields."); return; }
    const accts = getAccts();
    if (authMode === "login") {
      if (!accts[u]) { setAuthErr("Account not found."); return; }
      if (accts[u] !== p) { setAuthErr("Incorrect password."); return; }
    } else {
      if (accts[u]) { setAuthErr("Username already taken."); return; }
      accts[u] = p;
      storage.set(ACCTS, JSON.stringify(accts));
    }
    loadUser(u);
  };

  const logout = () => { setUser(null); setItems([]); setCats([]); setSeasons(DEFAULT_SEASONS); sessionStorage.removeItem("wd-session"); };

  const saveItems   = v => { setItems(v);   storage.set(ikey(user), JSON.stringify(v)); };
  const saveCats    = v => { setCats(v);    storage.set(ckey(user), JSON.stringify(v)); };
  const saveSeasons = v => { setSeasons(v); storage.set(skey(user), JSON.stringify(v)); };
  const addSeason   = s => { if (!s || seasons.includes(s)) return; saveSeasons([...seasons, s]); };

  const doFetch = async () => {
    if (!addUrl.trim() || !addCat) { setAddErr("URL and category required."); return; }
    setAddErr(""); setFetchStep("loading");
    const msgs = ["Fetching page…","Extracting details…","Looking for image…","Almost done…"];
    let mi = 0; setLoadMsg(msgs[0]);
    const iv = setInterval(() => { mi = (mi+1) % msgs.length; setLoadMsg(msgs[mi]); }, 2200);
    try {
      const d = await fetchDetails(addUrl);
      setFetchedData({ ...BLANK, category:addCat, productId:"", season:"", paidPrice:"", ...d });
      setFetchStep("review");
    } catch(e) { setAddErr(`Fetch failed (${e.message}). Try again or add manually.`); setFetchStep("idle"); }
    finally { clearInterval(iv); setLoadMsg(""); }
  };

  const confirmFetched = () => {
    if (!fetchedData.name.trim() || !fetchedData.category) { setAddErr("Name and category required."); return; }
    saveItems([{ id:Date.now(), url:addUrl, addedAt:new Date().toISOString(), ...fetchedData }, ...items]);
    setAddUrl(""); setAddCat(""); setFetchedData(BLANK); setFetchStep("idle"); setView("grid");
  };

  const doAddManual = () => {
    if (!manual.name.trim() || !manual.category) { setAddErr("Name and category required."); return; }
    saveItems([{ id:Date.now(), url:"", addedAt:new Date().toISOString(), ...manual }, ...items]);
    setManual(BLANK); setView("grid");
  };

  const deleteItem = id => { saveItems(items.filter(it => it.id !== id)); setExpanded(null); };
  const openEdit   = item => { setEditForm({...item}); setEditId(item.id); setExpanded(null); };
  const saveEdit   = () => { saveItems(items.map(it => it.id === editId ? { ...it, ...editForm } : it)); setEditId(null); };

  const addCatFn = () => { const t=newCat.trim(); if(!t||cats.map(c=>c.toLowerCase()).includes(t.toLowerCase()))return; saveCats([...cats,t]); setNewCat(""); };
  const delCat   = c => { saveCats(cats.filter(x=>x!==c)); if(fCat===c)setFCat("All"); };

  const brands      = ["All", ...Array.from(new Set(items.map(i=>i.brand).filter(Boolean))).sort()];
  const usedSeasons = ["All", ...Array.from(new Set(items.map(i=>i.season).filter(Boolean))).sort()];
  const sym         = symOf(items);
  const totalWorth  = items.reduce((s,it)=>s+parsePrice(it.price),0);
  const totalPaid   = items.reduce((s,it)=>s+parsePrice(it.paidPrice||it.price),0);
  const filtered    = items.filter(it=>(fCat==="All"||it.category===fCat)&&(fBrand==="All"||it.brand===fBrand)&&(fSeason==="All"||it.season===fSeason));

  const S = {
    app:  {fontFamily:"'Inter',sans-serif",minHeight:"100vh",background:"#fafaf9",color:"#1a1a1a"},
    hdr:  {background:"#fff",borderBottom:"1px solid #eee",padding:"12px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8},
    nb:   a=>({padding:"6px 13px",borderRadius:18,border:"none",cursor:"pointer",fontSize:13,fontWeight:500,background:a?"#1a1a1a":"transparent",color:a?"#fff":"#666"}),
    body: {maxWidth:1080,margin:"0 auto",padding:"18px 14px"},
    chip: a=>({padding:"4px 11px",borderRadius:13,border:`1.5px solid ${a?"#1a1a1a":"#ddd"}`,background:a?"#1a1a1a":"#fff",color:a?"#fff":"#555",fontSize:12,cursor:"pointer",fontWeight:a?600:400,whiteSpace:"nowrap"}),
    card: {background:"#fff",borderRadius:11,overflow:"hidden",border:"1px solid #e8e6e3",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},
    imgS: {width:"100%",height:200,objectFit:"cover",display:"block"},
    form: {background:"#fff",borderRadius:14,padding:24,border:"1px solid #e8e6e3",maxWidth:510},
    pb:   {background:"#1a1a1a",color:"#fff",padding:"10px 20px",borderRadius:7,border:"none",cursor:"pointer",fontSize:13,fontWeight:600},
    sb:   {background:"#fff",color:"#333",padding:"9px 16px",borderRadius:7,border:"1.5px solid #ddd",cursor:"pointer",fontSize:13},
    err:  {color:"#c0392b",fontSize:13,marginBottom:11,padding:"8px 12px",background:"#fdf0ef",borderRadius:6},
    ov:   {position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16},
    mod:  {background:"#fff",borderRadius:14,maxWidth:420,width:"100%",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"},
    tab:  a=>({flex:1,padding:"7px 0",border:"none",background:a?"#fff":"transparent",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:a?700:400,color:a?"#1a1a1a":"#888",boxShadow:a?"0 1px 4px rgba(0,0,0,0.08)":"none"}),
    badge:{fontSize:10,padding:"2px 7px",borderRadius:9,background:"#f0eeec",color:"#777",display:"inline-block"},
  };

  if (!user) return (
    <div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:16,padding:30,border:"1px solid #e8e6e3",width:"100%",maxWidth:330,boxShadow:"0 4px 24px rgba(0,0,0,0.07)"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:34}}>👗</div>
          <div style={{fontSize:18,fontWeight:700,marginTop:8}}>Wardrobe</div>
          <div style={{fontSize:12,color:"#aaa",marginTop:3}}>Your personal clothing directory</div>
        </div>
        <div style={{display:"flex",background:"#f5f4f2",borderRadius:8,padding:3,marginBottom:18}}>
          {["login","signup"].map(m=>(
            <button key={m} style={S.tab(authMode===m)} onClick={()=>{setAuthMode(m);setAuthErr("");}}>
              {m==="login"?"Log In":"Sign Up"}
            </button>
          ))}
        </div>
        {authErr&&<div style={S.err}>{authErr}</div>}
        <Fld label="Username" value={authUser} onChange={e=>setAuthUser(e.target.value)} placeholder="e.g. sarah" onKeyDown={e=>e.key==="Enter"&&handleAuth()} />
        <Fld label="Password" type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleAuth()} />
        <button style={{...S.pb,width:"100%",marginTop:4}} onClick={handleAuth}>{authMode==="login"?"Log In":"Create Account"}</button>
        <p style={{fontSize:11,color:"#ccc",textAlign:"center",marginTop:12,marginBottom:0}}>Data is stored in your browser.</p>
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={{fontSize:15,fontWeight:700}}>👗 Wardrobe</div>
        <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
          {[["grid","Directory"],["add","+ Add"],["manage","Categories"],["profile","Profile"]].map(([v,l])=>(
            <button key={v} style={S.nb(view===v)} onClick={()=>setView(v)}>{l}</button>
          ))}
          <div style={{width:1,height:16,background:"#eee",margin:"0 2px"}}/>
          <span style={{fontSize:11,color:"#999"}}>{user}</span>
          <button style={{...S.nb(false),color:"#c0392b"}} onClick={logout}>Log out</button>
        </div>
      </div>

      <div style={S.body}>
        {view==="grid"&&<>
          {(cats.length>0||brands.length>1||usedSeasons.length>1)&&(
            <div style={{marginBottom:18,display:"flex",flexDirection:"column",gap:9}}>
              {cats.length>0&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#bbb",marginBottom:5}}>Category</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{["All",...cats].map(c=><button key={c} style={S.chip(fCat===c)} onClick={()=>setFCat(c)}>{c}</button>)}</div></div>}
              {brands.length>1&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#bbb",marginBottom:5}}>Brand</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{brands.map(b=><button key={b} style={S.chip(fBrand===b)} onClick={()=>setFBrand(b)}>{b}</button>)}</div></div>}
              {usedSeasons.length>1&&<div><div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#bbb",marginBottom:5}}>Season</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{usedSeasons.map(s=><button key={s} style={S.chip(fSeason===s)} onClick={()=>setFSeason(s)}>{s}</button>)}</div></div>}
            </div>
          )}
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"48px 20px",color:"#bbb"}}>
              <div style={{fontSize:38,marginBottom:9}}>👚</div>
              <div style={{fontSize:14,fontWeight:600,color:"#999",marginBottom:5}}>{items.length===0?"Your wardrobe is empty":"No items match"}</div>
              {items.length===0&&cats.length===0&&<button style={{...S.pb,marginTop:12}} onClick={()=>setView("manage")}>Create a Category</button>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(185px,1fr))",gap:13}}>
              {filtered.map(item=>(
                <div key={item.id} style={S.card}>
                  <div onClick={()=>setExpanded(item)} style={{cursor:"pointer"}}><Img src={item.imageUrl} alt={item.name} style={S.imgS}/></div>
                  <div style={{padding:"10px 12px 0",cursor:"pointer"}} onClick={()=>setExpanded(item)}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:2,lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name||"Unnamed"}</div>
                    {item.brand&&<div style={{fontSize:11,color:"#888",marginBottom:2}}>{item.brand}</div>}
                    <div style={{display:"flex",gap:5,alignItems:"baseline",marginBottom:2}}>
                      {item.paidPrice?<><span style={{fontSize:13,fontWeight:700,color:"#2d6a4f"}}>{item.paidPrice}</span>{item.price&&item.price!==item.paidPrice&&<span style={{fontSize:11,color:"#bbb",textDecoration:"line-through"}}>{item.price}</span>}</>:item.price&&<span style={{fontSize:13,fontWeight:700,color:"#2d6a4f"}}>{item.price}</span>}
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",paddingBottom:10}}>
                      <span style={S.badge}>{item.category}</span>
                      {item.season&&<span style={S.badge}>{item.season}</span>}
                    </div>
                  </div>
                  <div style={{borderTop:"1px solid #f0eeec",display:"flex"}}>
                    <button onClick={()=>openEdit(item)} style={{flex:1,padding:"8px 0",border:"none",background:"none",cursor:"pointer",fontSize:12,color:"#666"}}>✏️ Edit</button>
                    <button onClick={()=>deleteItem(item.id)} style={{flex:1,padding:"8px 0",border:"none",background:"none",cursor:"pointer",fontSize:12,color:"#c0392b",borderLeft:"1px solid #f0eeec"}}>🗑 Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}

        {view==="add"&&(
          <div style={S.form}>
            <h2 style={{margin:"0 0 14px",fontSize:18}}>Add Item</h2>
            <div style={{display:"flex",background:"#f5f4f2",borderRadius:8,padding:3,marginBottom:18}}>
              <button style={S.tab(addMode==="url")} onClick={()=>{setAddMode("url");setAddErr("");setFetchStep("idle");}}>From URL</button>
              <button style={S.tab(addMode==="manual")} onClick={()=>{setAddMode("manual");setAddErr("");}}>Add Manually</button>
            </div>
            {cats.length===0&&<div style={{...S.err,background:"#fffbea",color:"#92651a"}}>No categories yet. <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={()=>setView("manage")}>Create one first →</span></div>}
            {addErr&&<div style={S.err}>{addErr}</div>}
            {addMode==="url"&&<>
              {fetchStep==="idle"&&<>
                <Fld label="Product URL" placeholder="https://…" value={addUrl} onChange={e=>setAddUrl(e.target.value)}/>
                <div style={{marginBottom:14}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:3}}>Category</label>
                  <select value={addCat} onChange={e=>setAddCat(e.target.value)} style={{width:"100%",padding:"8px 11px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,outline:"none",background:"#fff"}}>
                    <option value="">Select…</option>{cats.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <button style={{...S.pb,width:"100%"}} onClick={doFetch}>Fetch Details</button>
              </>}
              {fetchStep==="loading"&&<div style={{textAlign:"center",padding:"30px 0",color:"#777"}}><div style={{fontSize:24,marginBottom:8}}>⏳</div><div style={{fontSize:13}}>{loadMsg}</div></div>}
              {fetchStep==="review"&&<>
                <div style={{background:"#f0faf4",border:"1px solid #c3e6cb",borderRadius:8,padding:"9px 13px",marginBottom:14,fontSize:13,color:"#2d6a4f"}}>✅ Details fetched! Check the photo and replace if needed.</div>
                <ItemForm data={fetchedData} onChange={setFetchedData} cats={cats} seasons={seasons} onAddSeason={addSeason}/>
                <div style={{display:"flex",gap:8,marginTop:6}}>
                  <button style={{...S.pb,flex:1}} onClick={confirmFetched}>Save to Wardrobe</button>
                  <button style={S.sb} onClick={()=>{setFetchStep("idle");setAddErr("");}}>← Back</button>
                </div>
              </>}
            </>}
            {addMode==="manual"&&<>
              <ItemForm data={manual} onChange={setManual} cats={cats} seasons={seasons} onAddSeason={addSeason}/>
              <button style={{...S.pb,width:"100%",marginTop:4}} onClick={doAddManual}>Add Item</button>
            </>}
          </div>
        )}

        {view==="manage"&&(
          <div style={S.form}>
            <h2 style={{margin:"0 0 4px",fontSize:18}}>Categories</h2>
            <p style={{fontSize:13,color:"#999",margin:"0 0 16px"}}>Organise your wardrobe.</p>
            {cats.length===0?<p style={{fontSize:13,color:"#bbb",marginBottom:16}}>No categories yet.</p>:(
              <div style={{marginBottom:16}}>{cats.map(c=>(
                <div key={c} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderRadius:7,border:"1px solid #eee",marginBottom:6,background:"#fafaf9"}}>
                  <span style={{fontSize:13,fontWeight:500}}>{c}</span>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#bbb"}}>{items.filter(i=>i.category===c).length} items</span>
                    <button onClick={()=>delCat(c)} style={{background:"none",border:"none",cursor:"pointer",color:"#c0392b",fontSize:13}}>✕</button>
                  </div>
                </div>
              ))}</div>
            )}
            <label style={{fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:3}}>New Category</label>
            <div style={{display:"flex",gap:8}}>
              <input style={{flex:1,padding:"8px 11px",borderRadius:7,border:"1.5px solid #ddd",fontSize:13,outline:"none"}} placeholder="e.g. Tops, Shoes…" value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCatFn()}/>
              <button style={S.pb} onClick={addCatFn}>Add</button>
            </div>
          </div>
        )}

        {view==="profile"&&(
          <div style={{maxWidth:500}}>
            <div style={{background:"#fff",borderRadius:13,padding:22,border:"1px solid #e8e6e3",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#fff"}}>{user[0].toUpperCase()}</div>
                <div><div style={{fontSize:16,fontWeight:700}}>{user}</div><div style={{fontSize:12,color:"#aaa",marginTop:2}}>{items.length} items · {cats.length} categories</div></div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[{label:"Listed Value",value:`${sym}${totalWorth.toFixed(2)}`,sub:`${items.filter(i=>parsePrice(i.price)>0).length} priced items`,dark:true},{label:"Total Paid",value:`${sym}${totalPaid.toFixed(2)}`,sub:totalWorth-totalPaid>0?`Saved ${sym}${(totalWorth-totalPaid).toFixed(2)}`:"",dark:false}].map(({label,value,sub,dark})=>(
                <div key={label} style={{background:dark?"#1a1a1a":"#fff",color:dark?"#fff":"#1a1a1a",borderRadius:12,padding:18,border:dark?"none":"1px solid #e8e6e3"}}>
                  <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:dark?"rgba(255,255,255,0.45)":"#aaa",marginBottom:5}}>{label}</div>
                  <div style={{fontSize:26,fontWeight:800}}>{value}</div>
                  {sub&&<div style={{fontSize:11,color:dark?"rgba(255,255,255,0.35)":"#aaa",marginTop:4}}>{sub}</div>}
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:13,padding:22,border:"1px solid #e8e6e3",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#bbb",marginBottom:14}}>By Category</div>
              {cats.map(c=>{const ci=items.filter(i=>i.category===c),cw=ci.reduce((s,it)=>s+parsePrice(it.paidPrice||it.price),0);return(<div key={c} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}><div><span style={{fontSize:13,fontWeight:500}}>{c}</span><span style={{fontSize:11,color:"#bbb",marginLeft:8}}>{ci.length} items</span></div><div style={{fontSize:13,fontWeight:700,color:cw>0?"#2d6a4f":"#bbb"}}>{cw>0?`${sym}${cw.toFixed(2)}`:"-"}</div></div>);})}
            </div>
            {brands.filter(b=>b!=="All").length>0&&(
              <div style={{background:"#fff",borderRadius:13,padding:22,border:"1px solid #e8e6e3"}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#bbb",marginBottom:14}}>By Brand</div>
                {brands.filter(b=>b!=="All").map(b=>{const bi=items.filter(i=>i.brand===b),bw=bi.reduce((s,it)=>s+parsePrice(it.paidPrice||it.price),0);return(<div key={b} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f5f5f5"}}><div><span style={{fontSize:13,fontWeight:500}}>{b}</span><span style={{fontSize:11,color:"#bbb",marginLeft:8}}>{bi.length} items</span></div><div style={{fontSize:13,fontWeight:700,color:bw>0?"#2d6a4f":"#bbb"}}>{bw>0?`${sym}${bw.toFixed(2)}`:"-"}</div></div>);})}
              </div>
            )}
          </div>
        )}
      </div>

      {expanded&&(
        <div style={S.ov} onClick={()=>setExpanded(null)}>
          <div style={S.mod} onClick={e=>e.stopPropagation()}>
            <Img src={expanded.imageUrl} alt={expanded.name} style={{width:"100%",height:240,objectFit:"cover",display:"block"}}/>
            <div style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div><div style={{fontSize:16,fontWeight:700}}>{expanded.name}</div>{expanded.brand&&<div style={{color:"#888",fontSize:13}}>{expanded.brand}</div>}</div>
                <div style={{textAlign:"right"}}>{expanded.paidPrice&&<div style={{fontSize:16,fontWeight:700,color:"#2d6a4f"}}>{expanded.paidPrice}</div>}{expanded.price&&expanded.price!==expanded.paidPrice&&<div style={{fontSize:12,color:"#bbb",textDecoration:"line-through"}}>{expanded.price}</div>}</div>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
                <span style={S.badge}>{expanded.category}</span>
                {expanded.season&&<span style={S.badge}>{expanded.season}</span>}
                {expanded.color&&<span style={S.badge}>🎨 {expanded.color}</span>}
                {expanded.productId&&<span style={S.badge}>ID: {expanded.productId}</span>}
              </div>
              {expanded.description&&<div style={{fontSize:13,color:"#555",marginBottom:14,lineHeight:1.5}}>{expanded.description}</div>}
              <div style={{display:"flex",gap:8}}>
                {expanded.url&&<a href={expanded.url} target="_blank" rel="noreferrer" style={{flex:1,textAlign:"center",padding:"9px",borderRadius:7,background:"#1a1a1a",color:"#fff",textDecoration:"none",fontSize:13,fontWeight:600}}>View Product →</a>}
                <button onClick={()=>openEdit(expanded)} style={S.sb}>✏️ Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editId&&(
        <div style={S.ov} onClick={()=>setEditId(null)}>
          <div style={{...S.mod,maxWidth:460,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"15px 20px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"#fff",zIndex:1}}>
              <div style={{fontSize:15,fontWeight:700}}>Edit Item</div>
              <button onClick={()=>setEditId(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:17,color:"#aaa"}}>✕</button>
            </div>
            <div style={{padding:20}}>
              <ItemForm data={editForm} onChange={setEditForm} cats={cats} seasons={seasons} onAddSeason={addSeason}/>
              <Fld label="Product URL" value={editForm.url||""} onChange={e=>setEditForm({...editForm,url:e.target.value})} placeholder="https://…"/>
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button style={{...S.pb,flex:1}} onClick={saveEdit}>Save Changes</button>
                <button style={S.sb} onClick={()=>setEditId(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);