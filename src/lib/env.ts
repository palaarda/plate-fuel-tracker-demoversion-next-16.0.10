const MIN_JWT_SECRET_LENGTH = 32;
const INSECURE_SECRET_PATTERN = /^(changeme|secret|password|test|demo|\*+|x+)$/i;
export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConfigError";
    }
}
const readEnv = (name: string): string => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new ConfigError(`${name} ortam değişkeni tanımlı değil.`);
    }
    return value;
};
export const getJwtSecret = (): string => {
    const secret = readEnv("JWT_SECRET");
    if (secret.length < MIN_JWT_SECRET_LENGTH || INSECURE_SECRET_PATTERN.test(secret)) {
        throw new ConfigError(`JWT_SECRET en az ${MIN_JWT_SECRET_LENGTH} karakterlik rastgele bir değer olmalıdır.`);
    }
    return secret;
};
export const getMongoUri = (): string => readEnv("MONGODB_URI");
export const getMongoDbName = (): string => process.env.MONGODB_DB?.trim() || "hmf2";
export const isProduction = process.env.NODE_ENV === "production";
