import{c as m,u as B,a as F,b as S,r as o,j as e,S as C}from"./index-CYG20r6w.js";import{L as z}from"./lock-DM_W7vts.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const E=m("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=m("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]);function A(){var b,h;const n=B(),j=F(),{login:k,isAuthenticated:i,error:s,isLoading:a,initAuth:L}=S(),[l,d]=o.useState("operator"),[p,c]=o.useState("infratel2026"),[x,w]=o.useState("OPERATOR"),g=((h=(b=j.state)==null?void 0:b.from)==null?void 0:h.pathname)||"/";o.useEffect(()=>{i&&n(g,{replace:!0})},[i,n,g]);const u=r=>{w(r),d(r.toLowerCase()),c("infratel2026")},v=async r=>{r.preventDefault();try{await k(l,p)}catch{}};return e.jsxs("div",{style:t.container,children:[e.jsx("div",{className:"network-grid-overlay",style:t.gridOverlay}),e.jsx("div",{className:"glow-node-1",style:t.glowNode1}),e.jsx("div",{className:"glow-node-2",style:t.glowNode2}),e.jsxs("div",{style:t.card,className:"card login-card-container",children:[e.jsxs("div",{style:t.logoContainer,children:[e.jsxs("svg",{viewBox:"0 0 48 48",width:"56",height:"56",xmlns:"http://www.w3.org/2000/svg",style:{marginBottom:"8px"},children:[e.jsx("defs",{children:e.jsxs("radialGradient",{id:"peakPulse",cx:"50%",cy:"50%",r:"50%",children:[e.jsx("stop",{offset:"0%",stopColor:"#3B82F6",stopOpacity:"1"}),e.jsx("stop",{offset:"100%",stopColor:"#3B82F6",stopOpacity:"0"})]})}),e.jsx("circle",{cx:"24",cy:"12",r:"10",fill:"none",stroke:"#3B82F6",strokeWidth:"1",strokeDasharray:"3,3",opacity:"0.6",children:e.jsx("animate",{attributeName:"r",values:"8;14;8",dur:"4s",repeatCount:"indefinite"})}),e.jsx("circle",{cx:"24",cy:"12",r:"16",fill:"none",stroke:"#3B82F6",strokeWidth:"0.75",strokeDasharray:"4,4",opacity:"0.3",children:e.jsx("animate",{attributeName:"r",values:"12;20;12",dur:"5s",repeatCount:"indefinite"})}),e.jsx("line",{x1:"24",y1:"12",x2:"13",y2:"42",stroke:"#E2E8F0",strokeWidth:"2",strokeLinecap:"round"}),e.jsx("line",{x1:"24",y1:"12",x2:"35",y2:"42",stroke:"#E2E8F0",strokeWidth:"2",strokeLinecap:"round"}),e.jsx("line",{x1:"13",y1:"42",x2:"35",y2:"42",stroke:"#E2E8F0",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("line",{x1:"18",y1:"28",x2:"30",y2:"28",stroke:"#8899B4",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("line",{x1:"18",y1:"28",x2:"24",y2:"12",stroke:"#8899B4",strokeWidth:"1"}),e.jsx("line",{x1:"30",y1:"28",x2:"24",y2:"12",stroke:"#8899B4",strokeWidth:"1"}),e.jsx("circle",{cx:"24",cy:"12",r:"6",fill:"url(#peakPulse)"}),e.jsx("circle",{cx:"24",cy:"12",r:"2.5",fill:"#E2E8F0"}),e.jsx("circle",{cx:"13",cy:"42",r:"3",fill:"#0B1929",stroke:"#E2E8F0",strokeWidth:"1.5"}),e.jsx("circle",{cx:"35",cy:"42",r:"3",fill:"#0B1929",stroke:"#E2E8F0",strokeWidth:"1.5"})]}),e.jsxs("svg",{viewBox:"0 0 240 60",width:"210",height:"50",xmlns:"http://www.w3.org/2000/svg",children:[e.jsxs("text",{x:"14",y:"34",fontFamily:"'Lato', 'Inter', system-ui, sans-serif",fontSize:"26",fontWeight:"900",fill:"#F8FAFC",letterSpacing:"0.03em",children:["Infra",e.jsx("tspan",{fill:"#8899B4",fontWeight:"300",children:"Tower"}),e.jsx("tspan",{fill:"#3B82F6",fontWeight:"900",children:"UIP"})]}),e.jsx("path",{d:"M 22,42 Q 105,55 194,40",fill:"none",stroke:"#3B82F6",strokeWidth:"2.5",strokeLinecap:"round"}),e.jsx("path",{d:"M 188,34 L 196,40 L 189,46",fill:"none",stroke:"#3B82F6",strokeWidth:"2.5",strokeLinecap:"round",strokeLinejoin:"round"})]})]}),e.jsx("div",{style:t.philosophyTag,children:'"Unified Operational Intelligence — Efficiency through Centralized Monitoring"'}),e.jsxs("div",{style:t.roleSelectorContainer,children:[e.jsx("p",{style:t.selectorLabel,children:"NOC Access Profiles"}),e.jsxs("div",{style:t.selectorButtons,children:[e.jsxs("button",{type:"button",onClick:()=>u("OPERATOR"),className:`role-pill ${x==="OPERATOR"?"active":""}`,style:t.selectorBtn,children:[e.jsx(f,{size:14}),"NOC Operator"]}),e.jsxs("button",{type:"button",onClick:()=>u("ADMIN"),className:`role-pill ${x==="ADMIN"?"active":""}`,style:t.selectorBtn,children:[e.jsx(C,{size:14}),"System Admin"]})]})]}),s&&e.jsx("div",{style:t.errorAlert,children:e.jsx("span",{children:s})}),e.jsxs("form",{onSubmit:v,style:t.form,children:[e.jsxs("div",{style:t.inputGroup,children:[e.jsx("label",{style:t.label,children:"Username"}),e.jsxs("div",{style:t.inputWrapper,children:[e.jsx(f,{size:16,style:t.inputIcon}),e.jsx("input",{type:"text",value:l,onChange:r=>d(r.target.value),style:t.input,className:"login-input",placeholder:"operator / admin",required:!0})]})]}),e.jsxs("div",{style:t.inputGroup,children:[e.jsx("label",{style:t.label,children:"Password"}),e.jsxs("div",{style:t.inputWrapper,children:[e.jsx(z,{size:16,style:t.inputIcon}),e.jsx("input",{type:"password",value:p,onChange:r=>c(r.target.value),style:t.input,className:"login-input",placeholder:"••••••••••••",required:!0})]})]}),e.jsx("button",{type:"submit",disabled:a,className:"submit-button",style:t.submitBtn,children:a?e.jsxs("span",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"},children:[e.jsx(E,{size:16,className:"spin"}),"Synchronizing Secure Ingress..."]}):"Login"})]}),e.jsxs("div",{style:t.footer,children:[e.jsx("span",{children:"Secured Terminal Node | v1.0.0"}),e.jsx("span",{children:"© 2026 InfraTowerUIP"})]})]})]})}const y=document.createElement("style");y.innerText=`
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes float-glow-1 {
    0% { transform: translate(0px, 0px) scale(1); }
    50% { transform: translate(60px, 40px) scale(1.1); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  @keyframes float-glow-2 {
    0% { transform: translate(0px, 0px) scale(1.1); }
    50% { transform: translate(-60px, -40px) scale(1); }
    100% { transform: translate(0px, 0px) scale(1.1); }
  }
  
  .glow-node-1 {
    animation: float-glow-1 12s ease-in-out infinite;
  }
  .glow-node-2 {
    animation: float-glow-2 15s ease-in-out infinite;
  }

  .network-grid-overlay {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 32px 32px;
    background-position: center;
    pointer-events: none;
    z-index: 1;
  }

  .login-card-container {
    backdrop-filter: blur(24px) saturate(180%);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  .login-card-container:hover {
    transform: translateY(-2px);
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .login-input {
    border: 1px solid rgba(226, 232, 240, 0.08);
    background-color: rgba(15, 23, 42, 0.6);
    transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  }

  .login-input:focus {
    border-color: #3B82F6 !important;
    background-color: #0a1727 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 8px 24px rgba(0,0,0,0.3) !important;
  }

  .role-pill {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid rgba(255, 255, 255, 0.06);
    background-color: rgba(255, 255, 255, 0.02);
    color: #8899B4;
  }

  .role-pill:hover {
    background-color: rgba(226, 232, 240, 0.06);
    border-color: rgba(226, 232, 240, 0.12);
    color: #F8FAFC;
  }

  .role-pill.active {
    background-color: rgba(59, 130, 246, 0.1) !important;
    border-color: rgba(59, 130, 246, 0.4) !important;
    color: #3B82F6 !important;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.02);
  }

  .submit-button {
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    border: none;
    border-radius: 8px;
    color: #FFFFFF;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .submit-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35), 0 0 0 2px rgba(37, 99, 235, 0.2);
    transform: translateY(-1px);
  }

  .submit-button:active:not(:disabled) {
    transform: translateY(0.5px);
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
  }
`;document.head.appendChild(y);const t={container:{position:"relative",display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",width:"100vw",backgroundColor:"#050B14",overflow:"hidden"},gridOverlay:{opacity:.8},glowNode1:{position:"absolute",width:"450px",height:"450px",left:"10%",top:"15%",borderRadius:"50%",background:"radial-gradient(circle, rgba(59,130,246,0.08) 0%, rgba(5,11,20,0) 70%)",pointerEvents:"none",zIndex:2},glowNode2:{position:"absolute",width:"500px",height:"500px",right:"15%",bottom:"10%",borderRadius:"50%",background:"radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(5,11,20,0) 70%)",pointerEvents:"none",zIndex:2},card:{width:"100%",maxWidth:"430px",padding:"36px",zIndex:10,backgroundColor:"rgba(10, 20, 35, 0.55)",border:"1px solid rgba(255, 255, 255, 0.05)",borderRadius:"16px",textAlign:"center"},logoContainer:{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:"10px"},philosophyTag:{fontSize:"12px",color:"#506380",fontStyle:"italic",lineHeight:1.4,marginBottom:"28px",padding:"0 10px"},roleSelectorContainer:{marginBottom:"24px",textAlign:"left"},selectorLabel:{fontSize:"11px",color:"#8899B4",fontWeight:"bold",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:"8px"},selectorButtons:{display:"flex",gap:"10px"},selectorBtn:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:"8px",padding:"9px 12px",borderRadius:"8px",cursor:"pointer",fontWeight:700,fontSize:"13px",border:"1px solid rgba(255,255,255,0.05)",outline:"none"},errorAlert:{backgroundColor:"rgba(239, 68, 68, 0.1)",border:"1px solid rgba(239, 68, 68, 0.25)",borderRadius:"8px",color:"#EF4444",padding:"10px 14px",fontSize:"13px",textAlign:"left",marginBottom:"20px"},form:{textAlign:"left"},inputGroup:{marginBottom:"18px"},label:{display:"block",fontSize:"12px",fontWeight:"bold",color:"#94A3B8",letterSpacing:"0.02em",marginBottom:"6px"},inputWrapper:{position:"relative",display:"flex",alignItems:"center"},inputIcon:{position:"absolute",left:"12px",color:"#506380"},input:{width:"100%",padding:"11px 12px 11px 36px",borderRadius:"8px",color:"#F8FAFC",outline:"none",fontSize:"14px"},submitBtn:{width:"100%",padding:"12px",fontSize:"14px",marginTop:"6px"},footer:{display:"flex",justifyContent:"space-between",fontSize:"10px",color:"#506380",marginTop:"28px",borderTop:"1px solid rgba(255, 255, 255, 0.05)",paddingTop:"16px"}};export{A as default};
