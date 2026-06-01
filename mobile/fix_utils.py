import re, os

os.chdir('src/screens')
files = [f for f in os.listdir('.') if f.endswith('.tsx')]

for f in files:
    with open(f) as fp:
        content = fp.read()
    orig = content

    # Remove multi-line fmtTime (full relative time: 刚刚/分钟前/小时前/天前)
    content = re.sub(
        r'function fmtTime\(ts: string\) \{\s*'
        r"if \(!ts\) return '';\s*"
        r'const d = new Date\(ts\);\s*'
        r'const now = new Date\(\);\s*'
        r'const diff = Math\.floor\(\(now\.getTime\(\) - d\.getTime\(\)\) / 1000\);\s*'
        r"if \(diff < 60\) return '[^']*';\s*"
        r'if \(diff < 3600\) return `\$\{Math\.floor\(diff / 60\)\}分钟前`;\s*'
        r'if \(diff < 86400\) return `\$\{Math\.floor\(diff / 3600\)\}小时前`;\s*'
        r'if \(diff < 604800\) return `\$\{Math\.floor\(diff / 86400\)\}天前`;\s*'
        r'return d\.toLocaleDateString\(\);\s*'
        r'\}',
        '', content, flags=re.DOTALL
    )
    # Short version (no 天前)
    content = re.sub(
        r'function fmtTime\(ts: string\) \{\s*'
        r"if \(!ts\) return '';\s*"
        r'const d = new Date\(ts\);\s*'
        r'const now = new Date\(\);\s*'
        r'const diff = Math\.floor\(\(now\.getTime\(\) - d\.getTime\(\)\) / 1000\);\s*'
        r"if \(diff < 60\) return '[^']*';\s*"
        r'if \(diff < 3600\) return `\$\{Math\.floor\(diff / 60\)\}分钟前`;\s*'
        r'return d\.toLocaleDateString\(\);\s*'
        r'\}',
        '', content, flags=re.DOTALL
    )

    if content != orig:
        with open(f, 'w') as fp:
            fp.write(content)
        print(f'Fixed: {f}')

print('Done')
