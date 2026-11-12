"""Extract original coordinate frames and named conductor lines for macro alignment."""
import pathlib,json,sys
import ezdxf
from ezdxf.addons.drawing import Frontend,RenderContext,svg,layout,config
from ezdxf.math import Vec3
root=pathlib.Path(__file__).resolve().parents[2]
result={}
for meta in json.loads((root/'cad/templates/catalog.json').read_text())['items']:
 if not meta.get('supplyPorts') and meta['id'] not in ['tl-0008','tl-0009','tl-0010']:continue
 d=ezdxf.readfile(pathlib.Path(sys.argv[1])/'dxf'/f"{meta['id']}.dxf")
 b=svg.SVGBackend();Frontend(RenderContext(d),b,config=config.Configuration(background_policy=config.BackgroundPolicy.WHITE,color_policy=config.ColorPolicy.COLOR)).draw_layout(d.modelspace(),finalize=True)
 b.get_xml_root_element(layout.Page(0,0,units=layout.Units.mm),settings=layout.Settings(output_coordinate_space=10000),render_box=b.player().bbox())
 m=b.transformation_matrix;o=m.transform(Vec3());unit=(m.transform(Vec3(1,0,0))-o).x
 lines=[]
 for e in d.modelspace().query('LINE'):
  for phase in ['L1','L2','L3','N']:
   if e.dxf.layer==f'EL_{phase}_Leiter':lines.append(dict(x1=e.dxf.start.x,y1=e.dxf.start.y,x2=e.dxf.end.x,y2=e.dxf.end.y,phase=phase))
 inputs=[]
 if not meta.get('supplyPorts'):
  for l in lines:
   if abs(l['y1']-l['y2'])<1e-5 and abs(l['x1']-l['x2'])>1:
    x=min(l['x1'],l['x2']);y=l['y1']
    if not any(v['phase']==l['phase'] and abs(v['x1']-x)<1e-5 and abs(v['x2']-x)<1e-5 and min(v['y1'],v['y2'])<=y<=max(v['y1'],v['y2']) for v in lines):inputs.append(dict(x=x,y=y,phase=l['phase']))
 t=json.loads((root/'cad/templates'/f"{meta['id']}.json").read_text())
 result[meta['id']]=dict(x=o.x,y=o.y,unit=unit,viewWidth=t['viewWidth'],viewHeight=t['viewHeight'],lines=lines,inputs=inputs)
(root/'cad/macro-frames.mjs').write_text('/* Generated from original TinLine DXF coordinates by tools/tinline/alignment.py. */\nexport default '+json.dumps(result,separators=(',',':'))+';\n')
print('Frames:',len(result))
