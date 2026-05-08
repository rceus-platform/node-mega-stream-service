import { Storage } from "megajs";
import dotenv from "dotenv";
dotenv.config();

const email = process.env.TEST_EMAIL || "rhishi.hidden.002@gmail.com";
const password = process.env.TEST_PASSWORD || "RhishiHidden002#6556X";

console.log("Logging into Mega as", email);
const storage = new Storage({ email, password }, (err) => {
    if (err) {
        console.error("Login failed:", err);
        process.exit(1);
    }
    console.log("Login successful!");
    
    // Print a few file IDs
    const fileIds = Object.keys(storage.files);
    console.log("Total files found:", fileIds.length);
    console.log("Sample file IDs:", fileIds.slice(0, 10));
    
    const targetId = "H8pUVTzC";
    console.log(`Is target ID ${targetId} in storage?`, !!storage.files[targetId]);
    
    process.exit(0);
});
