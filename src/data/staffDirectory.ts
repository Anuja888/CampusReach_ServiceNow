/**
 * Staff directory — one location per department + staff members.
 * Department ids match the DEPARTMENTS keys in routing.ts.
 */

import type { LocationInfo, AssigneeInfo } from "@/types";
import { CONTACTS } from "@/config/contacts";

export interface DepartmentLocation {
  departmentId: string;
  location: LocationInfo;
}

export const DEPARTMENT_LOCATIONS: Record<string, LocationInfo> = {
  human_triage: {
    building: "Student Services Centre",
    floor: "Ground Floor",
    room: "Counter 3",
    officeHours: "Mon–Fri, 09:00–17:00",
    note: "Walk-in welcome. No appointment needed.",
  },
  wellbeing: {
    building: "Wellbeing Centre",
    block: "Block C",
    room: "Room 204",
    officeHours: "Mon–Fri, 10:00–18:00",
    note: "Please check in at reception on arrival.",
  },
  academic_support: {
    building: "Academic Block A",
    room: "Room 310",
    officeHours: "Mon–Fri, 09:00–17:00",
    note: "Drop-in slots available 13:00–14:00 daily.",
  },
  financial_aid: {
    building: "Admin Block",
    room: "Room 105",
    officeHours: "Mon–Fri, 10:00–16:00",
  },
  housing: {
    building: "Hostel Office",
    block: "Block D",
    room: "Room 12",
    officeHours: "Mon–Fri, 09:00–17:00",
    note: "Emergencies: call security on ext. 999.",
  },
  health_centre: {
    building: "Campus Health Centre",
    room: "Reception",
    officeHours: "Mon–Fri, 08:30–18:00",
  },
  general_advice: {
    building: "Student Services Centre",
    floor: "Ground Floor",
    room: "Information Desk",
    officeHours: "Mon–Fri, 09:00–17:00",
  },
  crisis_line: {
    building: "Wellbeing Centre",
    block: "Block C",
    room: "On-call — phone support",
    officeHours: "24×7",
    note: `Call ${CONTACTS.crisisLine.number} (free) at any time.`,
  },
};

/** Staff members mapped to department ids */
export const STAFF_MEMBERS: (AssigneeInfo & { departmentId: string })[] = [
  {
    staffId: "s001",
    departmentId: "wellbeing",
    name: "Dr. Sarah Okafor",
    title: "Senior Counsellor",
    department: "Student Wellbeing Service",
    email: "staff@university.edu",
  },
  {
    staffId: "s002",
    departmentId: "academic_support",
    name: "Priya Menon",
    title: "Academic Advisor",
    department: "Academic Support & Advising",
    email: "advisor@university.edu",
  },
  {
    staffId: "s003",
    departmentId: "human_triage",
    name: "Kavya Reddy",
    title: "Front Desk Coordinator",
    department: "Student Support Front Desk",
    email: "frontdesk@university.edu",
  },
];

export function getStaffForDepartment(departmentId: string) {
  return STAFF_MEMBERS.filter((s) => s.departmentId === departmentId);
}

export function getLocationForDepartment(departmentId: string): LocationInfo | undefined {
  return DEPARTMENT_LOCATIONS[departmentId];
}
