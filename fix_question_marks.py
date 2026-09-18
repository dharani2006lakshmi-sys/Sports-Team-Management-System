import os

file_path = 'index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Using unicode escapes to prevent any text encoding corruption!
replacement = '        <input type="password" id="login-pass" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"/>\n'
lines[244] = replacement

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Fixed dots using unicode escapes!")
