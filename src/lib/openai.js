import { OpenAI } from 'openai';
 const client = new OpenAI({
  //  apiKey: process.env.GOOGLE_API_KEY,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,

   baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
   dangerouslyAllowBrowser: true
});
export { client as openai };