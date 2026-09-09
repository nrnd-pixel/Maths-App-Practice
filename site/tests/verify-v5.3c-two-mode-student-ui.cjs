const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ui=read('practice-ui-resource-clarity.js');
const release=read('v40-release.js');

function expect(condition,message){
  if(!condition) throw new Error(message);
}

const cStart=ui.indexOf('/* V5.3C — Two-mode student UI.');
const d6Start=ui.indexOf('/* V5.3D6 — Resource Bank Status Clarity.');
expect(cStart>=0,'V53C section must remain present in the consolidated clarity owner');
expect(d6Start>cStart,'V53C must execute before V53D6 inside the consolidated clarity owner');

expect(ui.includes("#${MODE_BUTTON_ID},#${LIBRARY_ID}{display:none!important}"),'legacy topical student entry points must be visually suppressed');
expect(ui.includes("modeSwitch.classList.remove('v52c-three-modes')"),'three-mode layout class must be removed');
expect(ui.includes("modeSwitch.classList.add('v53c-two-modes')"),'two-mode layout class must be applied');
expect(ui.includes("topical.hidden=true"),'legacy Topical Practice button must be hidden from accessibility/layout');
expect(ui.includes("library.hidden=true"),'legacy topical set library must be hidden from accessibility/layout');
expect(ui.includes("window.addEventListener('click',onWindowCapture,true)"),'window capture must block the older document-capture repeat route');
expect(ui.includes('event.stopImmediatePropagation()'),'capture interception must stop the older V52C.2 document handler');
expect(ui.includes("result?.dataset.v52c2TopicalResult!=='1'"),'ordinary Practice result repeat must remain untouched');
expect(ui.includes("setStartMode('practice')"),'legacy topical repeat must return to ordinary Practice');
expect(ui.includes("Object.defineProperty(window,'V53CTwoModeStudentUi'"),'V53C public API must remain published');
expect(ui.includes('ROOT.__v53cTwoModeStudentUiInstalled = true'),'V53C install flag must remain published');
expect(!ui.slice(cStart,d6Start).includes('new MutationObserver('),'V5.3C must not add a permanent DOM observer');
expect(!ui.slice(cStart,d6Start).includes('cloud.rpc('),'V5.3C must remain UI-only with no RPC changes');
expect(release.includes("loadScriptOnce('topical-legacy-student-route.js', 'data-topical-legacy-student-route')"),'rollback V5.2C student route must remain loaded through the consolidated owner');
expect(release.includes("loadScriptOnce('practice-selection-engine.js'"),'unified Practice selection engine must remain loaded');
expect(!release.includes("loadScriptOnce('v53b-unified-practice-retrieval.js"),'historical V53B source must remain dormant');
expect(release.includes("loadScriptOnce('v52-teacher-topical-library.js?v=52b-1'"),'teacher Topical Exercise Library must remain loaded');
expect(release.includes("loadScriptOnce('practice-ui-resource-clarity.js', 'data-practice-ui-resource-clarity');"),'consolidated post-engine UI/resource owner must be loaded');
expect(release.indexOf('practice-selection-engine.js') < release.indexOf('practice-ui-resource-clarity.js'),'consolidated clarity owner must remain after the Practice selection engine');

console.log('V5.3C two-mode student UI regression passed against consolidated owner.');