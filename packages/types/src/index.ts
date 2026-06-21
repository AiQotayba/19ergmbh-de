export type UserRole = "ADMIN" | "EMPLOYEE";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export type ShiftStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type ShiftEmployeeStatus = "SCHEDULED" | "CONFIRMED" | "ABSENT" | "COMPLETED";

export type NotificationChannel = "EMAIL" | "WHATSAPP";

export type NotificationType = "SCHEDULE" | "SALARY";

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  hourlyRate: number;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  hourlyRate: number;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: UserRole;
  hourlyRate?: number;
  isActive?: boolean;
}

export interface CreateShiftRequest {
  title?: string;
  startTime: string;
  endTime: string;
  notes?: string;
  breakMinutes?: number;
  status?: ShiftStatus;
}

export interface AssignShiftRequest {
  shiftId: string;
  employeeId: string;
}

export interface UnassignShiftRequest {
  shiftId: string;
  employeeId: string;
}

export interface CheckInRequest {
  shiftId: string;
  employeeId?: string;
  notes?: string;
}

export interface CheckOutRequest {
  shiftId: string;
  employeeId?: string;
  notes?: string;
}

export interface PayrollRunRequest {
  fromDate: string;
  toDate: string;
}

export interface SendNotificationRequest {
  employeeId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
}

export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  totalShifts: number;
  upcomingShifts: number;
  pendingPayrolls: number;
  pendingNotifications: number;
}