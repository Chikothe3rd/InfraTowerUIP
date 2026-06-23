import{c as n,R as o,j as s}from"./index-CYG20r6w.js";import{T as t}from"./triangle-alert-BbHSWY4R.js";/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]);/**
 * @license lucide-react v0.378.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=n("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);function j({title:c,value:d,unit:i="",trend:e,icon:a,variant:p="primary",subtext:r="",onClick:l}){return s.jsxs("div",{className:`kpi-glass-card ${p}`,onClick:l,style:{cursor:l?"pointer":"default"},children:[s.jsxs("div",{className:"kpi-card-header",children:[s.jsx("span",{className:"kpi-card-title-text",children:c}),a&&s.jsx("div",{className:"kpi-card-icon-wrapper",children:a})]}),s.jsx("div",{children:s.jsxs("div",{className:"kpi-card-value-display",children:[d,i&&s.jsx("span",{className:"kpi-card-unit-text",children:i})]})}),s.jsxs("div",{className:"kpi-card-footer",children:[e&&s.jsxs("div",{className:"kpi-card-trend-badge",children:[e.direction==="up"&&s.jsx(m,{size:14}),e.direction==="down"&&s.jsx(x,{size:14}),e.direction==="neutral"&&s.jsx(t,{size:14}),s.jsx("span",{children:e.value}),e.label&&s.jsx("span",{className:"kpi-trend-label",children:e.label})]}),r&&s.jsx("div",{className:"kpi-card-subtext",children:r})]})]})}const u=o.memo(j);export{u as K,m as T};
