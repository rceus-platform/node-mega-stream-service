import { Storage } from 'megajs';

const email = process.env.MEGA_EMAIL;
const password = process.env.MEGA_PASSWORD;

console.log("Logging in to", email);
const storage = new Storage({ email, password }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log("Logged in!");
    const keys = Object.keys(storage.files);
    console.log("Found", keys.length, "files");
    console.log("Sample keys:", keys.slice(0, 5));
    process.exit(0);
});
