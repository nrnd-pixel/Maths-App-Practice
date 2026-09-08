const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const bridge=read('past-paper-resume.js');
const config=read('config.js');

function expect(condition,message){
  if(!condition) throw new Error(message);
}

// The legacy shell binds the button to the original nextQuestion reference during boot.
expect(index.includes("$('next-btn').onclick=nextQuestion"),'legacy Next button binding changed; review whether the V5.5C.1 bridge is still needed');

// Consolidated resume must retain the historical C1 compatibility bridge.
expect(bridge.includes('__v55c1ResumeButtonBridgeInstalled'),'historical V5.5C.1 install flag must remain available');
expect(bridge.includes('__v55cResumePastPaperPracticeWrappersInstalled'),'bridge must wait for the V5.5C resume wrapper');
expect(bridge.includes("document.getElementById('next-btn')"),'bridge must target only the Practice Next button');
expect(bridge.includes('button.onclick = () => ROOT.nextQuestion();'),'Practice Next button must call the wrapped nextQuestion function');
expect(bridge.includes("button.dataset.v55cResumeBridge = 'true'"),'bridge should mark the rebound button for manual diagnostics');

// Loader order matters: resume is outside the core and owns the bridge before results/consolidated V57A load.
expect(config.includes("'./past-paper-resume.js'"),'consolidated V5.5C/C1 resume must be loaded by config');
expect(config.indexOf("'./past-paper-core.js'") < config.indexOf("'./past-paper-resume.js'"),'resume must load after core');
expect(config.indexOf("'./past-paper-resume.js'") < config.indexOf("'./past-paper-results.js'"),'resume must load before result attribution');
expect(config.indexOf("'./past-paper-resume.js'") < config.indexOf("'./past-paper-cross-device.js'"),'consolidated V57A must remain outside the consolidated V55 resume boundary');

// Scope guard: do not touch Exam Mode navigation.
expect(!bridge.includes('exam-next-btn'),'resume bridge must not modify Exam Mode navigation');

console.log('V5.5C.1 Resume button bridge regression passed.');
