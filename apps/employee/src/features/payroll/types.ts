export interface PayrollRecord {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  totalHours: number;
  absenceHours: number;
  hourlyRate: number;
  salary: number;
  paidAmount: number | null;
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
}
