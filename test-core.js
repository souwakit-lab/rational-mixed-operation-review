const assert = require("node:assert/strict");
const core = require("./game-core");

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

assert.deepEqual(core.LEVEL_XP, { 1:800, 2:500, 3:500, 4:500 });
assert.equal(core.getLevelXp(1), 800);
assert.equal(core.getLevelXp(2), 500);
assert.equal(core.getLevelXp(4), 500);

const seenTypes = new Map();
let level2HasImproper = false;
let level2HasMixed = false;
let level1HasBracketedAddSubtract = false;
let level1HasExpandedAddSubtract = false;
for (let level = 1; level <= 4; level += 1) {
  const rng = seeded(700 + level);
  const types = new Set();
  for (let index = 0; index < 400; index += 1) {
    const item = core.generateQuestion(level, rng);
    assert.equal(item.level, level);
    assert.ok(item.type);
    assert.ok(item.tex);
    assert.ok(item.answer);
    assert.ok(item.answerTex);
    assert.ok(Number.isFinite(item.answer.valueOf()));
    assert.ok(Array.isArray(item.steps) && item.steps.length >= 3);
    assert.equal(core.parseAnswer(item.answer.toFraction()).equals(item.answer), true);
    assert.equal(core.isAnswerCorrect(item.answer.toFraction(), item.answer), true);
    if (level === 1) {
      const positiveOperands = item.tex.match(/\\left\(\+\d+\\right\)/g) || [];
      assert.ok(positiveOperands.length < 2, `Level 1 contains two positive operands: ${item.tex}`);
      if (item.type === "單步加法" || item.type === "單步減法") {
        level1HasBracketedAddSubtract ||= item.tex.includes("\\left(");
        level1HasExpandedAddSubtract ||= !item.tex.includes("\\left(");
      }
    }
    if (level === 2) {
      assert.equal((item.tex.match(/\\frac/g) || []).length, 1);
      level2HasMixed ||= /\d+\\frac/.test(item.tex);
      level2HasImproper ||= !/\d+\\frac/.test(item.tex);
    }
    types.add(item.type);
  }
  seenTypes.set(level, types);
}

assert.deepEqual([...seenTypes.get(1)].sort(), ["單步乘法", "單步加法", "單步減法", "單步除法"]);
assert.equal(level1HasBracketedAddSubtract, true);
assert.equal(level1HasExpandedAddSubtract, true);
assert.deepEqual([...seenTypes.get(2)].sort(), ["分數乘法", "分數加法", "分數減法", "分數除法"]);
assert.equal(level2HasImproper, true);
assert.equal(level2HasMixed, true);
assert.deepEqual([...seenTypes.get(3)].sort(), ["乘除後加", "乘除混合", "先乘後加", "先除後減"]);
assert.deepEqual([...seenTypes.get(4)].sort(), ["分數括號運算", "分數線綜合運算", "帶分數混合運算", "括號連除", "雙括號運算"]);

assert.equal(core.parseAnswer("0.5").equals(core.parseAnswer("1/2")), true);
assert.equal(core.parseAnswer("-1.25").equals(core.parseAnswer("-5/4")), true);
assert.equal(core.parseAnswer("1/0"), null);
assert.equal(core.parseAnswer("1."), null);
assert.equal(core.parseAnswer("abc"), null);
assert.equal(core.isAnswerCorrect("8/2", core.parseAnswer("4")), false);
assert.equal(core.isAnswerCorrect("2/1", core.parseAnswer("2")), false);
assert.equal(core.isAnswerCorrect("1/2", core.parseAnswer("1/2")), true);
assert.equal(core.isAnswerCorrect("0.5", core.parseAnswer("1/2")), true);

const base = { level:1, xp:785, total:0, correct:0, streak:0 };
let result = core.applyResult(base, true);
assert.equal(result.leveledUp, true);
assert.equal(result.progress.level, 2);
assert.equal(result.progress.xp, 0);

result = core.applyResult({ ...base, xp:5 }, false);
assert.equal(result.progress.xp, 0);
assert.equal(result.progress.streak, 0);

result = core.applyResult({ ...base, level:2, xp:495 }, true);
assert.equal(result.progress.level, 3);
assert.equal(result.progress.xp, 10);

result = core.applyResult({ ...base, level:4, xp:495 }, true);
assert.equal(result.completed, true);
assert.equal(result.progress.xp, 500);

console.log("All rational mixed-operation core tests passed.");
