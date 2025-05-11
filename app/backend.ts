const isDevelopment = process.env.NEXT_PUBLIC_DEVELOPMENT === 'true';
const getVersion = process.env.NEXT_PUBLIC_VERSION || '0.0';
const versionBackendLink = "https://ai-gallery-backend-" + getVersion + ".vercel.app"
export const backendUrl = isDevelopment ? 'http://localhost:8000' :
    (getVersion !== "master" && getVersion !== "main") ?
        versionBackendLink : 'https://ai-gallery-backend.vercel.app';