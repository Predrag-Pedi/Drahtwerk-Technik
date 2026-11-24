import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {initialPlans,emptyProfile} from '../platform/model.mjs';
export function openDatabase(path){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path,{timeout:5000});if(path!==':memory:')chmodSync(path,0o600);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS plans(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS companies(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,company_id TEXT REFERENCES companies(id),email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('developer','admin','member')),permissions TEXT NOT NULL,password TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,must_change INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),company_id TEXT REFERENCES companies(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL,last_seen INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS records(company_id TEXT NOT NULL REFERENCES companies(id),area TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_by TEXT NOT NULL REFERENCES users(id),updated_at TEXT NOT NULL,PRIMARY KEY(company_id,area,id));
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT NOT NULL,actor TEXT,company_id TEXT,action TEXT NOT NULL,target TEXT);
 CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS workshop_templates(company_id TEXT NOT NULL REFERENCES companies(id),tool TEXT NOT NULL,data TEXT,revision INTEGER NOT NULL,updated_by TEXT NOT NULL REFERENCES users(id),updated_at TEXT NOT NULL,PRIMARY KEY(company_id,tool));
 CREATE TABLE IF NOT EXISTS workshop_files(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),tool TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,bytes BLOB NOT NULL,uploaded_by TEXT NOT NULL REFERENCES users(id),uploaded_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS catalog_imports(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),user_id TEXT NOT NULL REFERENCES users(id),revision INTEGER NOT NULL,count INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS catalog_chunks(upload_id TEXT NOT NULL REFERENCES catalog_imports(id) ON DELETE CASCADE,seq INTEGER NOT NULL,data TEXT NOT NULL,bytes INTEGER NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(upload_id,seq));
 CREATE TABLE IF NOT EXISTS catalog_heads(company_id TEXT PRIMARY KEY REFERENCES companies(id),upload_id TEXT NOT NULL REFERENCES catalog_imports(id),revision INTEGER NOT NULL,count INTEGER NOT NULL,chunks INTEGER NOT NULL,bytes INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS workshop_files_company ON workshop_files(company_id,tool);
 CREATE TABLE IF NOT EXISTS support_requests(id TEXT PRIMARY KEY,company_id TEXT NOT NULL REFERENCES companies(id),developer_id TEXT NOT NULL REFERENCES users(id),session_hash TEXT NOT NULL,reason TEXT NOT NULL,mode TEXT NOT NULL CHECK(mode IN ('read','write')),duration_minutes INTEGER NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL,request_expires INTEGER NOT NULL,approved_by TEXT REFERENCES users(id),approved_at INTEGER,expires_at INTEGER,permissions TEXT,ended_at INTEGER,end_reason TEXT);
 CREATE TABLE IF NOT EXISTS support_recipients(request_id TEXT NOT NULL REFERENCES support_requests(id),user_id TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(request_id,user_id));
 CREATE TABLE IF NOT EXISTS support_context(session_hash TEXT PRIMARY KEY REFERENCES sessions(hash) ON DELETE CASCADE,request_id TEXT NOT NULL REFERENCES support_requests(id));
 CREATE TABLE IF NOT EXISTS support_presence(session_hash TEXT PRIMARY KEY REFERENCES sessions(hash) ON DELETE CASCADE,last_seen INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS support_requests_session ON support_requests(session_hash,status);
 CREATE INDEX IF NOT EXISTS support_requests_company ON support_requests(company_id,status);
 CREATE INDEX IF NOT EXISTS support_recipients_user ON support_recipients(user_id,request_id);
 `);
 // Keep author references when removing an account; existing installations migrate on startup.
 if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='deleted_at'))db.exec('ALTER TABLE users ADD COLUMN deleted_at TEXT');

 for(const p of initialPlans)db.prepare('INSERT OR IGNORE INTO plans VALUES (?,?)').run(p.id,JSON.stringify(p));
 // One-time addition to built-in packages. Existing users still need explicit report rights.
 if(db.prepare('PRAGMA user_version').get().user_version<4){
  for(const id of ['basis','planung','komplett']){
   const row=db.prepare('SELECT data FROM plans WHERE id=?').get(id);
   if(row){const plan=JSON.parse(row.data);if(!plan.modules.includes('reports')){plan.modules.push('reports');db.prepare('UPDATE plans SET data=? WHERE id=?').run(JSON.stringify(plan),id);}}
  }
  db.exec('PRAGMA user_version=4');
 }
 return db;
}
export const rows=(db,table)=>db.prepare(`SELECT * FROM ${table}`).all(); // table is internal, never request data
export const object=(db,table,id)=>{const r=db.prepare(`SELECT data FROM ${table} WHERE id=?`).get(id);return r?JSON.parse(r.data):null;};
export const saveObject=(db,table,value)=>db.prepare(`INSERT INTO ${table}(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(value.id,JSON.stringify(value));
export const publicUser=u=>u&&({id:u.id,companyId:u.company_id,login:u.email,username:u.email.includes('@')?'':u.email,email:u.email.includes('@')?u.email:'',name:u.name,role:u.role,permissions:JSON.parse(u.permissions),enabled:Boolean(u.enabled),mustChangePassword:Boolean(u.must_change),createdAt:u.created_at});
export function audit(db,actor,company,action,target=''){db.prepare('INSERT INTO audit(at,actor,company_id,action,target) VALUES (?,?,?,?,?)').run(new Date().toISOString(),actor,company,action,target);}

// A separate tenant lets a developer use every tool immediately without choosing a customer.
export function developerWorkspace(db,user){
 const id='developer-'+user.id;
 let company=object(db,'companies',id);
 if(!company){company={id,name:'Entwickler-Arbeitsplatz',internalWorkspace:true,ownerId:user.id,planId:'komplett',startsOn:'2000-01-01',endsOn:'9999-12-31',enabled:true,seats:1,profile:emptyProfile()};saveObject(db,'companies',company);}
 return company;
}
