const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const bridge=read('v55c1-resume-button-bridge.js');
const config=read('config.js');

function expect(condition,message){
  if(!condition) throw new Error(message);
}

// The legacy shell binds the button to the original nextQuestion reference during boot.
expect(index.includes("$('next-btn').onclick=nextQuestion"),'legacy Next button binding changed; review whether the V5.5C.1 bridge is still needed');

// The bridge must wait for the V5.5C wrapper, then route button clicks through the wrapped function.
expect(bridge.includes('__v55cResumePastPaperPracticeWrappersInstalled'),'bridge must wait for the V5.5C resume wrapper');
expect(bridge.includes("document.getElementById('next-btn')"),'bridge must target only the Practice Next button');
expect(bridge.includes('button.onclick = () => ROOT.nextQuestion();'),'Practice Next button must call the wrapped nextQuestion function');
expect(bridge.includes("button.dataset.v55cResumeBridge = 'true'"),'bridge should mark the rebound button for manual diagnostics');

// Loader order matters: V5.5C establishes the wrapper before the button bridge is installed.
expect(config.includes("'./v55c1-resume-button-bridge.js'"),'V5.5C.1 bridge must be loaded by config');
expect(config.indexOf("'./v55c-resume-past-paper-practice.js'") < config.indexOf("'./v55c1-resume-button-bridge.js'"),'V5.5C.1 bridge must load after V5.5C');

// Scope guard: do not touch Exam Mode navigation.
expect(!bridge.includes('exam-next-btn'),'resume bridge must not modify Exam Mode navigation');

console.log('V5.5C.1 Resume button bridge regression passed.');
