import json,pathlib,re,xml.etree.ElementTree as ET,collections,logging
import argparse
import ezdxf
from ezdxf.addons.drawing import Frontend,RenderContext,svg,layout,config
logging.disable(logging.CRITICAL)
parser=argparse.ArgumentParser();parser.add_argument('workdir',type=pathlib.Path);parser.add_argument('output',type=pathlib.Path);args=parser.parse_args()
ROOT=args.output;ROOT.mkdir(parents=True,exist_ok=True);manifest=json.loads((args.workdir/'manifest.json').read_text());catalog=[];failed=[];warnings=[]
class Front(Frontend):
 def log_message(self,msg):
  if 'unsupported' in msg.lower(): warnings.append(msg)
for i,item in enumerate(manifest):
 warnings=[]
 try:
  d=ezdxf.readfile(str(args.workdir/'dxf'/(item['id']+'.dxf')));b=svg.SVGBackend();Front(RenderContext(d),b,config=config.Configuration(background_policy=config.BackgroundPolicy.WHITE,color_policy=config.ColorPolicy.BLACK)).draw_layout(d.modelspace(),finalize=True)
  root=ET.fromstring(b.get_string(layout.Page(0,0,units=layout.Units.mm),settings=layout.Settings(output_coordinate_space=10000)));ns={'s':'http://www.w3.org/2000/svg'};styles={}
  for st in root.findall('.//s:style',ns):
   m=re.match(r'\.(\w+)\s*{(.*)}',st.text);styles[m[1]]={k.strip():v.strip() for k,v in (p.split(':',1) for p in m[2].split(';') if ':' in p)}
  paths=[]
  for e in root.findall('.//s:path',ns):
   st=styles.get(e.get('class'),{});paths.append(dict(d=e.get('d'),fill=st.get('fill','none'),stroke=st.get('stroke','none'),sw=float(st.get('stroke-width','0').replace('none','0'))))
  if not paths:raise ValueError('Keine darstellbare Geometrie')
  if warnings:raise ValueError('; '.join(sorted(set(warnings)))[:300])
  w=float(root.get('width').replace('mm',''));h=float(root.get('height').replace('mm',''));vb=[float(x) for x in root.get('viewBox').split()];
  if not(0<w<10000 and 0<h<10000):raise ValueError('Abmessungen ausserhalb des Bereichs')
  obj={**item,'width':w,'height':h,'viewWidth':vb[2],'viewHeight':vb[3],'paths':paths};(ROOT/(item['id']+'.json')).write_text(json.dumps(obj,ensure_ascii=False,separators=(',',':')));catalog.append({**item,'width':w,'height':h})
 except Exception as e:failed.append({**item,'reason':str(e)[:300]})
 if (i+1)%100==0:print('Rendered',i+1,'ok',len(catalog),'failed',len(failed),flush=True)
(ROOT/'catalog.json').write_text(json.dumps({'version':1,'items':catalog,'excluded':failed},ensure_ascii=False,separators=(',',':')))
print('DONE',len(catalog),len(failed),sum(p.stat().st_size for p in ROOT.glob('*.json')),flush=True)
