// SVG nodes are rebuilt during selection. Track stable text identity instead of DOM dblclick.
export function createTextClickTracker({delay=500,distance=6}={}){
 let previous=null;
 return {reset(){previous=null;},tap(click){if(!click||!click.key||click.moved||click.modified){previous=null;return false;}
 const match=previous&&previous.key===click.key&&click.time>=previous.time&&click.time-previous.time<=delay&&Math.hypot(click.x-previous.x,click.y-previous.y)<=distance;
 previous=match?null:{...click};return Boolean(match);
 }};
}
