/* node tools/sync-icon-resources.cjs /path/to/Emberwild-Balance/balance-editor.html */
const fs=require('node:fs'),path=require('node:path'),target=process.argv[2];
if(!target)throw Error('Provide balance-editor.html');
let html=fs.readFileSync(target,'utf8');
for(const [tag,id,file] of [['script','lucide-catalog-v1','js/ui/lucide-catalog.js'],['style','skill-icons-shared-style','css/skill-icons.css'],['script','skill-icon-library-v1','js/ui/skill-icon-library.js']]){
  const text=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  const block=`<${tag} id="${id}">\n${text}\n</${tag}>`;
  const pattern=new RegExp(`<${tag} id="${id}">[\\s\\S]*?<\\/${tag}>`);
  if(pattern.test(html))html=html.replace(pattern,()=>block);
  else html=html.replace('<script id="skill-icon-library-v1">',()=>block+'\n<script id="skill-icon-library-v1">');
}
fs.writeFileSync(target,html);
