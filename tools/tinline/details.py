"""Extract editable source text and conservative open conductor ends without changing graphics."""
import json,pathlib,re,copy,sys,logging
import ezdxf
from ezdxf.addons.drawing import Frontend,RenderContext,svg,layout,config
from ezdxf.addons.drawing.text import simplified_text_chunks
from ezdxf.math import Vec3
from ezdxf import bbox
logging.disable(logging.CRITICAL)
root=pathlib.Path(__file__).resolve().parents[2];work=pathlib.Path(sys.argv[1]);out=json.loads((root/'cad/template-details.json').read_text()) if (root/'cad/template-details.json').exists() else {};fail=[]
def hashpath(s):
 h=2166136261
 for c in s:h=((h^ord(c))*16777619)&0xffffffff
 return str(h)
class Front(Frontend):
 def __init__(self,*a,**kw):super().__init__(*a,**kw);self.texts=[]
 def draw_entity(self,e,p):
  p=copy.copy(p);p.color='#000000';super().draw_entity(e,p)
 def draw_text_entity(self,e,p):
  value=e.dxf.get('text','');tag=e.dxf.get('tag','') if e.dxftype() in ('ATTRIB','ATTDEF') else ''
  if meta['category']=='Schema' and tag=='BMK' and value not in ['L1','L2','L3','N','PE'] and re.fullmatch(r'\d*[A-Z]+(?:\d+(?:\.\d+)?)?',value):return
  chunks=list(simplified_text_chunks(e,self.text_engine,font_face=self.get_font_face(p)))
  if not chunks:return
  color=f'#{len(self.texts)+1:06x}';self.texts.append((color,chunks));p=copy.copy(p);p.color=color
  super().draw_text_entity(e,p)
for i,meta in enumerate(json.loads((root/'cad/templates/catalog.json').read_text())['items']):
 try:
  if len(sys.argv)>2 and meta['id'] not in sys.argv[2:]:continue
  t=json.loads((root/'cad/templates'/f"{meta['id']}.json").read_text());d=ezdxf.readfile(work/'dxf'/f"{meta['id']}.dxf")
  b0=svg.SVGBackend();Frontend(RenderContext(d),b0,config=config.Configuration(background_policy=config.BackgroundPolicy.WHITE)).draw_layout(d.modelspace(),finalize=True);box=b0.player().bbox()
  b=svg.SVGBackend();f=Front(RenderContext(d),b,config=config.Configuration(background_policy=config.BackgroundPolicy.WHITE,color_policy=config.ColorPolicy.COLOR));f.draw_layout(d.modelspace(),finalize=True)
  xml=b.get_xml_root_element(layout.Page(0,0,units=layout.Units.mm),settings=layout.Settings(output_coordinate_space=10000),render_box=box);m=b.transformation_matrix
  styles={}
  for st in xml.iter('style'):
   for name,body in re.findall(r'\.(\w+)\s*\{([^}]+)\}',st.text or ''):styles[name]=dict(p.strip().split(':',1) for p in body.split(';') if ':' in p)
  bycolor={}
  existing={p['d'] for p in t['paths']}
  for el in xml.iter('path'):
   color=styles.get(el.get('class'),{}).get('fill','').strip()
   if el.get('d') in existing:bycolor.setdefault(color,[]).append(hashpath(el.get('d')))
  texts=[]
  for color,chunks in f.texts:
   hashes=bycolor.get(color,[])
   if not hashes:continue
   runs=[]
   for text,tr,height in chunks:
    o=m.transform(tr.transform(Vec3()));ex=m.transform(tr.transform(Vec3(1,0,0)))-o;ey=m.transform(tr.transform(Vec3(0,-1,0)))-o
    runs.append(dict(text=text,matrix=[ex.x,ex.y,ey.x,ey.y,o.x,o.y],fontSize=height/.73))
   texts.append(dict(key=f't{len(texts)}',text='\n'.join(r['text'] for r in runs),runs=runs,hashes=hashes))
  lines=list(d.modelspace().query('LINE'));ends=[];boxes=[]
  for ins in d.modelspace().query('INSERT'):
   bb=bbox.extents([ins],fast=True)
   if bb.has_data:boxes.append(bb)
  def point(v):
   q=m.transform(v);return dict(x=q.x,y=q.y)
  for line in lines:
   phase=next((x for x in ['L1','L2','L3','N','PE','L'] if line.dxf.layer==f'EL_{x}_Leiter'),None)
   if not phase:continue
   if phase=='L' and any(other.dxf.layer=='EL_L1_Leiter' and abs(other.dxf.end.x-line.dxf.end.x)<.001 and abs(other.dxf.end.y-line.dxf.end.y-10)<.001 for other in lines):phase='L3'
   a,z=line.dxf.start,line.dxf.end
   if abs(a.y-z.y)>.001 or abs(a.x-z.x)<2:continue
   for v in [a,z]:
    if any(bb.extmin.x-.2<=v.x<=bb.extmax.x+.2 and bb.extmin.y-.2<=v.y<=bb.extmax.y+.2 for bb in boxes):continue
    connected=False
    for other in lines:
     if other is line:continue
     c,e=other.dxf.start,other.dxf.end;dx=e.x-c.x;dy=e.y-c.y;den=dx*dx+dy*dy
     u=((v.x-c.x)*dx+(v.y-c.y)*dy)/den if den else 0
     if -.0001<=u<=1.0001 and ((v.x-c.x-u*dx)**2+(v.y-c.y-u*dy)**2)<.0001:connected=True;break
    if not connected:ends.append(dict(key=f'e{len(ends)}',phase=phase,**point(v)))
  if texts or ends:out[meta['id']]={'texts':texts,'ends':ends}
 except Exception as e:fail.append([meta['id'],str(e)])
 if (i+1)%100==0:
  (root/'cad/template-details.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
  print(i+1,len(out),flush=True)
(root/'cad/template-details.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
print('DONE',len(out),'texts',sum(len(v['texts']) for v in out.values()),'ends',sum(len(v['ends']) for v in out.values()),'errors',fail,flush=True)
