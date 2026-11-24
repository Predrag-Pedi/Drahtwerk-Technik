import {randomUUID} from 'node:crypto';
import {audit,object} from './db.mjs';
import {fail,text} from './security.mjs';
import {licenseActive,permissionKeys,swissDay} from '../platform/model.mjs';

const MINUTE=60000,ONLINE=45000,REQUEST_LIFETIME=10*MINUTE;
const liveStatuses=['pending','approved'];
const fullScope=mode=>Object.fromEntries(permissionKeys.map(k=>[k,mode]));

// A grant belongs to one developer login, one company and one approving person.
// Selecting a company in administration never creates a grant.
export function supportService({db,clock}){
 const row=id=>db.prepare('SELECT * FROM support_requests WHERE id=?').get(id);
 const user=id=>db.prepare('SELECT * FROM users WHERE id=?').get(id);
 const enabled=u=>Boolean(u?.enabled&&!u.deleted_at&&!u.must_change);
 const sessionAlive=s=>Boolean(s&&s.expires>clock()&&s.last_seen>clock()-30*MINUTE);
 function event(r,actor,action,details={}){audit(db,actor,r.company_id,'support.'+action,JSON.stringify({requestId:r.id,...details}));}
 function finish(r,status,actor,reason){
  if(!liveStatuses.includes(r.status))return r;
  const changed=db.prepare("UPDATE support_requests SET status=?,ended_at=?,end_reason=? WHERE id=? AND status IN ('pending','approved')").run(status,clock(),reason,r.id);
  if(changed.changes){db.prepare('DELETE FROM support_context WHERE request_id=?').run(r.id);event(r,actor,status,{reason});}
  return row(r.id);
 }
 function settle(r){
  if(!r||!liveStatuses.includes(r.status))return r;
  const owner=user(r.developer_id),login=db.prepare('SELECT * FROM sessions WHERE hash=? AND user_id=?').get(r.session_hash,r.developer_id);
  if(!enabled(owner)||owner.role!=='developer'||!sessionAlive(login))return finish(r,'ended',null,'developer_session_ended');
  const company=object(db,'companies',r.company_id);
  if(!company||company.internalWorkspace||!licenseActive(company,swissDay(new Date(clock()))))return finish(r,'revoked',null,'company_unavailable');
  if((r.status==='pending'?r.request_expires:r.expires_at)<=clock())return finish(r,'expired',null,'time_limit');
  if(r.status==='approved'){
   const approver=user(r.approved_by);
   if(!enabled(approver)||approver.role==='developer'||approver.company_id!==r.company_id)return finish(r,'revoked',null,'approver_account_changed');
  }
  return r;
 }
 function context(login,actor){
  if(actor.role!=='developer')return null;
  const entry=db.prepare('SELECT request_id FROM support_context WHERE session_hash=?').get(login.hash);
  const r=entry&&settle(row(entry.request_id));
  if(!r||r.status!=='approved'||r.session_hash!==login.hash||r.developer_id!==actor.id)return null;
  return {request:r,company:object(db,'companies',r.company_id),permissions:JSON.parse(r.permissions)};
 }
 function describe(r,viewer){
  const recipients=db.prepare('SELECT u.id,u.name,u.role FROM support_recipients a JOIN users u ON u.id=a.user_id WHERE a.request_id=?').all(r.id);
  const permissions=r.permissions?JSON.parse(r.permissions):fullScope(r.mode);
  return {id:r.id,companyId:r.company_id,companyName:object(db,'companies',r.company_id)?.name||'Betrieb',developerName:user(r.developer_id)?.name||'Entwickler',reason:r.reason,mode:r.mode,durationMinutes:r.duration_minutes,status:r.status,createdAt:r.created_at,requestExpiresAt:r.request_expires,approvedAt:r.approved_at,expiresAt:r.expires_at,approvedByName:r.approved_by?user(r.approved_by)?.name:null,permissions,recipients,canRevoke:r.status==='approved'&&(viewer.id===r.approved_by||viewer.role==='admin'),endReason:r.end_reason};
 }
 function online(company){
  return db.prepare(`SELECT DISTINCT u.* FROM users u JOIN sessions s ON s.user_id=u.id JOIN support_presence p ON p.session_hash=s.hash
   WHERE u.company_id=? AND u.role IN ('admin','member') AND u.enabled=1 AND u.deleted_at IS NULL AND u.must_change=0
   AND s.expires>? AND s.last_seen>? AND p.last_seen>? ORDER BY u.name`).all(company.id,clock(),clock()-30*MINUTE,clock()-ONLINE);
 }
 function closeSession(hash,actor,reason='developer_signed_out'){for(const r of db.prepare("SELECT * FROM support_requests WHERE session_hash=? AND status IN ('pending','approved')").all(hash))finish(r,r.status==='pending'?'cancelled':'ended',actor,reason);}
 async function handle({req,res,path,method,s,body,json,freshSession}){
  if(!path.startsWith('/api/support/'))return false;
  if(req.headers['x-user-id']!==s.user.id)fail(409,'Anmeldung wurde gewechselt. Bitte neu laden.');
  if(path==='/api/support/state'&&method==='POST'){
   const b=await body(req,8192),current=freshSession(req,s);
   if(b.visible===true)db.prepare('INSERT INTO support_presence VALUES (?,?) ON CONFLICT(session_hash) DO UPDATE SET last_seen=excluded.last_seen').run(current.hash,clock());
   else db.prepare('DELETE FROM support_presence WHERE session_hash=?').run(current.hash);
   if(current.user.role==='developer'){
    const outgoing=db.prepare('SELECT * FROM support_requests WHERE session_hash=? AND developer_id=? ORDER BY created_at DESC LIMIT 10').all(current.hash,current.user.id).map(settle).map(r=>describe(r,current.user));
    const active=context(current,current.user);
    json(res,{serverTime:clock(),outgoing,incoming:[],active:[],context:{companyId:active?.company.id||'developer-'+current.user.id,supportId:active?.request.id||null}});
   }else{
    const incoming=db.prepare("SELECT r.* FROM support_requests r JOIN support_recipients a ON a.request_id=r.id WHERE a.user_id=? AND r.company_id=? AND r.status='pending' ORDER BY r.created_at").all(current.user.id,current.company?.id||'').map(settle).filter(r=>r.status==='pending').map(r=>describe(r,current.user));
    const active=db.prepare("SELECT * FROM support_requests WHERE company_id=? AND status='approved' AND (approved_by=? OR ?='admin') ORDER BY approved_at DESC").all(current.company?.id||'',current.user.id,current.user.role).map(settle).filter(r=>r.status==='approved').map(r=>describe(r,current.user));
    json(res,{serverTime:clock(),outgoing:[],incoming,active,context:{companyId:current.company?.id||null,supportId:null}});
   }
   return true;
  }
  if(path==='/api/support/recipients'&&method==='GET'){
   if(s.user.role!=='developer'||!s.managementCompany)fail(403,'Zuerst einen Betrieb öffnen.');
   json(res,online(s.managementCompany).map(u=>({id:u.id,name:u.name,role:u.role})));return true;
  }
  if(path==='/api/support/requests'&&method==='POST'){
   const b=await body(req,8192),current=freshSession(req,s),company=current.managementCompany;
   if(current.user.role!=='developer'||!company)fail(403,'Zuerst einen Betrieb öffnen.');
   if(b.companyId!==company.id)fail(409,'Der ausgewählte Betrieb wurde gewechselt. Bitte neu laden.');
   if(company.internalWorkspace||!licenseActive(company,swissDay(new Date(clock()))))fail(403,'Der Betrieb hat keine aktive Lizenz.');
   const reason=text(b.reason,500);if(reason.length<5)fail(400,'Bitte den Grund für den Supportzugriff angeben (mindestens 5 Zeichen).');
   if(!['read','write'].includes(b.mode)||![15,30,60].includes(b.durationMinutes))fail(400,'Zugriffsart und Dauer wählen.');
   if(!Array.isArray(b.recipientIds)||!b.recipientIds.length||b.recipientIds.length>8||b.recipientIds.some(id=>typeof id!=='string'))fail(400,'Eine bis acht angemeldete Personen auswählen.');
   const eligible=online(company),recipients=[...new Set(b.recipientIds)].map(id=>eligible.find(u=>u.id===id));
   if(recipients.some(u=>!u))fail(409,'Eine ausgewählte Person ist nicht mehr online oder nicht mehr zur Freigabe berechtigt. Bitte die Liste aktualisieren.');
   const existing=db.prepare("SELECT * FROM support_requests WHERE session_hash=? AND status IN ('pending','approved')").all(current.hash).map(settle);
   if(existing.some(r=>liveStatuses.includes(r.status)))fail(409,'Zuerst die laufende Anfrage oder den Supportzugriff beenden.');
   if(db.prepare('SELECT COUNT(*) n FROM support_requests WHERE developer_id=? AND created_at>?').get(current.user.id,clock()-10*MINUTE).n>=10)fail(429,'Zu viele Supportanfragen. Bitte einige Minuten warten.');
   const id=randomUUID();db.exec('BEGIN IMMEDIATE');
   try{
    db.prepare(`INSERT INTO support_requests(id,company_id,developer_id,session_hash,reason,mode,duration_minutes,status,created_at,request_expires) VALUES (?,?,?,?,?,?,?,'pending',?,?)`).run(id,company.id,current.user.id,current.hash,reason,b.mode,b.durationMinutes,clock(),clock()+REQUEST_LIFETIME);
    for(const u of recipients)db.prepare('INSERT INTO support_recipients VALUES (?,?)').run(id,u.id);
    event(row(id),current.user.id,'requested',{reason,mode:b.mode,durationMinutes:b.durationMinutes,recipientIds:recipients.map(u=>u.id)});db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
   json(res,describe(row(id),current.user),201);return true;
  }
  const match=path.match(/^\/api\/support\/requests\/([\w-]+)\/(approve|deny|enter|stop)$/);
  if(!match||method!=='POST')fail(404,'Supportaktion nicht gefunden.');
  await body(req,8192);const current=freshSession(req,s),r=settle(row(match[1]));if(!r)fail(404,'Supportanfrage nicht gefunden.');
  const action=match[2],owner=current.user.role==='developer'&&r.developer_id===current.user.id&&r.session_hash===current.hash;
  const colleague=current.user.role!=='developer'&&current.company?.id===r.company_id;
  const nomination=colleague&&db.prepare('SELECT user_id FROM support_recipients WHERE request_id=? AND user_id=?').get(r.id,current.user.id);
  if(action==='approve'||action==='deny'){
   if(!nomination)fail(403,'Diese Anfrage wurde nicht an dich gerichtet.');
   if(r.status!=='pending')fail(409,'Diese Anfrage wurde bereits entschieden, beendet oder ist abgelaufen.');
   if(action==='deny'){json(res,describe(finish(r,'denied',current.user.id,'recipient_declined'),current.user));return true;}
   const permissions=fullScope(r.mode);
   db.prepare("UPDATE support_requests SET status='approved',approved_by=?,approved_at=?,expires_at=?,permissions=? WHERE id=? AND status='pending'").run(current.user.id,clock(),clock()+r.duration_minutes*MINUTE,JSON.stringify(permissions),r.id);
   event(r,current.user.id,'approved',{permissions,expiresAt:clock()+r.duration_minutes*MINUTE});json(res,describe(row(r.id),current.user));return true;
  }
  if(action==='enter'){
   if(!owner)fail(403,'Die Freigabe gehört zu einer anderen Entwicklersitzung.');
   if(r.status!=='approved')fail(403,'Für diesen Betrieb liegt keine gültige Supportfreigabe vor.');
   const previous=db.prepare('SELECT request_id FROM support_context WHERE session_hash=?').get(current.hash);
   if(previous&&previous.request_id!==r.id)fail(409,'Zuerst den laufenden Supportzugriff beenden.');
   db.prepare('INSERT INTO support_context VALUES (?,?) ON CONFLICT(session_hash) DO UPDATE SET request_id=excluded.request_id').run(current.hash,r.id);
   if(!previous)event(r,current.user.id,'entered');json(res,{ok:true});return true;
  }
  if(!owner&&!(colleague&&(current.user.role==='admin'||current.user.id===r.approved_by)))fail(403,'Du kannst diesen Zugriff nicht beenden.');
  if(!liveStatuses.includes(r.status))fail(409,'Dieser Zugriff ist bereits beendet.');
  json(res,describe(finish(r,owner?(r.status==='pending'?'cancelled':'ended'):'revoked',current.user.id,owner?'developer_stopped':'company_stopped'),current.user));return true;
 }
 return {context,handle,closeSession,describe,recordAccess:(s,path,method)=>{if(s.support)event(s.support.request,s.user.id,method==='GET'?'read':'write',{path,method});}};
}
