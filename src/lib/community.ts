export const communityRoles = [
  "student",
  "trusted",
  "class_leader",
  "admin",
] as const;
export type CommunityRole = (typeof communityRoles)[number];
export const roleLabels: Record<CommunityRole, string> = {
  student: "طالب",
  trusted: "مساهم موثوق",
  class_leader: "مسؤول الدفعة",
  admin: "مدير",
};
export const reviewLabels: Record<string, string> = {
  draft: "نسخة خاصة / رفع غير مكتمل",
  submitted: "في انتظار المراجعة",
  rejected: "محتاج تعديل",
  approved: "منشور",
};
