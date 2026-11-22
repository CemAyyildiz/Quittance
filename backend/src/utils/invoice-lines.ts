export interface InvoiceLineInput {
  label: string;
  quantity: number;
  unitPrice: number;
}

const SCALE = 10_000_000;

function decimalToScaled(value: number): bigint {
  const text = String(value).trim();
  if (text.includes("e")) {
    const [coefficient, exponentText] = text.toLowerCase().split("e");
    const exponent = Number(exponentText);
    const [whole = "0", fraction = ""] = coefficient.split(".");
    const digits = (whole + fraction).replace(/^0+/, "") || "0";
    const decimalPlaces = fraction.length - exponent;
    if (decimalPlaces <= 0) {
      return (
        BigInt(digits) * BigInt(SCALE) * BigInt(10) ** BigInt(-decimalPlaces)
      );
    }
    const scaleDigits =
      decimalPlaces > 7
        ? digits.slice(0, digits.length - (decimalPlaces - 7))
        : digits.padEnd(digits.length + 7 - decimalPlaces, "0");
    return BigInt(scaleDigits || "0");
  }
  const [whole = "0", fraction = ""] = text.split(".");
  const padded = (fraction + "0000000").slice(0, 7);
  return BigInt(whole || "0") * BigInt(SCALE) + BigInt(padded);
}

function formatScaled(value: bigint): string {
  const whole = value / BigInt(SCALE);
  const fraction = (value % BigInt(SCALE)).toString().padStart(7, "0");
  return `${whole}.${fraction}`;
}

export function lineTotal(line: InvoiceLineInput): string {
  const total =
    (decimalToScaled(line.quantity) * decimalToScaled(line.unitPrice)) /
    BigInt(SCALE);
  return formatScaled(total);
}

export function linesTotal(lines: InvoiceLineInput[]): string {
  const total = lines.reduce(
    (sum, line) =>
      sum +
      (decimalToScaled(line.quantity) * decimalToScaled(line.unitPrice)) /
        BigInt(SCALE),
    0n,
  );
  return formatScaled(total);
}
