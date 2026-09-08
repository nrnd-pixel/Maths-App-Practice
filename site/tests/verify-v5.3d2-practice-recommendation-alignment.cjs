const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const action=read('v44-action-center-practice.js');
const groups=read('v44-shared-focus-groups.js');
const release=read('v40-release.js');
const assignmentsCore=read('assignments-core.js');

function expect(condition,message){if(!condition)throw new Error(message);}

const eligibilityContract="if (question?.practice_eligible === true) return true;\n    return question?.practice_eligible == null && question?.active !== false;";

expect(action.includes(eligibilityContract),'Action Center must use Practice eligibility with legacy fallback');
expect(groups.includes(eligibilityContract),'Shared Focus Groups must use Practice eligibility with legacy fallback');
expect(action.includes('.filter(question => isPracticeEligible(question) &&'),'Action Center strand fallback must use unified Practice eligibility');
expect(groups.includes('.filter(question => isPracticeEligible(question) &&'),'Shared Focus strand fallback must use unified Practice eligibility');
expect(groups.includes('return questions.some(question =>\n      isPracticeEligible(question) &&'),'Shared Focus topic availability must use unified Practice eligibility');

expect(!action.includes('.filter(question => question?.active !== false &&'),'Action Center must not fall back to the legacy active-only resource pool');
expect(!groups.includes('.filter(question => question?.active !== false &&'),'Shared Focus strand resolution must not use the legacy active-only resource pool');
expect(!groups.includes('return questions.some(question =>\n      question?.active !== false &&'),'Shared Focus availability must not use the legacy active-only resource pool');

expect(release.includes("loadScriptOnce('v44-action-center-practice.js?v=44a-2', 'data-v44a-action-center-practice')"),'Action Center alignment asset must be cache-busted without changing its loader key');
expect(release.includes("loadScriptOnce('v44-shared-focus-groups.js?v=44b-2', 'data-v44b-shared-focus-groups')"),'Shared Focus alignment asset must be cache-busted without changing its loader key');
expect(release.includes("loadScriptOnce('v53b-unified-practice-retrieval.js?v=53b-1'"),'V5.3B unified Practice retrieval must remain loaded');
expect(release.includes("loadScriptOnce('assignments-core.js', 'data-assignments-core')"),'Consolidated assignment core must retain V5.3D1 teacher Practice alignment');
expect(assignmentsCore.includes("create_teacher_practice_assignments_v43b:'create_teacher_practice_assignments_v53d1'"),'V5.3D1 assignment routing must remain authoritative in the active core');

expect(!action.includes("cloud.from('questions').update"),'Action Center alignment must not mutate question eligibility or activation');
expect(!groups.includes("cloud.from('questions').update"),'Shared Focus alignment must not mutate question eligibility or activation');
expect(!action.includes('exam_attempt')&&!groups.includes('exam_attempt'),'V5.3D2 must not change Exam Mode');

const sampleEligible={practice_eligible:true,active:false};
const sampleExcluded={practice_eligible:false,active:true};
const sampleLegacy={active:true};
const isPracticeEligible=question=>question?.practice_eligible===true||(question?.practice_eligible==null&&question?.active!==false);
expect(isPracticeEligible(sampleEligible)===true,'inactive staged resource must support recommendations');
expect(isPracticeEligible(sampleExcluded)===false,'explicitly ineligible resource must not support recommendations');
expect(isPracticeEligible(sampleLegacy)===true,'legacy rows without the new flag must retain compatibility');

console.log('V5.3D2 Practice recommendation alignment regression passed.');