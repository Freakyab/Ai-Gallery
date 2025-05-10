const isDevelopment = process.env.NEXT_PUBLIC_DEVELOPMENT === 'true' ;
export const backendUrl = isDevelopment ? 'http://localhost:8000' : 'https://ai-gallery-backend.vercel.app';