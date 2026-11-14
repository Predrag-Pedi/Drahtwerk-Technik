"""Supplement original conductor endpoints; preserve existing reference keys."""
import json,pathlib,sys,logging
import ezdxf
from ezdxf import bbox
from ezdxf.addons.drawing import Frontend,RenderContext,svg,layout,config
logging.disable(logging.CRITICAL)
root=pathlib.Path(__file__).resolve().parents[2];work=pathlib.Path(sys.argv[1]);path=root/'cad/template-details.json';details=json.loads(path.read_text());added=0;audited=0
for meta in json.loads((root/'cad/templates/catalog.json').read_text())['items']:
 if meta['category']!='Schema':continue
 t=json.loads((root/'cad/templates'/f"{meta['id']}.json").read_text());d=ezdxf.readfile(work/'dxf'/f"{meta['id']}.dxf");b=svg.SVGBackend();Frontend(RenderContext(d),b,config=config.Configuration(background_policy=config.BackgroundPolicy.WHITE)).draw_layout(d.modelspace(),finalize=True);b.get_xml_root_element(layout.Page(0,0,units=layout.Units.mm),settings=layout.Settings(output_coordinate_space=10000));m=b.transformation_matrix
 lines=list(d.modelspace().query('LINE'));entry=details.setdefault(meta['id'],{'texts':[],'ends':[]});entry['ends']=[e for e in entry['ends'] if not e['key'].startswith('auto-')];ends=entry['ends'];audited+=1
 boxes=[bbox.extents([ins],fast=True) for ins in d.modelspace().query('INSERT')]
 for line in lines:
  phase=next((p for p in ['L1','L2','L3','N','PE'] if line.dxf.layer==f'EL_{p}_Leiter'),None)
  if not phase or abs(line.dxf.start.y-line.dxf.end.y)>.001 or abs(line.dxf.start.x-line.dxf.end.x)<2:continue
  for v in [line.dxf.start,line.dxf.end]:
   long_bus=abs(line.dxf.start.x-line.dxf.end.x)>=200
   if not long_bus and any(bb.has_data and bb.extmin.x-.2<=v.x<=bb.extmax.x+.2 and bb.extmin.y-.2<=v.y<=bb.extmax.y+.2 for bb in boxes):continue
   if any(other is not line and (lambda a,z: (lambda dx,dy,den: (lambda u: -.0001<=u<=1.0001 and (v.x-a.x-u*dx)**2+(v.y-a.y-u*dy)**2<.0001)(((v.x-a.x)*dx+(v.y-a.y)*dy)/den if den else 0))(z.x-a.x,z.y-a.y,(z.x-a.x)**2+(z.y-a.y)**2))(other.dxf.start,other.dxf.end) for other in lines):continue
   q=m.transform(v)
   if any((e['x']-q.x)**2+(e['y']-q.y)**2<4 for e in ends):continue
   key='auto-'+str(len(ends));ends.append(dict(key=key,phase=phase,x=q.x,y=q.y));added+=1
extra={k:[e for e in v['ends'] if e['key'].startswith('auto-')] for k,v in details.items()};extra={k:v for k,v in extra.items() if v}
(root/'cad/template-ends.mjs').write_text('// Audited from original DXF conductor layers; existing endpoint keys remain stable.\nexport default '+json.dumps(extra,separators=(',',':'))+';\n')
print(f'Audited {audited} schema templates, added {added} conductor endpoints.')
