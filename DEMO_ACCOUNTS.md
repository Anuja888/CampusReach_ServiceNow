# CampusReach — Demo Accounts

> **Never commit real passwords. These are demo-only credentials for local development.**

All accounts use password: `demo123`

## Students

| Name | Email | Student ID | Year |
|---|---|---|---|
| Riya Sharma | riya.s@student.university.edu | STU2024001 | 2nd year CS |
| Arjun Rao | arjun.r@student.university.edu | STU2024002 | 1st year |

## Staff

| Name | Email | Department |
|---|---|---|
| Dr. Sarah Okafor | staff@university.edu | Student Wellbeing Service |
| Priya Menon | advisor@university.edu | Academic Support & Advising |
| Kavya Reddy | frontdesk@university.edu | Student Support Front Desk |

## Admin

| Name | Email | Role |
|---|---|---|
| Head of Student Services | admin@university.edu | Admin |

---

**To add a new demo account:** edit `src/lib/auth.ts` → `DEMO_ACCOUNTS` array.  
**Students can self-register** from the sign-in screen — passwords are SHA-256 hashed with a random salt via Web Crypto API.
