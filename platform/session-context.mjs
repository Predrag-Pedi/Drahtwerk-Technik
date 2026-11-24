// Only administrative profile/user routes use the selected managed company.
// Records, catalogues and workshop files always belong to the tool workspace.
export const managementRequest=path=>path==='/company'||path==='/company/users'||path.startsWith('/company/users/');
export const managedCompany=account=>account?.user.role==='developer'?account.managementCompany||null:account?.company||null;
