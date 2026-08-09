import glob

replacements = {
    '#9d8ec4': '#ebff99',
    '#120924': '#0c1406',
    '#0c0718': '#0a1204',
    '#20113c': '#16240d',
    '#0d071b': '#091104',
    '#00c6ff': '#ccff00',
    '#00f0ff': '#d4ff2a',
    '#ff2a6d': '#ea580c',
    '#f72585': '#f59e0b',
    '#a855f7': '#7a9900',
    '#e2d9f3': '#f5ffcc',
}

files = glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.tsx', recursive=True)
files += glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.ts', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        new_content = new_content.replace(old.upper(), new)
        
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
