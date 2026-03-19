export function usePermissions() {
  if (typeof window === "undefined") return { isAdmin: false, filialId: null };

  const savedUser = JSON.parse(localStorage.getItem("@payvex:user") || "{}");

  return {
    isAdmin: savedUser.role === "ADMIN",
    userFilialId: savedUser.filialId, // Se for null, ele é Admin Global
    companyId: savedUser.companyId,
  };
}
