/* node tools/sync-team-schema.cjs /path/to/Emberwild-Balance/balance-editor.html */
const fs=require('node:fs'),path=require('node:path'),target=process.argv[2];
if(!target)throw Error('Provide balance-editor.html');
const model=fs.readFileSync(path.join(__dirname,'../js/character/team-model.js'),'utf8');
const html=fs.readFileSync(target,'utf8'),block=`<script id="team-model-v1">\n${model}\n</script>`;
const pattern=/<script id="team-model-v1">[\s\S]*?<\/script>/;
if(!pattern.test(html))throw Error('Missing team-model-v1 embed');
fs.writeFileSync(target,html.replace(pattern,()=>block));
