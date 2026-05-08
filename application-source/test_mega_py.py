from mega import Mega
import os

m = Mega()
email = os.environ.get("MEGA_EMAIL")
password = os.environ.get("MEGA_PASSWORD")
print("Logging in...")
m.login(email, password)
print("Logged in. Getting files...")
files = m.get_files()
print(f"Found {len(files)} files")
