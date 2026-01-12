import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.error(
    "ERROR: Faltan TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN en el archivo .env"
  );
  process.exit(1);
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

export default client;
