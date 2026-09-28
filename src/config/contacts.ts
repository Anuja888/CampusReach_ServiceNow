/**
 * Campus contact configuration.
 * Replace PLACEHOLDER values before production deployment.
 */

export const CONTACTS = {
  crisisLine: {
    name: "Tele-MANAS National Helpline",
    number: "14416",
    altNumber: "1-800-891-4416",
    available: "24×7 · Multiple languages",
    isFree: true,
  },
  nationalEmergency: {
    name: "National Emergency",
    number: "112",
  },
  counsellorOnCall: {
    name: "Campus Counsellor On-Call",
    number: "PLACEHOLDER — replace before go-live",
    available: "Available until midnight on working days",
  },
  wellbeingCentre: {
    building: "Building 3, ground floor",
    description: "Student Wellbeing Centre — drop in or call campus security ext. 999",
  },
} as const;
