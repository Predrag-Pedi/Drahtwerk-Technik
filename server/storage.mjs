export const companyStorageLimit = 500 * 1024 * 1024;
export function companyStorageBytes(db, companyId) {
  return db.prepare(`SELECT
    (SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) FROM records WHERE company_id=?) +
    (SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) FROM workshop_templates WHERE company_id=?) +
    (SELECT COALESCE(SUM(length(bytes)),0) FROM workshop_files WHERE company_id=?) + (SELECT COALESCE(SUM(bytes),0) FROM catalog_heads WHERE company_id=?) AS bytes
  `).get(companyId, companyId, companyId, companyId).bytes;
}
