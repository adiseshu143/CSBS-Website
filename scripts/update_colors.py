import re

# Read the file
with open('src/App.css', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace colors
content = content.replace('#F97316', '#EB4D28')
content = content.replace('#f97316', '#EB4D28')
content = content.replace('#ea580c', '#D8431F')
content = content.replace('#fb923c', '#D8431F')
content = content.replace('#FB923C', '#D8431F')
content = re.sub(r'rgba\(249, 115, 22', 'rgba(235, 77, 40', content)

# Write back
with open('src/App.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Color replacement complete!")
