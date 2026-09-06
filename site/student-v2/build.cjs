// No dependencies. Keep the committed HTML usable directly via file://.
const fs=require('node:fs');
const path=require('node:path');
const dir=__dirname;
const shell=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'styles.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const output=shell.replace(/<!-- INLINE_STYLE -->[\s\S]*?<!-- END_STYLE -->|<!-- INLINE_STYLE -->/,()=>`<!-- INLINE_STYLE --><style>${css}</style><!-- END_STYLE -->`).replace(/<!-- INLINE_SCRIPT -->[\s\S]*?<!-- END_SCRIPT -->|<!-- INLINE_SCRIPT -->/,()=>`<!-- INLINE_SCRIPT --><script>${js}</script><!-- END_SCRIPT -->`);
fs.writeFileSync(path.join(dir,'index.html'),output);
console.log('Built self-contained student-v2/index.html');
