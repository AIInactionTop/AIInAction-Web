export const MICROCREDITS_PER_CREDIT = BigInt(1_000_000);
export const TOKENS_PER_MILLION = BigInt(1_000_000);

function decimalToScaledInteger(value: number | string, scale: bigint): bigint {
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error("Value is required");
  }

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholePart, fractionPart = ""] = unsigned.split(".");

  if (!/^\d+$/.test(wholePart || "0") || (fractionPart && !/^\d+$/.test(fractionPart))) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const scaleDigits = scale.toString().length - 1;
  const paddedFraction = (fractionPart + "0".repeat(scaleDigits)).slice(0, scaleDigits);
  const scaled =
    BigInt(wholePart || "0") * scale + BigInt(paddedFraction || "0");

  return negative ? -scaled : scaled;
}

export function creditsToMicrocredits(value: number | string): bigint {
  return decimalToScaledInteger(value, MICROCREDITS_PER_CREDIT);
}

export function microcreditsToCreditsString(value: bigint): string {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const whole = absolute / MICROCREDITS_PER_CREDIT;
  const fraction = (absolute % MICROCREDITS_PER_CREDIT)
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");

  const formatted = fraction ? `${whole.toString()}.${fraction}` : whole.toString();
  return negative ? `-${formatted}` : formatted;
}

export function serializeCredits(value: bigint) {
  return {
    microcredits: value.toString(),
    credits: microcreditsToCreditsString(value),
  };
}

export function coerceBigInt(value: bigint | number | string | null | undefined): bigint {
  if (value === null || value === undefined) return BigInt(0);
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error("Numeric values must be finite and non-negative");
    }
    return BigInt(Math.trunc(value));
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  return BigInt(normalized);
}

export function divideAndRoundUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= BigInt(0)) {
    throw new Error("Denominator must be positive");
  }
  if (numerator <= BigInt(0)) return BigInt(0);
  return (numerator + denominator - BigInt(1)) / denominator;
}
