import glob

files = glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.tsx', recursive=True)
files += glob.glob('c:/Users/ADMIN/Desktop/nigiri/src/**/*.ts', recursive=True)

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace('milo.world', 'milostocks.com')
    new_content = new_content.replace('milo_world', 'milostocks')
        
    if new_content != content:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {file}")
