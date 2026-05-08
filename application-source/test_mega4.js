import { Storage } from 'megajs';

const email = process.env.MEGA_EMAIL;
const password = process.env.MEGA_PASSWORD;

console.log("Logging in to", email);
const storage = new Storage({ email, password, autoload: true }, (err) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log("Logged in!");
    const keys = Object.keys(storage.files);
    let folderWithChildren = keys.find(k => storage.files[k].children && storage.files[k].children.length > 0);
    if (folderWithChildren) {
        const children = storage.files[folderWithChildren].children;
        console.log("Children keys:", children.map(c => c.nodeId || c.id || "no_id"));
        console.log("Are they in storage.files?", children.map(c => c.nodeId ? !!storage.files[c.nodeId] : false));
    }
    process.exit(0);
});
