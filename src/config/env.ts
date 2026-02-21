export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
  aws: {
    region: process.env.AWS_REGION || "ap-south-1",
    s3Bucket: process.env.AWS_S3_BUCKET_NAME || "fedhub-demo-s3",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    s3BasePath: process.env.AWS_S3_BASE_PATH || "Pharma+DMS", // Base path prefix in bucket
  },
  /** ConvertAPI: doc→PDF, HTML→docx. Get secret at https://www.convertapi.com */
  convertApi: {
    secret: process.env.CONVERT_API_SECRET || "",
    baseUrl: process.env.CONVERT_API_BASE_URL || "https://v2.convertapi.com",
  },
  /** Google Gemini: PDF/content → HTML. Models with free-tier quota: gemini-2.5-flash, gemini-1.5-flash-latest. gemini-2.0-flash often has limit 0 on free tier. */
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
};

