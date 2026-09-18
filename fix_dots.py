import os
import glob

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the corrupted bullet points with normal dots
    content = content.replace('â€¢', '•')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {file_path}")

for file in glob.glob('*.html'):
    fix_file(file)
