import glob

replacements = {
    # Reds to Lime Greens
    '#dc2626': '#ccff00',
    '#ef4444': '#d4ff2a',
    '#b91c1c': '#99cc00',
    '#991b1b': '#7a9900',
    '#7f1d1d': '#5c7300',
    '#fecaca': '#f5ffcc',
    '#fca5a5': '#ebff99',
    '#f87171': '#e0ff66',
    
    # Dark Purples to Dark Greens/Blacks
    '#0b050d': '#060a03',
    '#13081a': '#0c1406',
    '#150518': '#0e1708',
    '#210b24': '#16240d',
    '#2d0b28': '#1e3012',
    '#3b0f34': '#273b18',
    '#4f1444': '#354d23',
    '#250918': '#19260e',
    '#1a040b': '#0d1406',
}

files = glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.tsx', recursive=True)
files += glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.ts', recursive=True)
files.append('c:/Users/ADMIN/Desktop/nigiri/src/app/globals.css')

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    if 'globals.css' in file.replace('\\', '/'):
        new_content = new_content.replace('220, 38, 38', '204, 255, 0')
        new_content = new_content.replace('147, 51, 234', '153, 204, 0')
        new_content = new_content.replace('185, 28, 28', '122, 153, 0')
        new_content = new_content.replace('239, 68, 68', '212, 255, 42')
        new_content = new_content.replace('Dark Fantasy Game', 'Neon Lime')
        
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
