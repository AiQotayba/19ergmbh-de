export type RosterStatus = "SCHEDULED" | "ON_DUTY" | "PRESENT" | "LATE" | "ABSENT" | "HOLIDAY";

export function isShiftEnded(shift: { endTime: Date | string }): boolean {
  return new Date(shift.endTime).getTime() < Date.now();
}

export function deriveRosterStatus(input: {
  assignmentStatus: string;
  attendance: { status: string; checkIn?: Date | string | null } | null | undefined;
  shift: { endTime: Date | string };
}): RosterStatus {
  if (input.assignmentStatus === "HOLIDAY") return "HOLIDAY";
  if (input.assignmentStatus === "ABSENT" || input.attendance?.status === "ABSENT") {
    return "ABSENT";
  }
  if (input.attendance?.status === "LATE") return "LATE";
  if (input.attendance?.status === "PRESENT" || input.attendance?.checkIn) return "PRESENT";
  if (isShiftEnded(input.shift)) return "ON_DUTY";
  return "SCHEDULED";
}
