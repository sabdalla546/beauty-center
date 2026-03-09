// src/models/index.ts
import { sequelize } from "../db/db";

import { Appointment } from "./appointment.model";
import { Customer } from "./customer.model";
import { Order } from "./order.model";
import { OrderItem } from "./orderItem.model";
import { Payment } from "./payment.model";
import { PaymentMethod } from "./paymentMethod.model";
import { Permission } from "./permission.model";
import { Product } from "./product.model";
import { RefreshToken } from "./refreshToken.model";
import { Role } from "./role.model";
import { RolePermission } from "./rolePermission.model";
import { Room } from "./room.model";
import { RoomType } from "./roomType.model";
import { Service } from "./service.model";
import { ShiftSession } from "./ShiftSession.model";
import { Staff } from "./staff.model";
import { StockMovement } from "./stockMovement.model";
import { User } from "./user.model";
import { UserRole } from "./userRole.model";
import { PackagePlan } from "./packagePlan.model";
import { CustomerPackage } from "./customerPackage.model";
import { PackageUsage } from "./packageUsage.model";
/** ===== RBAC ===== */
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: "userId",
  otherKey: "roleId",
  as: "roles",
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: "roleId",
  otherKey: "userId",
  as: "users",
});

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "roleId",
  otherKey: "permissionId",
  as: "permissions",
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permissionId",
  otherKey: "roleId",
  as: "roles",
});

/** ===== Sessions ===== */
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });

/** ===== Staff Profile ===== */
User.hasOne(Staff, { foreignKey: "id", as: "staffProfile" });
Staff.belongsTo(User, { foreignKey: "id", as: "user" });

/** ===== Rooms & Services ===== */
Room.belongsTo(RoomType, { foreignKey: "roomTypeId", as: "roomType" });
Service.belongsTo(RoomType, {
  foreignKey: "requiredRoomTypeId",
  as: "requiredRoomType",
});

/** ===== Appointments ===== */
Appointment.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });
Appointment.belongsTo(Service, { foreignKey: "serviceId", as: "service" });
Appointment.belongsTo(Staff, { foreignKey: "staffId", as: "staff" });
Appointment.belongsTo(Room, { foreignKey: "roomId", as: "room" });

/** ===== POS ===== */
Order.belongsTo(Customer, { foreignKey: "customerId", as: "customer" });

Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items" });
OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });
Staff.hasMany(OrderItem, { foreignKey: "staffId", as: "orderItems" });
OrderItem.belongsTo(Staff, { foreignKey: "staffId", as: "staff" });

Order.hasMany(Payment, { foreignKey: "orderId", as: "payments" });
//Order.hasMany(Payment, { foreignKey: "orderId" });
Payment.belongsTo(Order, { foreignKey: "orderId", as: "order" });
//Payment.belongsTo(Order, { foreignKey: "orderId" });
/** ===== POS (optional enrich) ===== */
// lineType = "product" -> referenceId is productId
OrderItem.belongsTo(Product, {
  foreignKey: "referenceId",
  as: "product",
  constraints: false,
});
/** ===== Packages ===== */
PackagePlan.belongsTo(Service, { foreignKey: "serviceId", as: "service" });

CustomerPackage.belongsTo(Customer, {
  foreignKey: "customerId",
  as: "customer",
});
CustomerPackage.belongsTo(PackagePlan, { foreignKey: "planId", as: "plan" });

CustomerPackage.hasMany(PackageUsage, {
  foreignKey: "customerPackageId",
  as: "usages",
});
PackageUsage.belongsTo(CustomerPackage, {
  foreignKey: "customerPackageId",
  as: "customerPackage",
});

PackageUsage.belongsTo(Appointment, {
  foreignKey: "appointmentId",
  as: "appointment",
});
PackageUsage.belongsTo(OrderItem, {
  foreignKey: "orderItemId",
  as: "orderItem",
});
OrderItem.hasMany(PackageUsage, {
  foreignKey: "orderItemId",
  as: "packageUsages",
});

// lineType = "service" -> referenceId is serviceId
OrderItem.belongsTo(Service, {
  foreignKey: "referenceId",
  as: "service",
  constraints: false,
});
PaymentMethod.hasMany(Payment, { foreignKey: "methodId", as: "payments" });
Payment.belongsTo(PaymentMethod, { foreignKey: "methodId", as: "method" });

ShiftSession.hasMany(Order, { foreignKey: "shiftSessionId" });
Order.belongsTo(ShiftSession, { foreignKey: "shiftSessionId" });

ShiftSession.hasMany(Payment, { foreignKey: "shiftSessionId" });
Payment.belongsTo(ShiftSession, { foreignKey: "shiftSessionId" });
/** ===== Inventory ===== */
StockMovement.belongsTo(Product, { foreignKey: "productId", as: "product" });

ShiftSession.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(ShiftSession, { foreignKey: "userId", as: "shiftSessions" });

// actual execution references
Appointment.belongsTo(Staff, {
  foreignKey: "actualStaffId",
  as: "actualStaff",
});

Appointment.belongsTo(Room, {
  foreignKey: "actualRoomId",
  as: "actualRoom",
});

// package linkage
Appointment.belongsTo(CustomerPackage, {
  foreignKey: "customerPackageId",
  as: "customerPackage",
  constraints: false,
});

// completion / audit users
Appointment.belongsTo(User, {
  foreignKey: "completedBy",
  as: "completedByUser",
});

Appointment.belongsTo(User, {
  foreignKey: "cancelledBy",
  as: "cancelledByUser",
});

Appointment.belongsTo(User, {
  foreignKey: "noShowMarkedBy",
  as: "noShowMarkedByUser",
});

// self-reference for reschedule lineage
Appointment.belongsTo(Appointment, {
  foreignKey: "rescheduledFromAppointmentId",
  as: "rescheduledFrom",
});
Appointment.belongsTo(Order, {
  foreignKey: "checkoutOrderId",
  as: "checkoutOrder",
  constraints: false,
});
export {
  sequelize,
  User,
  Role,
  Permission,
  UserRole,
  RolePermission,
  RefreshToken,
  Staff,
  Customer,
  RoomType,
  Room,
  Service,
  Appointment,
  Order,
  OrderItem,
  Payment,
  Product,
  StockMovement,
  ShiftSession,
  PaymentMethod,
  PackagePlan,
  CustomerPackage,
  PackageUsage,
};
