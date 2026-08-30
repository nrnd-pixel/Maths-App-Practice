const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ui=read('v53c-two-mode-student-ui.js');
const release=read('v40-release.js');

function expect(condition,message){
  if(!condition) throw new Error(message);
}

expect(ui.includes("#${MODE_BUTTON_ID},#${LIBRARY_ID}{display:none!important}"),'legacy topical student entry points must be visually suppressed');
expect(ui.includes("modeSwitch.classList.remove('v52c-three-modes')"),'three-mode layout class must be removed');
expect(ui.includes("modeSwitch.classList.add('v53c-two-modes')"),'two-mode layout class must be applied');
expect(ui.includes("topical.hidden=true"),'legacy Topical Practice button must be hidden from accessibility/layout');
expect(ui.includes("library.hidden=true"),'legacy topical set library must be hidden from accessibility/layout');
expect(ui.includes("window.addEventListener('click',onWindowCapture,true)"),'window capture must block the older document-capture repeat route');
expect(ui.includes("result?.dataset.v52c2TopicalResult!=='1'"),'ordinary Practice result repeat must remain untouched');
expect(ui.includes("setStartMode('practice')"),'legacy topical repeat must return to ordinary Practice');
expect(!ui.includes('MutationObserver'),'V5.3C must not add a permanent DOM observer');
expect(!ui.includes('cloud.rpc('),'V5.3C must remain UI-only with no RPC changes');
expect(release.includes("loadScriptOnce('v52c-student-topical-library.js?v=52c-1'"),'rollback V5.2C student route must remain loaded');
expect(release.includes("loadScriptOnce('v53b-unified-practice-retrieval.js?v=53b-1'"),'unified Practice retrieval must remain loaded');
expect(release.includes("loadScriptOnce('v52-teacher-topical-library.js?v=52b-1'"),'teacher Topical Exercise Library must remain loaded');

console.log('V5.3C two-mode student UI regression passed.');
