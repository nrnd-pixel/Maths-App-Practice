const fs = require('fs');
const path = require('path');
const assert = require('assert');

const modulePath = path.join(__dirname,'..','v52b1-large-import-timeout-recovery.js');
const source = fs.readFileSync(modulePath,'utf8');
const api = require(modulePath);

assert.deepStrictEqual(api.parseUploadProgress('Uploading 37/64: example.png'),{current:37,total:64},'Progress parser must read the existing V5.1A2 sequential-upload message');
assert.strictEqual(api.parseUploadProgress('64 images uploaded.'),null,'Completed upload text must not be treated as in-progress');
assert.strictEqual(api.uploadStageState('Uploading 5/64: q5.png').kind,'progress');
assert.strictEqual(api.uploadStageState('64 images uploaded. Ready import rows now use Supabase public image URLs.').kind,'complete');
assert.strictEqual(api.uploadStageState('Upload stopped at q20.png. Storage upload failed.').kind,'failed');
assert.strictEqual(api.uploadStageState('Waiting for image stage').kind,'unknown');
assert(api.timedOutText('Image upload did not finish within two minutes. The preview was kept.'),'Recovery must detect the exact A5 false-timeout condition');

assert(source.includes('never starts, cancels, retries or writes an upload'),'Recovery layer must remain presentation/recovery guidance only');
assert(source.includes('already-uploaded images will not be uploaded twice'),'Teacher guidance must explain safe reuse after the long upload finishes');
assert(source.includes("#v51a5-import-paper"),'Recovery state must clear when the teacher deliberately continues after completion');
assert(!source.includes("cloud.from("),'Recovery layer must not write database rows');
assert(!source.includes('storage.from'),'Recovery layer must not perform Storage operations');
assert(!source.includes('localStorage.setItem'),'Recovery layer must not write local storage');
assert(!source.includes('get_student_questions'),'Recovery layer must not alter student delivery');
assert(!source.includes('grade_practice_response'),'Recovery layer must not alter grading');

console.log('V5.2B.1 large-package timeout recovery checks passed.');