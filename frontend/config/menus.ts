// Role-based menu configurations for City Hall Monitoring System

export type MenuItem = {
  name: string;
  href: string;
  icon: string;
  description: string;
  roles: ("Admin" | "Encoder" | "Viewer")[];
};

// Admin Menu - Full system access
export const adminMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    description: "View system overview and statistics",
    roles: ["Admin"],
  },
  {
    name: "Documents",
    href: "/documents",
    icon: "📄",
    description: "View and manage all documents",
    roles: ["Admin"],
  },
  {
    name: "Departments",
    href: "/departments",
    icon: "🏢",
    description: "Manage departments and codes",
    roles: ["Admin"],
  },
  {
    name: "Users",
    href: "/users",
    icon: "👥",
    description: "Manage system users and roles",
    roles: ["Admin"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: "📈",
    description: "View reports and export data",
    roles: ["Admin"],
  },
];

// Encoder Menu - Focused on data entry
export const encoderMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    description: "View today's tasks and summary",
    roles: ["Encoder"],
  },
  {
    name: "Encode Document",
    href: "/documents/new",
    icon: "➕",
    description: "Create a new document",
    roles: ["Encoder"],
  },
  {
    name: "My Documents",
    href: "/documents/my",
    icon: "📝",
    description: "View documents I encoded",
    roles: ["Encoder"],
  },
  {
    name: "Pending Records",
    href: "/documents/pending",
    icon: "⏳",
    description: "View pending documents",
    roles: ["Encoder"],
  },
  {
    name: "Help",
    href: "/help",
    icon: "❓",
    description: "Get help and guidance",
    roles: ["Encoder"],
  },
];

// Viewer Menu - Read-only access
export const viewerMenuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    description: "View system overview",
    roles: ["Viewer"],
  },
  {
    name: "Documents",
    href: "/documents",
    icon: "📄",
    description: "View all documents (read-only)",
    roles: ["Viewer"],
  },
];

// Get menu items based on user role
export function getMenuItemsForRole(
  role: "Admin" | "Encoder" | "Viewer"
): MenuItem[] {
  switch (role) {
    case "Admin":
      return adminMenuItems;
    case "Encoder":
      return encoderMenuItems;
    case "Viewer":
      return viewerMenuItems;
    default:
      return [];
  }
}
