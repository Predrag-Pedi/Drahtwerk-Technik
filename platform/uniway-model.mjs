// Transcribed from the supplied Hager Uniway table, printed page 27.
// Preserve measured table values; do not derive lengths from an 18 mm formula.
export const uniwaySource={
 title:'Hager Uniway – Systemlängen',page:27,
 url:'https://assets.sc.hager.com/de-ch/-/media/project/hagerdeep/switzerland/hager/b2b/pdf/hager_uniway_broschuere_de_24_web.pdf?la=de-ch#page=27',
};
// [18 mm units, system incl. end piece (mm), copper rail (mm), 10-unit bases, 6-unit bases]
export const uniwayRows=Object.freeze([
 [6, 147, 108, 0, 1],
 [10, 219, 180, 1, 0],
 [12, 256, 217, 0, 2],
 [16, 328, 289, 1, 1],
 [18, 364, 325, 0, 3],
 [20, 400, 361, 2, 0],
 [22, 436, 397, 1, 2],
 [24, 473, 434, 0, 4],
 [26, 508, 469, 2, 1],
 [28, 545, 506, 1, 3],
 [30, 580, 541, 3, 0],
 [32, 617, 578, 2, 2],
 [34, 653, 614, 1, 4],
 [36, 689, 650, 3, 1],
 [38, 725, 686, 2, 3],
 [40, 761, 722, 4, 0],
 [42, 797, 758, 3, 2],
 [44, 824, 794, 2, 4],
 [46, 869, 830, 4, 1],
 [48, 906, 867, 3, 3],
 [50, 941, 902, 5, 0],
 [52, 978, 939, 4, 2],
 [54, 1014, 975, 3, 4],
 [56, 1050, 1011, 5, 1],
 [58, 1086, 1047, 4, 3],
 [60, 1122, 1083, 6, 0],
 [62, 1158, 1119, 5, 2],
 [64, 1194, 1155, 4, 4],
 [66, 1231, 1192, 6, 1],
 [68, 1267, 1228, 5, 3],
 [70, 1303, 1264, 7, 0],
 [72, 1339, 1300, 6, 2],
 [74, 1357, 1336, 5, 4],
 [76, 1411, 1372, 7, 1],
 [78, 1447, 1408, 6, 3],
 [80, 1484, 1445, 8, 0],
 [82, 1520, 1481, 7, 2],
 [84, 1556, 1517, 6, 4],
 [86, 1592, 1553, 8, 1],
 [88, 1628, 1589, 7, 3],
 [90, 1665, 1626, 9, 0],
 [92, 1701, 1662, 8, 2],
 [94, 1737, 1698, 7, 4],
 [96, 1773, 1734, 9, 1],
 [98, 1809, 1770, 8, 3],
 [100, 1846, 1807, 10, 0],
 [102, 1882, 1843, 9, 2],
 [104, 1918, 1879, 8, 4],
 [106, 1954, 1915, 10, 1],
 [108, 1991, 1952, 9, 3],
 [110, 2027, 1988, 11, 0],
 [112, 2063, 2024, 10, 2],
 [114, 2099, 2060, 9, 4],
 [116, 2135, 2096, 11, 1],
 [118, 2171, 2132, 10, 3],
 [120, 2207, 2168, 12, 0],
].map(([units,systemLength,copperLength,bases10,bases6])=>Object.freeze({
 units,systemLength,copperLength,bases10,bases6,
 // These two source rows differ from the usual 39 mm end-piece allowance.
 note:[44,74].includes(units)?'Abweichende Längendifferenz in der Vorlage. Tabellenwerte unverändert übernommen; Systemlänge vor dem Zuschnitt mit Hager klären.':'',
})));
export function selectUniway(value){
 if(value===null||value===undefined||String(value).trim()==='')return {status:'empty',row:null};
 const units=Number(value);
 if(!Number.isFinite(units)||units<=0||!Number.isInteger(units*2))return {status:'invalid',row:null};
 const row=uniwayRows.find(row=>row.units>=units);
 return row?{status:'match',row,requested:units,reserve:row.units-units}:{status:'unavailable',row:null};
}
