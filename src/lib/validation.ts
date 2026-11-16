export type ValidationResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    message: string;
};
export const VEHICLE_LIMITS = {
    plateMinLength: 2,
    plateMaxLength: 15,
    makeModelMaxLength: 100,
    driverNameMinLength: 2,
    driverNameMaxLength: 80,
    odometerMax: 5000000,
} as const;
export const FUEL_LIMITS = {
    litersMin: 0.01,
    litersMax: 2000,
    amountMin: 0.01,
    amountMax: 1000000,
} as const;
export const CREDENTIAL_LIMITS = {
    usernameMaxLength: 64,
    passwordMaxBytes: 72,
} as const;
const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length;
const ok = <T>(value: T): ValidationResult<T> => ({ ok: true, value });
const fail = <T = never>(message: string): ValidationResult<T> => ({ ok: false, message });
const hasControlChars = (value: string) => Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
});
const PLATE_PATTERN = /^[A-Z0-9ÇĞİÖŞÜ]+(?:[ -][A-Z0-9ÇĞİÖŞÜ]+)*$/u;
const MAKE_MODEL_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,'&()/+-]*$/u;
const DRIVER_NAME_PATTERN = /^\p{L}[\p{L}\p{M} .'-]*$/u;
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
export const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const collapseWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");
const toText = (value: unknown): string | null => {
    if (typeof value === "string")
        return value;
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return null;
};
export const isObjectIdString = (value: string) => OBJECT_ID_PATTERN.test(value);
export const normalizePlate = (value: string) => collapseWhitespace(value).toUpperCase();
export const validatePlate = (value: unknown): ValidationResult<string> => {
    const text = toText(value);
    if (text === null)
        return fail("Plaka zorunludur.");
    const plate = normalizePlate(text);
    if (plate.length < VEHICLE_LIMITS.plateMinLength ||
        plate.length > VEHICLE_LIMITS.plateMaxLength) {
        return fail(`Plaka ${VEHICLE_LIMITS.plateMinLength}-${VEHICLE_LIMITS.plateMaxLength} karakter olmalıdır.`);
    }
    if (!PLATE_PATTERN.test(plate)) {
        return fail("Plaka yalnızca harf, rakam, boşluk ve tire içerebilir.");
    }
    return ok(plate);
};
const validateText = (value: unknown, { label, min, max, pattern }: {
    label: string;
    min: number;
    max: number;
    pattern: RegExp;
}): ValidationResult<string> => {
    const text = toText(value);
    if (text === null || hasControlChars(text))
        return fail(`${label} geçersiz.`);
    const normalized = collapseWhitespace(text);
    if (normalized.length < min)
        return fail(`${label} zorunludur.`);
    if (normalized.length > max)
        return fail(`${label} en fazla ${max} karakter olabilir.`);
    if (!pattern.test(normalized))
        return fail(`${label} geçersiz karakter içeriyor.`);
    return ok(normalized);
};
export const validateMakeModel = (value: unknown) => validateText(value, {
    label: "Marka / model",
    min: 1,
    max: VEHICLE_LIMITS.makeModelMaxLength,
    pattern: MAKE_MODEL_PATTERN,
});
export const validateDriverName = (value: unknown) => validateText(value, {
    label: "Sürücü adı",
    min: VEHICLE_LIMITS.driverNameMinLength,
    max: VEHICLE_LIMITS.driverNameMaxLength,
    pattern: DRIVER_NAME_PATTERN,
});
const toNumber = (value: unknown): number | null => {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!/^\d+(\.\d+)?$/.test(trimmed))
            return null;
        return Number(trimmed);
    }
    return null;
};
export const validateOdometer = (value: unknown): ValidationResult<number> => {
    const n = typeof value === "string"
        ? /^\d+$/.test(value.trim())
            ? Number(value.trim())
            : null
        : toNumber(value);
    if (n === null || !Number.isInteger(n)) {
        return fail("Kilometre tam sayı olmalıdır.");
    }
    if (n < 0 || n > VEHICLE_LIMITS.odometerMax) {
        return fail(`Kilometre 0 ile ${VEHICLE_LIMITS.odometerMax.toLocaleString("tr-TR")} arasında olmalıdır.`);
    }
    return ok(n);
};
const validatePositiveAmount = (value: unknown, { label, min, max, decimals }: {
    label: string;
    min: number;
    max: number;
    decimals: number;
}): ValidationResult<number> => {
    const n = toNumber(value);
    if (n === null)
        return fail(`${label} geçerli bir sayı olmalıdır.`);
    if (n < min || n > max) {
        return fail(`${label} ${min.toLocaleString("tr-TR")} ile ${max.toLocaleString("tr-TR")} arasında olmalıdır.`);
    }
    const factor = 10 ** decimals;
    return ok(Math.round(n * factor) / factor);
};
export type VehicleInput = {
    plate: string;
    makeModel: string;
    odometer: number;
    driverName: string;
};
export const validateVehicleInput = (input: {
    plate: unknown;
    makeModel: unknown;
    odometer: unknown;
    driverName: unknown;
}): ValidationResult<VehicleInput> => {
    const plate = validatePlate(input.plate);
    if (!plate.ok)
        return plate;
    const makeModel = validateMakeModel(input.makeModel);
    if (!makeModel.ok)
        return makeModel;
    const odometer = validateOdometer(input.odometer);
    if (!odometer.ok)
        return odometer;
    const driverName = validateDriverName(input.driverName);
    if (!driverName.ok)
        return driverName;
    return ok({
        plate: plate.value,
        makeModel: makeModel.value,
        odometer: odometer.value,
        driverName: driverName.value,
    });
};
export type FuelInput = {
    liters: number;
    amount: number;
};
export const validateFuelInput = (body: unknown): ValidationResult<FuelInput> => {
    if (!isPlainObject(body))
        return fail("Geçersiz istek gövdesi.");
    if (body.liters === undefined || body.amount === undefined) {
        return fail("Litre ve tutar zorunludur.");
    }
    const liters = validatePositiveAmount(body.liters, {
        label: "Litre",
        min: FUEL_LIMITS.litersMin,
        max: FUEL_LIMITS.litersMax,
        decimals: 2,
    });
    if (!liters.ok)
        return liters;
    const amount = validatePositiveAmount(body.amount, {
        label: "Tutar",
        min: FUEL_LIMITS.amountMin,
        max: FUEL_LIMITS.amountMax,
        decimals: 2,
    });
    if (!amount.ok)
        return amount;
    return ok({ liters: liters.value, amount: amount.value });
};
export type Credentials = {
    username: string;
    password: string;
};
export const validateCredentials = (body: unknown): ValidationResult<Credentials> => {
    if (!isPlainObject(body))
        return fail("Kullanıcı adı ve şifre gereklidir.");
    const { username, password } = body;
    if (typeof username !== "string" || typeof password !== "string") {
        return fail("Kullanıcı adı ve şifre gereklidir.");
    }
    const trimmed = username.trim();
    if (!trimmed || !password)
        return fail("Kullanıcı adı ve şifre gereklidir.");
    if (trimmed.length > CREDENTIAL_LIMITS.usernameMaxLength ||
        utf8ByteLength(password) > CREDENTIAL_LIMITS.passwordMaxBytes) {
        return fail("Kullanıcı adı veya şifre hatalı.");
    }
    return ok({ username: trimmed, password });
};
