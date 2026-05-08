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
    console.log("Found", keys.length, "files");
    let folderWithChildren = keys.find(k => storage.files[k].children && storage.files[k].children.length > 0);
    if (folderWithChildren) {
        console.log("Children in", storage.files[folderWithChildren].name, ":", storage.files[folderWithChildren].children.map(c => c.name));
    }
    process.exit(0);
});
