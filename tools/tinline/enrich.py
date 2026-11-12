"""Rebuild schema graphics with white masks, live BMK fields and explicit supply anchors.
Only named conductor layers ending at the original upper supply band become bus anchors.
"""
import json,pathlib,re,math,argparse,copy
import ezdxf
from ezdxf.addons.drawing import Frontend,RenderContext,svg,layout,config
from ezdxf.addons.drawing.text import simplified_text_chunks
from ezdxf.math import Vec3
parser=argparse.ArgumentParser();parser.add_argument('workdir',type=pathlib.Path);parser.add_argument('output',type=pathlib.Path);args=parser.parse_args()
cat=json.loads((args.output/'catalog.json').read_text());ns={'s':'http://www.w3.org/2000/svg'}
class Front(Frontend):
 def __init__(self,*a,live=False,**kw):super().__init__(*a,**kw);self.live=live;self.labels=[]
 def draw_entity(self,e,props):
  props=copy.copy(props);props.color='#000000';super().draw_entity(e,props)
 def draw_text_entity(self,e,props):
  value=e.dxf.get('text',''); tag=e.dxf.get('tag','') if e.dxftype() in ('ATTRIB','ATTDEF') else ''
  if self.live and tag=='BMK' and value not in ['L1','L2','L3','N','PE'] and re.fullmatch(r'\d*[A-Z]+(?:\d+(?:\.\d+)?)?',value):
   for text,matrix,height in simplified_text_chunks(e,self.text_engine,font_face=self.get_font_face(props)):
    self.labels.append((value,matrix,height))
   return
  super().draw_text_entity(e,props)
def render(d,live=False,box=None):
 b=svg.SVGBackend();f=Front(RenderContext(d),b,live=live,config=config.Configuration(background_policy=config.BackgroundPolicy.WHITE,color_policy=config.ColorPolicy.COLOR));f.draw_layout(d.modelspace(),finalize=True)
 if box is None:box=b.player().bbox()
 root=b.get_xml_root_element(layout.Page(0,0,units=layout.Units.mm),settings=layout.Settings(output_coordinate_space=10000),render_box=box)
 return root,b,f,box
failed=[];count=0
for meta in cat['items']:
 if meta['category']!='Schema':continue
 try:
  d=ezdxf.readfile(args.workdir/'dxf'/(meta['id']+'.dxf'));_,_,_,box=render(d);root,b,f,_=render(d,True,box)
  styles={}
  # SVGBackend returns unqualified XML elements before serialisation.
  for st in root.iter('style'):
   for name,body in re.findall(r'\.(\w+)\s*\{([^}]+)\}',st.text or ''):styles[name]={k.strip():v.strip() for k,v in (p.split(':',1) for p in body.split(';') if ':' in p)}
  paths=[]
  for el in root.iter('path'):
   st=styles.get(el.get('class'),{});paths.append(dict(d=el.get('d'),fill=st.get('fill','none'),stroke=st.get('stroke','none'),sw=float(st.get('stroke-width','0').replace('none','0'))))
  for path in paths:
   for prop in ['fill','stroke']:
    if path[prop] not in ['none','#ffffff']:path[prop]='#000000'
  if not paths:raise ValueError('No paths')
  transform=b.transformation_matrix
  def point(v):
   p=transform.transform(v);return dict(x=round(p.x,5),y=round(p.y,5))
  anchors={}
  for ins in d.modelspace().query('INSERT'):
   for a in ins.attribs:
    if a.dxf.tag=='BMK':anchors.setdefault(a.dxf.text,ins.dxf.insert)
  labels=[]
  for text,m,h in f.labels:
   symbol_code=re.match(r'([A-Z])\d{4}',pathlib.PurePosixPath(meta['source']).name)
   if re.fullmatch('[A-Z]+',text) and symbol_code:text=symbol_code[1]
   origin=transform.transform(m.transform(Vec3(0,0,0)));ex=transform.transform(m.transform(Vec3(1,0,0)))-origin;ey=transform.transform(m.transform(Vec3(0,-1,0)))-origin
   labels.append(dict(text=text,key=text,letter=re.search('[A-Z]+',text)[0],matrix=[ex.x,ex.y,ey.x,ey.y,origin.x,origin.y],fontSize=h/0.73,anchor=point(anchors.get(text,Vec3()))))
  bus=[];lines=list(d.modelspace().query('LINE'));top=max((max(e.dxf.start.y,e.dxf.end.y) for e in lines),default=0)
  for phase in ['L1','L2','L3','N']:
   candidates=[e for e in lines if e.dxf.layer==f'EL_{phase}_Leiter' and abs(e.dxf.start.x-e.dxf.end.x)<1e-5]
   if not candidates:continue
   high=max(max(e.dxf.start.y,e.dxf.end.y) for e in candidates)
   # Macros use supply levels 285/280/275/270; no inference for ordinary symbol geometry.
   if abs(high-{'L1':285,'L2':280,'L3':275,'N':270}[phase])>.01:continue
   for e in candidates:
    v=max([e.dxf.start,e.dxf.end],key=lambda p:p.y)
    if abs(v.y-high)<1e-5 and not any(a['phase']==phase and abs(a['sourceX']-v.x)<1e-5 for a in bus):bus.append({**point(v),'phase':phase,'sourceX':v.x})
  obj=json.loads((args.output/(meta['id']+'.json')).read_text());obj.update(paths=paths,labels=labels,ports=[{k:v for k,v in a.items() if k!='sourceX'} for a in bus],semanticVersion=2)
  obj['width']=float(root.get('width').replace('mm',''));obj['height']=float(root.get('height').replace('mm',''));obj['viewWidth'],obj['viewHeight']=[float(x) for x in root.get('viewBox').split()][2:]
  (args.output/(meta['id']+'.json')).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')))
  meta.update(width=obj['width'],height=obj['height'],liveLabels=len(labels),supplyPorts=len(bus));count+=1
 except Exception as e:failed.append({'id':meta['id'],'error':str(e)})
 if count%50==0:print('Enriched',count,flush=True)
cat['semanticVersion']=2;(args.output/'catalog.json').write_text(json.dumps(cat,ensure_ascii=False,separators=(',',':')))
print('DONE',count,'FAILED',failed,flush=True)
if failed:raise SystemExit(1)
