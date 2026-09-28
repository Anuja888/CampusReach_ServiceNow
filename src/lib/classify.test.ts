/**
 * Classifier golden-case tests.
 * Run with: npx vitest run src/lib/classify.test.ts
 *
 * These test the SYNCHRONOUS rules layer only (no AI calls).
 * They import classifyText but mock callModel to return null so
 * the AI path is never triggered in tests.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the AI client before importing classify.ts
vi.mock("./aiClient", () => ({
  callModel: vi.fn().mockResolvedValue(null),
  redactPII: (t: string) => t,
}));

// Mock Vite env
vi.stubGlobal("import.meta", { env: {} });

import { classifyText } from "./classify";

// ── Helper ────────────────────────────────────────────────────────────────────
async function classify(text: string) {
  return classifyText(text);
}

// ── Test suite ────────────────────────────────────────────────────────────────
describe("Hybrid classifier — golden cases", () => {

  it("1. Clear academic stress — dissertation + can't focus", async () => {
    const r = await classify(
      "My dissertation is due next week and I can't focus at all. I've been procrastinating and missing deadlines."
    );
    expect(r.primaryCategory).toBe("academic_stress");
    expect(["medium", "high"]).toContain(r.urgencyLevel);
    expect(r.source).toBe("rules");
    expect(r.isCrisis).toBe(false);
  });

  it("2. Clear financial hardship — rent + can't afford", async () => {
    const r = await classify(
      "I can't afford my rent this month and I've run out of money completely. I'm worried about getting evicted."
    );
    expect(r.primaryCategory).toBe("financial");
    expect(["medium", "high"]).toContain(r.urgencyLevel);
    expect(r.source).toBe("rules");
    expect(r.isCrisis).toBe(false);
  });

  it("3. Clear housing emergency — eviction + homeless", async () => {
    const r = await classify(
      "My landlord is evicting me and I have nowhere to go. I'm homeless from next Monday."
    );
    expect(r.primaryCategory).toBe("housing");
    expect(["medium", "high"]).toContain(r.urgencyLevel);
    expect(r.isCrisis).toBe(false);
  });

  it("4. Multi-need — academic + mental health", async () => {
    const r = await classify(
      "I'm overwhelmed by exams and I've been having panic attacks. I can't sleep and my assignment deadline is tomorrow."
    );
    expect(r.primaryCategory).toBe("mental_health");
    expect(r.secondaryCategory).toBe("academic_stress");
    expect(r.urgencyLevel).toBe("high");
  });

  it("5. Crisis — explicit self-harm phrase", async () => {
    const r = await classify("I've been thinking about hurting myself.");
    expect(r.isCrisis).toBe(true);
    expect(r.urgencyLevel).toBe("crisis");
    expect(r.source).toBe("rules");
  });

  it("6. Crisis — 'end my life'", async () => {
    const r = await classify("I want to end my life. I can't take it anymore.");
    expect(r.isCrisis).toBe(true);
    expect(r.urgencyLevel).toBe("crisis");
  });

  it("7. Crisis — Hindi/Hinglish 'marna chahta hoon'", async () => {
    const r = await classify("Main bahut thak gaya hoon, marna chahta hoon sach mein.");
    expect(r.isCrisis).toBe(true);
    expect(r.urgencyLevel).toBe("crisis");
    expect(r.source).toBe("rules");
  });

  it("8. NEGATION — 'I am not going to hurt myself' must NOT be crisis", async () => {
    const r = await classify(
      "I am not going to hurt myself. I just need some study support please."
    );
    expect(r.isCrisis).toBe(false);
    // Should route to academic/general, not crisis
    expect(r.urgencyLevel).not.toBe("crisis");
  });

  it("9. Physical health + academic — health issues + exam accommodations", async () => {
    const r = await classify(
      "I need exam accommodations due to health issues. I've been ill for a week and couldn't attend lectures."
    );
    // health_issues(3)+ill(2) = 5 physical_health, exam(3)+extension implied = 3 academic
    // physical_health wins on total, or tie — accept either
    expect(["academic_stress", "physical_health"]).toContain(r.primaryCategory);
    // The secondary should be the other one
    const other = r.primaryCategory === "academic_stress" ? "physical_health" : "academic_stress";
    expect(r.secondaryCategory).toBe(other);
  });

  it("10. Social isolation — low or medium urgency (score ~9)", async () => {
    const r = await classify(
      "I've been feeling really lonely since starting uni. I feel disconnected and have no friends here."
    );
    expect(r.primaryCategory).toBe("social_isolation");
    // lonely(3)+disconnected(3)+no friends(3)=9 → medium by threshold
    expect(["low", "medium"]).toContain(r.urgencyLevel);
    expect(r.isCrisis).toBe(false);
  });

  it("11. Gibberish — falls through to human triage", async () => {
    const r = await classify("asdf jkl qwerty lorem ipsum bzzzt 123456");
    // No keywords matched, low confidence → human triage
    expect(r.needsHumanTriage).toBe(true);
    expect(r.source).toBe("human");
  });

  it("12. Hinglish academic stress — exam + pressure", async () => {
    const r = await classify(
      "Yaar mujhe samajh nahi aa raha kya karu. Padhne mein bilkul mann nahi lagta, exam ka bohot pressure hai."
    );
    // Rules score low (only 'exam' matches) → human triage or AI
    // Either way, should NOT be crisis
    expect(r.isCrisis).toBe(false);
    // source must be "human" (since AI is mocked to null)
    expect(r.source).toBe("human");
  });

  it("13. Scholarship delay — financial", async () => {
    const r = await classify(
      "My scholarship has been delayed for two months. I can't pay my hostel fees and I'm running out of money."
    );
    expect(r.primaryCategory).toBe("financial");
    expect(["medium", "high"]).toContain(r.urgencyLevel);
  });

  it("14. Attendance shortage — academic", async () => {
    const r = await classify(
      "My attendance is below the required percentage due to illness. I'm worried the college will not allow me to sit for exams."
    );
    expect(r.primaryCategory).toBe("academic_stress");
    expect(r.secondaryCategory).toBe("physical_health");
  });

  it("15. Mental health — depression + burnout", async () => {
    const r = await classify(
      "I've been feeling depressed for months. I'm completely burnt out and I can't cope anymore. I feel hopeless."
    );
    expect(r.primaryCategory).toBe("mental_health");
    expect(["high"]).toContain(r.urgencyLevel);
    expect(r.isCrisis).toBe(false); // hopeless alone doesn't trigger crisis
  });

});
