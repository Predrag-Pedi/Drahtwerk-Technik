from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
names=json.loads((root/'ew-ordner.json').read_text(encoding='utf-8'))
folders=[]
for name in names:
    folder=root/'EW'/name
    files=sorted((p.relative_to(root).as_posix() for p in folder.rglob('*') if p.is_file() and p.suffix.lower()=='.pdf'),key=str.casefold) if folder.exists() else []
    folders.append({'name':name,'files':files})
(root/'ew-dateien.json').write_text(json.dumps({'folders':folders},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PDFs gefunden:',sum(len(f['files']) for f in folders))
