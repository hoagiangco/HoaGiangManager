SELECT u.*, 
ARRAY_AGG(r."Name") as roles
FROM "AspNetUsers" u
LEFT JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId"
LEFT JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
WHERE u."NormalizedEmail" = 'NTHIEN@GMAIL.COM'
GROUP BY u."Id";
