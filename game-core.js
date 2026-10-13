(function attachCore(root, factory) {
  const FractionClass = typeof module !== "undefined" && module.exports ? require("./vendor/fraction.min.js") : root.Fraction;
  const api = factory(FractionClass);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RationalGameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore(FractionClass) {
  const LEVEL_XP = Object.freeze({ 1: 1500, 2: 500, 3: 500, 4: 500 });
  const getLevelXp = (level) => LEVEL_XP[Math.min(4, Math.max(1, Number(level) || 1))];
  const randomInt = (min, max, rng) => Math.floor(rng() * (max - min + 1)) + min;
  const randomSign = (rng) => rng() < 0.5 ? -1 : 1;

  function nonZeroInt(min, max, rng) {
    let value = 0;
    while (value === 0) value = randomInt(min, max, rng);
    return value;
  }

  function avoidBothPositive(left, right) {
    return left > 0 && right > 0 ? [left, -right] : [left, right];
  }

  function integerTex(value, signed = false) {
    if (signed) return `\\left(${value >= 0 ? "+" : "-"}${Math.abs(value)}\\right)`;
    return value < 0 ? `-${Math.abs(value)}` : String(value);
  }

  function fractionTex(value) {
    const fraction = value instanceof FractionClass ? value : new FractionClass(value);
    const text = fraction.toFraction();
    const negative = text.startsWith("-");
    const unsigned = negative ? text.slice(1) : text;
    if (!unsigned.includes("/")) return `${negative ? "-" : ""}${unsigned}`;
    const [numerator, denominator] = unsigned.split("/");
    return `${negative ? "-" : ""}\\frac{${numerator}}{${denominator}}`;
  }

  function signedFractionTex(value) {
    const fraction = value instanceof FractionClass ? value : new FractionClass(value);
    return `\\left(${fraction.s < 0 ? "-" : "+"}${fractionTex(fraction.abs())}\\right)`;
  }

  function mixedNumberTex(value) {
    const fraction = value instanceof FractionClass ? value : new FractionClass(value);
    const [numeratorText, denominatorText = "1"] = fraction.abs().toFraction().split("/");
    const numerator = Number(numeratorText);
    const denominator = Number(denominatorText);
    return `\\left(${fraction.s < 0 ? "-" : "+"}${Math.floor(numerator / denominator)}\\frac{${numerator % denominator}}{${denominator}}\\right)`;
  }

  function signRule(values, label) {
    const negatives = values.filter((value) => value.s < 0).length;
    return `符號：${label}中有 ${negatives} 個負數，所以結果是${negatives % 2 ? "負" : "正"}數。`;
  }

  function question(level, type, tex, answer, steps) {
    return { level, type, tex, answer, answerTex: fractionTex(answer), steps };
  }

  function makeImproper(rng) {
    const denominator = randomInt(2, 8, rng);
    const whole = randomInt(1, 4, rng);
    const remainder = randomInt(1, denominator - 1, rng);
    return new FractionClass(randomSign(rng) * (whole * denominator + remainder), denominator);
  }

  function generateLevel1(rng) {
    const mode = randomInt(0, 3, rng);
    if (mode < 2) {
      const [left, right] = avoidBothPositive(nonZeroInt(-15, 15, rng), nonZeroInt(-15, 15, rng));
      const answer = mode === 0 ? new FractionClass(left).add(right) : new FractionClass(left).sub(right);
      const operation = mode === 0 ? "+" : "-";
      return question(1, mode === 0 ? "單步加法" : "單步減法", `${integerTex(left, true)} ${operation} ${integerTex(right, true)}`, answer, [
        mode === 0 ? "同號相加，異號相減，結果取絕對值較大者的符號。" : "減去一個數，等於加上它的相反數。",
        `${integerTex(left, true)} ${operation} ${integerTex(right, true)} = ${fractionTex(answer)}`,
        `答案：${fractionTex(answer)}`,
      ]);
    }
    if (mode === 2) {
      const [left, right] = avoidBothPositive(nonZeroInt(-9, 9, rng), nonZeroInt(-9, 9, rng));
      const answer = new FractionClass(left).mul(right);
      return question(1, "單步乘法", `${integerTex(left, true)} \\times ${integerTex(right, true)}`, answer, [
        signRule([new FractionClass(left), new FractionClass(right)], "乘法"),
        `絕對值：${Math.abs(left)} \\times ${Math.abs(right)} = ${Math.abs(left * right)}`,
        `答案：${fractionTex(answer)}`,
      ]);
    }
    let divisor = nonZeroInt(-9, 9, rng);
    const quotient = nonZeroInt(-12, 12, rng);
    let dividend = divisor * quotient;
    [dividend, divisor] = avoidBothPositive(dividend, divisor);
    const answer = new FractionClass(dividend).div(divisor);
    return question(1, "單步除法", `${integerTex(dividend, true)} \\div ${integerTex(divisor, true)}`, answer, [
      signRule([new FractionClass(dividend), new FractionClass(divisor)], "除法"),
      `絕對值：${Math.abs(dividend)} \\div ${Math.abs(divisor)} = ${fractionTex(answer.abs())}`,
      `答案：${fractionTex(answer)}`,
    ]);
  }

  function generateLevel2(rng) {
    const mode = randomInt(0, 3, rng);
    const showMixed = rng() < 0.5;
    const special = makeImproper(rng);
    let integer = nonZeroInt(-8, 8, rng);
    if (special.s > 0 && integer > 0) integer *= -1;
    const specialTex = showMixed ? mixedNumberTex(special) : signedFractionTex(special);
    const specialOnLeft = rng() < 0.5;
    const left = specialOnLeft ? special : new FractionClass(integer);
    const right = specialOnLeft ? new FractionClass(integer) : special;
    const leftTex = specialOnLeft ? specialTex : integerTex(integer, true);
    const rightTex = specialOnLeft ? integerTex(integer, true) : specialTex;
    const operations = ["+", "-", "\\times", "\\div"];
    const labels = ["分數加法", "分數減法", "分數乘法", "分數除法"];
    const answer = mode === 0 ? left.add(right) : mode === 1 ? left.sub(right) : mode === 2 ? left.mul(right) : left.div(right);
    return question(2, labels[mode], `${leftTex} ${operations[mode]} ${rightTex}`, answer, [
      showMixed ? `先把帶分數化為假分數：${specialTex} = ${signedFractionTex(special)}` : `假分數保持最簡形式：${signedFractionTex(special)}`,
      mode < 2 ? "加減分數前先通分，再計算分子。" : mode === 2 ? "分子乘分子、分母乘分母，最後約分。" : "除以一個數，等於乘以它的倒數。",
      `${leftTex} ${operations[mode]} ${rightTex} = ${fractionTex(answer)}`,
    ]);
  }

  function generateLevel3(rng) {
    const mode = randomInt(0, 3, rng);
    const a = nonZeroInt(-12, 12, rng);
    const b = nonZeroInt(-9, 9, rng);
    const c = nonZeroInt(-9, 9, rng);
    if (mode === 0) {
      const first = new FractionClass(a).mul(b);
      const answer = first.add(c);
      return question(3, "先乘後加", `${integerTex(a, true)} \\times ${integerTex(b, true)} + ${integerTex(c, true)}`, answer, ["先乘除，後加減。", `${integerTex(a, true)} \\times ${integerTex(b, true)} = ${fractionTex(first)}`, `${fractionTex(first)} + ${integerTex(c, true)} = ${fractionTex(answer)}`]);
    }
    if (mode === 1) {
      const first = new FractionClass(b).div(c);
      const answer = new FractionClass(a).sub(first);
      return question(3, "先除後減", `${integerTex(a, true)} - ${integerTex(b, true)} \\div ${integerTex(c, true)}`, answer, ["先計算除法，再計算減法。", `${integerTex(b, true)} \\div ${integerTex(c, true)} = ${fractionTex(first)}`, `${integerTex(a, true)} - ${fractionTex(first)} = ${fractionTex(answer)}`]);
    }
    if (mode === 2) {
      const d = nonZeroInt(-6, 6, rng);
      const first = new FractionClass(b).mul(c).div(d);
      const answer = new FractionClass(a).add(first);
      return question(3, "乘除後加", `${integerTex(a)} + ${integerTex(b, true)} \\times ${integerTex(c, true)} \\div ${integerTex(d, true)}`, answer, ["乘法和除法同級，必須由左至右計算。", `${integerTex(b, true)} \\times ${integerTex(c, true)} \\div ${integerTex(d, true)} = ${fractionTex(first)}`, `${integerTex(a)} + ${fractionTex(first)} = ${fractionTex(answer)}`]);
    }
    const d = nonZeroInt(-8, 8, rng);
    const first = new FractionClass(a).mul(b);
    const second = new FractionClass(c).div(d);
    const answer = first.add(second);
    return question(3, "乘除混合", `${integerTex(a, true)} \\times ${integerTex(b, true)} + ${integerTex(c, true)} \\div ${integerTex(d, true)}`, answer, ["先分別計算乘法和除法。", `${integerTex(a, true)} \\times ${integerTex(b, true)} = ${fractionTex(first)}，\\quad ${integerTex(c, true)} \\div ${integerTex(d, true)} = ${fractionTex(second)}`, `${fractionTex(first)} + ${fractionTex(second)} = ${fractionTex(answer)}`]);
  }

  function generateLevel4(rng) {
    const mode = randomInt(0, 4, rng);
    if (mode === 0) {
      const a = nonZeroInt(-9, 9, rng), b = nonZeroInt(-9, 9, rng), c = nonZeroInt(-9, 9, rng), d = nonZeroInt(-9, 9, rng);
      const left = new FractionClass(a).sub(b);
      const usePlus = !new FractionClass(c).add(d).equals(0);
      const right = usePlus ? new FractionClass(c).add(d) : new FractionClass(c).sub(d);
      const op = usePlus ? "+" : "-";
      const answer = left.div(right);
      return question(4, "雙括號運算", `\\left[${integerTex(a, true)} - ${integerTex(b, true)}\\right] \\div \\left[${integerTex(c, true)} ${op} ${integerTex(d, true)}\\right]`, answer, ["先分別計算兩個中括號。", `左括號 = ${fractionTex(left)}，\\quad 右括號 = ${fractionTex(right)}`, `${fractionTex(left)} \\div ${fractionTex(right)} = ${fractionTex(answer)}`]);
    }
    if (mode === 1) {
      const outer = nonZeroInt(-18, 18, rng), innerLeft = nonZeroInt(-9, 9, rng), innerRight = nonZeroInt(-6, 6, rng);
      const inner = new FractionClass(innerLeft).div(innerRight);
      const answer = new FractionClass(outer).div(inner);
      return question(4, "括號連除", `${integerTex(outer, true)} \\div \\left[${integerTex(innerLeft, true)} \\div ${integerTex(innerRight, true)}\\right]`, answer, ["先計算中括號內的除法。", `${integerTex(innerLeft, true)} \\div ${integerTex(innerRight, true)} = ${fractionTex(inner)}`, `${integerTex(outer, true)} \\div ${fractionTex(inner)} = ${fractionTex(answer)}`]);
    }
    if (mode === 2) {
      const mixed = makeImproper(rng);
      const fraction = new FractionClass(randomSign(rng) * randomInt(1, 4, rng), randomInt(5, 9, rng));
      const integer = nonZeroInt(-6, 6, rng);
      const mixedTex = mixedNumberTex(mixed);
      const bracket = fraction.sub(mixed);
      const answer = new FractionClass(integer).add(bracket);
      return question(4, "分數括號運算", `${integerTex(integer)} + \\left[${signedFractionTex(fraction)} - ${mixedTex}\\right]`, answer, [`先把帶分數化為假分數：${mixedTex} = ${signedFractionTex(mixed)}`, `括號內：${signedFractionTex(fraction)} - ${signedFractionTex(mixed)} = ${fractionTex(bracket)}`, `${integerTex(integer)} + ${fractionTex(bracket)} = ${fractionTex(answer)}`]);
    }
    if (mode === 3) {
      const a = nonZeroInt(-12, 12, rng), mixed = makeImproper(rng), b = nonZeroInt(-15, 15, rng), c = nonZeroInt(-6, 6, rng);
      const first = new FractionClass(a).mul(mixed);
      const second = new FractionClass(b).div(c);
      const answer = first.sub(second);
      const mixedTex = mixedNumberTex(mixed);
      return question(4, "帶分數混合運算", `${integerTex(a, true)} \\times ${mixedTex} - ${integerTex(b, true)} \\div ${integerTex(c, true)}`, answer, [`先把帶分數化為假分數：${mixedTex} = ${signedFractionTex(mixed)}`, `先乘除：${integerTex(a, true)} \\times ${signedFractionTex(mixed)} = ${fractionTex(first)}，\\quad ${integerTex(b, true)} \\div ${integerTex(c, true)} = ${fractionTex(second)}`, `${fractionTex(first)} - ${fractionTex(second)} = ${fractionTex(answer)}`]);
    }
    const numerator = nonZeroInt(-18, 18, rng), a = nonZeroInt(-9, 9, rng);
    let b = nonZeroInt(-9, 9, rng);
    if (a === b) b += b > 0 ? 1 : -1;
    const extra = nonZeroInt(-8, 8, rng);
    const denominator = new FractionClass(a).sub(b);
    const fraction = new FractionClass(numerator).div(denominator);
    const answer = fraction.add(extra);
    return question(4, "分數線綜合運算", `\\frac{${integerTex(numerator)}}{${integerTex(a)} - ${integerTex(b, true)}} + ${integerTex(extra, true)}`, answer, [`先計算分母：${integerTex(a)} - ${integerTex(b, true)} = ${fractionTex(denominator)}`, `分數線代表除法：${integerTex(numerator)} \\div ${fractionTex(denominator)} = ${fractionTex(fraction)}`, `${fractionTex(fraction)} + ${integerTex(extra, true)} = ${fractionTex(answer)}`]);
  }

  function generateQuestion(level, rng = Math.random) {
    if (level === 1) return generateLevel1(rng);
    if (level === 2) return generateLevel2(rng);
    if (level === 3) return generateLevel3(rng);
    return generateLevel4(rng);
  }

  function parseAnswer(raw) {
    const text = String(raw || "").trim();
    if (!/^-?(?:\d+(?:\.\d+)?|\d+\/\d+)$/.test(text)) return null;
    if (text.includes("/") && Number(text.split("/")[1]) === 0) return null;
    try { return new FractionClass(text); } catch { return null; }
  }

  function isAnswerCorrect(raw, expected) {
    const text = String(raw || "").trim();
    const answer = parseAnswer(text);
    if (!answer || !answer.equals(expected)) return false;
    if (!text.includes("/")) return true;
    const [numeratorText, denominatorText] = text.split("/");
    let a = Math.abs(Number(numeratorText)), b = Number(denominatorText);
    const denominator = b;
    while (b) [a, b] = [b, a % b];
    return denominator > 1 && a === 1;
  }

  function applyResult(progress, isCorrect) {
    const next = { ...progress, total:Number(progress.total)||0, correct:Number(progress.correct)||0, streak:Number(progress.streak)||0, xp:Number(progress.xp)||0 };
    next.total += 1;
    if (isCorrect) { next.correct += 1; next.streak += 1; next.xp += 15; }
    else { next.streak = 0; next.xp = Math.max(0, next.xp - 10); }
    let leveledUp = false, completed = false;
    const target = getLevelXp(next.level);
    if (next.xp >= target) {
      if (next.level < 4) { next.xp -= target; next.level += 1; leveledUp = true; }
      else { next.xp = target; completed = true; }
    }
    return { progress:next, leveledUp, completed };
  }

  return { LEVEL_XP, getLevelXp, generateQuestion, parseAnswer, isAnswerCorrect, fractionTex, applyResult };
});
